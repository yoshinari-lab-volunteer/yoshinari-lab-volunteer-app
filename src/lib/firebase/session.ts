import 'server-only';
import { adminAuth } from '@/lib/firebase/admin';

export const SESSION_COOKIE_NAME = 'session';
/** 14日。ミリ秒 */
export const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 14 * 1000;

/** セッションCookieの共通属性（メール/パスワード・LINE どちらのログインでも同じ） */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_EXPIRES_IN_MS / 1000,
  path: '/',
};

/**
 * LINEログインで発行したカスタムトークンに付けるクレーム。
 * LINEアカウントにはメール確認の概念がなく、LINEでの本人確認をもって
 * 「メール確認済み」と同等に扱うための目印として、セッション検証側で参照する。
 */
export const LINE_LOGIN_CLAIM = 'lineLogin';

/** クライアントで取得した idToken を、SSR で検証可能な Cookie 用トークンに交換する */
export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN_MS });
}

/**
 * ブラウザのFirebase SDKを経由せず、サーバーだけで指定ユーザーのセッションCookie値を作る。
 * カスタムトークンを Identity Toolkit の REST API で idToken に交換し、
 * それをセッションCookieにしている（LINEログイン用）。
 */
export async function createSessionCookieForUid(uid: string): Promise<string> {
  const customToken = await adminAuth().createCustomToken(uid, { [LINE_LOGIN_CLAIM]: true });

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    throw new Error(`signInWithCustomToken failed: ${res.status} ${await res.text()}`);
  }
  const { idToken } = (await res.json()) as { idToken?: string };
  if (!idToken) throw new Error('signInWithCustomToken returned no idToken');

  return createSessionCookie(idToken);
}

/**
 * セッション Cookie を検証する。
 * checkRevoked: true にしているため、admin_set_user_active 相当の処理で
 * revokeRefreshTokens() を呼んでおけば、退会・無効化したユーザーのセッションは
 * 有効期限内でも次のアクセスで失効させられる。
 */
export async function verifySessionCookie(cookie: string) {
  try {
    return await adminAuth().verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}
