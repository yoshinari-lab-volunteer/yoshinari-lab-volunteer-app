'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_EXPIRES_IN_MS } from '@/lib/firebase/session';

/**
 * クライアントで signInWithEmailAndPassword / createUserWithEmailAndPassword に
 * 成功した直後に呼び出し、idToken を SSR で検証可能な Cookie に交換する。
 */
export async function establishSession(idToken: string): Promise<void> {
  const sessionCookie = await createSessionCookie(idToken);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRES_IN_MS / 1000,
    path: '/',
  });
}

const newProfileSchema = z.object({
  fullName: z.string().trim().min(1, '氏名を入力してください').max(100),
  phone: z
    .string()
    .trim()
    .min(1, '電話番号を入力してください')
    .regex(/^[0-9-]+$/, '電話番号はハイフンを含む数字で入力してください'),
});

/**
 * 新規登録直後に呼び出し、Firestore の users/{uid} プロフィールを作成してからセッションを確立する。
 * idToken をサーバー側で検証してから uid を取り出すことで、クライアントから
 * 任意の uid を渡されて他人のプロフィールを作成される事態を防いでいる。
 */
export async function createUserProfile(
  idToken: string,
  input: { fullName: string; phone: string },
): Promise<void> {
  const decoded = await adminAuth().verifyIdToken(idToken);
  const { fullName, phone } = newProfileSchema.parse(input);

  await adminDb()
    .collection('users')
    .doc(decoded.uid)
    .set({
      email: decoded.email ?? '',
      fullName,
      phone,
      role: 'user',
      points: 0,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  await establishSession(idToken);
}

export async function signOutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  revalidatePath('/', 'layout');
  redirect('/login');
}
