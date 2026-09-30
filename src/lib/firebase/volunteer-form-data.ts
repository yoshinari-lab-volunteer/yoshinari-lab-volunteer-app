import 'server-only';
import { z } from 'zod';
import { uploadVolunteerImage, deleteVolunteerImage } from '@/lib/cloudinary';

export const MAX_IMAGES = 5;

/** 獲得ポイントを除く、管理者・団体担当者どちらの編集フォームにも共通する項目 */
const commonFields = {
  title: z.string().trim().min(1, 'タイトルを入力してください').max(200),
  description: z.string().trim().max(4000).default(''),
  category: z.string().trim().min(1, '分野を選択してください'),
  area: z.string().trim().min(1, '地域を選択してください'),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '開催日を選択してください'),
  startTime: z.string().trim().max(5).nullable(),
  endTime: z.string().trim().max(5).nullable(),
  location: z.string().trim().max(200).default(''),
  maxCapacity: z.coerce.number().int().min(1, '定員は1以上で入力してください'),
  deadline: z.string().min(1, '募集期限を入力してください'),
  beginnerFriendly: z.boolean(),
  status: z.enum(['draft', 'published', 'closed']),
  orgName: z.string().trim().max(200).default(''),
  orgDescription: z.string().trim().max(2000).default(''),
};

const volunteerSchema = z.object({
  ...commonFields,
  points: z.coerce.number().int().min(0, 'ポイントは0以上で入力してください'),
});

/** 団体担当者向け: 獲得ポイントを含まない項目のみ検証する（ポイント経済は管理者専用のため） */
const orgVolunteerSchema = z.object(commonFields);

function readCommonFields(formData: FormData) {
  const emptyToNull = (v: FormDataEntryValue | null) => (v && String(v).trim() ? String(v) : null);

  return {
    title: formData.get('title'),
    description: formData.get('description') ?? '',
    category: formData.get('category'),
    area: formData.get('area'),
    eventDate: formData.get('eventDate'),
    startTime: emptyToNull(formData.get('startTime')),
    endTime: emptyToNull(formData.get('endTime')),
    location: formData.get('location') ?? '',
    maxCapacity: formData.get('maxCapacity'),
    deadline: formData.get('deadline'),
    beginnerFriendly: formData.get('beginnerFriendly') === 'on',
    status: formData.get('status'),
    orgName: formData.get('orgName') ?? '',
    orgDescription: formData.get('orgDescription') ?? '',
  };
}

export function parseVolunteerFormData(formData: FormData) {
  const parsed = volunteerSchema.safeParse({
    ...readCommonFields(formData),
    points: formData.get('points'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? '入力内容を確認してください');
  }
  return parsed.data;
}

export function parseOrgVolunteerFormData(formData: FormData) {
  const parsed = orgVolunteerSchema.safeParse(readCommonFields(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? '入力内容を確認してください');
  }
  return parsed.data;
}

/**
 * フォームから送られてくる
 *   - keptImageUrls: 残す既存画像のURL（複数）
 *   - removedImageUrls: 削除する既存画像のURL（複数） ※実際にCloudinaryからも削除する
 *   - newImages: 新しくアップロードするファイル（複数）
 * を元に、保存すべき orgImageUrls を確定する。
 */
export async function resolveImages(formData: FormData): Promise<string[]> {
  const keptUrls = formData.getAll('keptImageUrls').map(String);
  const removedUrls = formData.getAll('removedImageUrls').map(String);
  const newFiles = formData.getAll('newImages').filter(
    (f): f is File => f instanceof File && f.size > 0,
  );

  if (keptUrls.length + newFiles.length > MAX_IMAGES) {
    throw new Error(`画像は最大${MAX_IMAGES}枚までです`);
  }

  const uploadedUrls = await Promise.all(newFiles.map((file) => uploadVolunteerImage(file)));
  await Promise.all(removedUrls.map((url) => deleteVolunteerImage(url)));

  return [...keptUrls, ...uploadedUrls];
}
