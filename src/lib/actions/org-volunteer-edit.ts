'use server';

import { revalidatePath } from 'next/cache';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { parseOrgVolunteerFormData, resolveImages } from '@/lib/firebase/volunteer-form-data';
import { parseJstDatetimeLocal } from '@/lib/utils';

type ActionResult = { error?: string };

async function resolveVolunteerIdFromToken(token: string): Promise<string | null> {
  const snap = await adminDb()
    .collection('volunteerEditLinks')
    .where('token', '==', token)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}

/**
 * 編集リンクのトークンを使った、ログイン不要の団体向け案件更新。
 * 獲得ポイント（ポイント経済に直結するため）は対象外で、管理者のみが変更できる。
 */
export async function updateVolunteerByEditToken(
  token: string,
  formData: FormData,
): Promise<ActionResult> {
  const volunteerId = await resolveVolunteerIdFromToken(token);
  if (!volunteerId) return { error: 'この編集リンクは無効です。発行元の管理者にお問い合わせください。' };

  let data;
  try {
    data = parseOrgVolunteerFormData(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : '入力内容を確認してください' };
  }

  const ref = adminDb().collection('volunteers').doc(volunteerId);
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

  revalidatePath(`/edit/${token}`);
  revalidatePath(`/volunteers/${volunteerId}`);
  revalidatePath('/volunteers');
  return {};
}
