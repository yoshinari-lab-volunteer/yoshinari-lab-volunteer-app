'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireProfile } from '@/lib/auth';

type ActionResult = { error?: string };

const profileSchema = z.object({
  fullName: z.string().trim().min(1, '氏名を入力してください').max(100),
  phone: z
    .string()
    .trim()
    .min(1, '電話番号を入力してください')
    .regex(/^[0-9-]+$/, '電話番号はハイフンを含む数字で入力してください'),
});

/** マイページの「本名・電話番号」変更フォーム */
export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();

  const parsed = profileSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '入力内容を確認してください' };
  }

  await adminDb()
    .collection('users')
    .doc(profile.id)
    .update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() });

  revalidatePath('/mypage');
  return {};
}
