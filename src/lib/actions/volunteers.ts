'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth';
import { uploadVolunteerImage, deleteVolunteerImage } from '@/lib/cloudinary';
import { parseJstDatetimeLocal } from '@/lib/utils';
import type { VolunteerStatus } from '@/types/firestore';

type ActionResult = { error?: string };

const volunteerSchema = z.object({
  title: z.string().trim().min(1, 'タイトルを入力してください').max(200),
  description: z.string().trim().max(4000).default(''),
  category: z.string().trim().min(1, '分野を選択してください'),
  area: z.string().trim().min(1, '地域を選択してください'),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '開催日を選択してください'),
  startTime: z.string().trim().max(5).nullable(),
  endTime: z.string().trim().max(5).nullable(),
  location: z.string().trim().max(200).default(''),
  points: z.coerce.number().int().min(0, 'ポイントは0以上で入力してください'),
  maxCapacity: z.coerce.number().int().min(1, '定員は1以上で入力してください'),
  deadline: z.string().min(1, '募集期限を入力してください'),
  beginnerFriendly: z.boolean(),
  status: z.enum(['draft', 'published', 'closed']),
  orgName: z.string().trim().max(200).default(''),
  orgDescription: z.string().trim().max(2000).default(''),
});

function parseVolunteerFormData(formData: FormData) {
  const emptyToNull = (v: FormDataEntryValue | null) => (v && String(v).trim() ? String(v) : null);

  const parsed = volunteerSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') ?? '',
    category: formData.get('category'),
    area: formData.get('area'),
    eventDate: formData.get('eventDate'),
    startTime: emptyToNull(formData.get('startTime')),
    endTime: emptyToNull(formData.get('endTime')),
    location: formData.get('location') ?? '',
    points: formData.get('points'),
    maxCapacity: formData.get('maxCapacity'),
    deadline: formData.get('deadline'),
    beginnerFriendly: formData.get('beginnerFriendly') === 'on',
    status: formData.get('status'),
    orgName: formData.get('orgName') ?? '',
    orgDescription: formData.get('orgDescription') ?? '',
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? '入力内容を確認してください');
  }
  return parsed.data;
}

const MAX_IMAGES = 5;

/**
 * フォームから送られてくる
 *   - keptImageUrls: 残す既存画像のURL（複数）
 *   - removedImageUrls: 削除する既存画像のURL（複数） ※実際にCloudinaryからも削除する
 *   - newImages: 新しくアップロードするファイル（複数）
 * を元に、保存すべき orgImageUrls を確定する。
 */
async function resolveImages(formData: FormData): Promise<string[]> {
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

export async function createVolunteer(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();

  let data;
  try {
    data = parseVolunteerFormData(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : '入力内容を確認してください' };
  }

  let orgImageUrls: string[];
  try {
    orgImageUrls = await resolveImages(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : '画像のアップロードに失敗しました' };
  }

  const ref = adminDb().collection('volunteers').doc();
  await ref.set({
    ...data,
    deadline: Timestamp.fromDate(parseJstDatetimeLocal(data.deadline)),
    currentApplicants: 0,
    orgImageUrls,
    createdBy: admin.id,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  revalidatePath('/admin/volunteers');
  revalidatePath('/volunteers');
  redirect('/admin/volunteers');
}

export async function updateVolunteer(id: string, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  let data;
  try {
    data = parseVolunteerFormData(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : '入力内容を確認してください' };
  }

  const ref = adminDb().collection('volunteers').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { error: '案件が見つかりません' };

  // 既に応募がある案件の定員を、現在の応募数より少なく変更できてしまうと
  // 後続の承認処理で定員超過を招くため、ここで止める
  const currentApplicants: number = snap.data()!.currentApplicants ?? 0;
  if (data.maxCapacity < currentApplicants) {
    return { error: `定員は現在の応募数（${currentApplicants}名）未満にはできません` };
  }

  let orgImageUrls: string[];
  try {
    orgImageUrls = await resolveImages(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : '画像のアップロードに失敗しました' };
  }

  await ref.update({
    ...data,
    deadline: Timestamp.fromDate(parseJstDatetimeLocal(data.deadline)),
    orgImageUrls,
    updatedAt: FieldValue.serverTimestamp(),
  });

  revalidatePath('/admin/volunteers');
  revalidatePath(`/admin/volunteers/${id}/edit`);
  revalidatePath(`/volunteers/${id}`);
  revalidatePath('/volunteers');
  redirect('/admin/volunteers');
}

/** 一覧からのワンクリック公開状態変更（≒ 論理削除としての非公開化） */
export async function setVolunteerStatus(id: string, status: VolunteerStatus): Promise<ActionResult> {
  await requireAdmin();

  await adminDb()
    .collection('volunteers')
    .doc(id)
    .update({ status, updatedAt: FieldValue.serverTimestamp() });

  revalidatePath('/admin/volunteers');
  revalidatePath(`/volunteers/${id}`);
  revalidatePath('/volunteers');
  return {};
}
