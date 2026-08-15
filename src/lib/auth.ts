import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import { SESSION_COOKIE_NAME, verifySessionCookie } from '@/lib/firebase/session';
import { mapUserProfile } from '@/lib/firebase/converters';
import type { UserProfile } from '@/types/firestore';

export type Session = { profile: UserProfile; emailVerified: boolean };

/**
 * cache() で同一リクエスト内の重複読み取りを防いでいる。
 * requireProfile/requireAdmin はページ・レイアウトの両方から呼ばれることが多く、
 * 包んでいないとセッションCookieの検証と users ドキュメントの読み取りが
 * リクエストごとに複数回走ってしまう。
 */
const getCurrentSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const sessionCookie = store.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const decoded = await verifySessionCookie(sessionCookie);
  if (!decoded) return null;

  const snap = await adminDb().collection('users').doc(decoded.uid).get();
  if (!snap.exists) return null;

  return { profile: mapUserProfile(snap), emailVerified: Boolean(decoded.email_verified) };
});

/** ログインしていなければ null */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const session = await getCurrentSession();
  return session?.profile ?? null;
}

/**
 * ログイン必須。メール確認は問わない（/verify-email ページ自身から使う）。
 * 通常のページは requireProfile() を使うこと。
 */
export async function requireSession(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  if (!session.profile.isActive) redirect('/login?error=deactivated');
  return session;
}

/** ログイン必須ページで使う。メール未確認の場合は確認案内ページへ振り分ける */
export async function requireProfile(): Promise<UserProfile> {
  const session = await requireSession();
  if (!session.emailVerified) redirect('/verify-email');
  return session.profile;
}

/** 管理者専用ページで使う */
export async function requireAdmin(): Promise<UserProfile> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') redirect('/');
  return profile;
}
