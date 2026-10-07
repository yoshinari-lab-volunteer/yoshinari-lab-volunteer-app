'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth';
import {
  parseVolunteerFormData,
  resolveImages,
  toDeadlineTimestamp,
  validateCapacityChange,
} from '@/lib/firebase/volunteer-form-data';
import type { VolunteerStatus } from '@/types/firestore';

type ActionResult = { error?: string };

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
    deadline: toDeadlineTimestamp(data.deadline),
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

  const capacityError = validateCapacityChange(data, snap.data()!.currentApplicants ?? 0);
  if (capacityError) return { error: capacityError };

  let orgImageUrls: string[];
  try {
    orgImageUrls = await resolveImages(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : '画像のアップロードに失敗しました' };
  }

  await ref.update({
    ...data,
    deadline: toDeadlineTimestamp(data.deadline),
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
