import 'server-only';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { uploadVolunteerImage, deleteVolunteerImage } from '@/lib/cloudinary';
import { parseJstDatetimeLocal } from '@/lib/utils';

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
  beginnerFriendly: z.boolean(),
  status: z.enum(['draft', 'published', 'closed']),
  orgName: z.string().trim().max(200).default(''),
  orgDescription: z.string().trim().max(2000).default(''),
};

/** 応募を受け付ける（募集案件の）場合のみ必須になる項目 */
const recruitingSchema = z.object({
  maxCapacity: z.coerce.number().int().min(1, '定員は1以上で入力してください'),
  deadline: z.string().min(1, '募集期限を入力してください'),
});

const pointsSchema = z.object({
  points: z.coerce.number().int().min(0, 'ポイントは0以上で入力してください'),
});

const commonSchema = z.object(commonFields);

function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? '入力内容を確認してください');
  }
  return parsed.data;
}

/**
 * 「活動紹介」（acceptsApplications=false）の場合、定員・募集期限は入力欄自体が出ないため
 * 検証せず、定員0・募集期限なしとして保存する。
 */
function parseRecruitingFields(formData: FormData) {
  const acceptsApplications = formData.get('listingType') !== 'introduction';
  if (!acceptsApplications) {
    return { acceptsApplications, maxCapacity: 0, deadline: null as string | null };
  }
  const recruiting = parseOrThrow(recruitingSchema, {
    maxCapacity: formData.get('maxCapacity'),
    deadline: formData.get('deadline'),
  });
  return { acceptsApplications, ...recruiting } as {
    acceptsApplications: boolean;
    maxCapacity: number;
    deadline: string | null;
  };
}

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
    beginnerFriendly: formData.get('beginnerFriendly') === 'on',
    status: formData.get('status'),
    orgName: formData.get('orgName') ?? '',
    orgDescription: formData.get('orgDescription') ?? '',
  };
}

export function parseVolunteerFormData(formData: FormData) {
  const common = parseOrThrow(commonSchema, readCommonFields(formData));
  const recruiting = parseRecruitingFields(formData);
  const { points } = recruiting.acceptsApplications
    ? parseOrThrow(pointsSchema, { points: formData.get('points') })
    : { points: 0 };
  return { ...common, ...recruiting, points };
}

/** 団体担当者向け: 獲得ポイントは含めない（ポイント経済は管理者専用のため） */
export function parseOrgVolunteerFormData(formData: FormData) {
  const common = parseOrThrow(commonSchema, readCommonFields(formData));
  return { ...common, ...parseRecruitingFields(formData) };
}

export function toDeadlineTimestamp(deadline: string | null): Timestamp | null {
  return deadline ? Timestamp.fromDate(parseJstDatetimeLocal(deadline)) : null;
}

/**
 * 既存案件の更新時に、定員・掲載形式の変更が既存の応募と矛盾しないか検証する。
 * 問題があればエラーメッセージを返す。
 */
export function validateCapacityChange(
  data: { acceptsApplications: boolean; maxCapacity: number },
  currentApplicants: number,
): string | null {
  // 応募者がいるまま活動紹介に切り替えると、応募者の承認・完了処理の扱いが曖昧になるため止める
  if (!data.acceptsApplications && currentApplicants > 0) {
    return `応募者（${currentApplicants}名）がいる案件は活動紹介に切り替えられません`;
  }
  // 現在の応募数より少ない定員にすると、後続の承認処理で定員超過を招くため止める
  if (data.acceptsApplications && data.maxCapacity < currentApplicants) {
    return `定員は現在の応募数（${currentApplicants}名）未満にはできません`;
  }
  return null;
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
