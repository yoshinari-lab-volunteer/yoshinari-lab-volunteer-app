'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth';

type ActionResult = { error?: string };

function generateToken(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * 案件の編集リンクを発行する（ログイン不要で担当団体が募集要項を編集できるようになる）。
 * 既にリンクが発行済みの案件に対して呼ぶと、トークンが上書きされて再発行になる
 * （＝古いリンクを知っている人はアクセスできなくなる）。
 */
export async function issueVolunteerEditLink(
  volunteerId: string,
  email: string,
): Promise<ActionResult & { token?: string }> {
  const admin = await requireAdmin();
  const trimmedEmail = email.trim();
  if (!trimmedEmail) return { error: 'メールアドレスを入力してください' };

  const token = generateToken();
  await adminDb().collection('volunteerEditLinks').doc(volunteerId).set({
    token,
    email: trimmedEmail,
    createdBy: admin.id,
    createdAt: FieldValue.serverTimestamp(),
  });

  revalidatePath(`/admin/volunteers/${volunteerId}/edit`);
  return { token };
}

/** 案件の編集リンクを無効化する（リンクを知っていてもアクセスできなくなる） */
export async function revokeVolunteerEditLink(volunteerId: string): Promise<ActionResult> {
  await requireAdmin();
  await adminDb().collection('volunteerEditLinks').doc(volunteerId).delete();
  revalidatePath(`/admin/volunteers/${volunteerId}/edit`);
  return {};
}
