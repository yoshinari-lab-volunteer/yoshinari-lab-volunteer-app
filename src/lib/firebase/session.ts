import 'server-only';
import { adminAuth } from '@/lib/firebase/admin';

export const SESSION_COOKIE_NAME = 'session';
/** 14日。ミリ秒 */
export const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 14 * 1000;

/** クライアントで取得した idToken を、SSR で検証可能な Cookie 用トークンに交換する */
export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN_MS });
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
