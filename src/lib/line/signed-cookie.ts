import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

function sign(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

/** 改ざん検知（HMAC）と有効期限つきの Cookie 値を作る */
export function signCookieValue(secret: string, payload: object, ttlSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  return `${body}.${sign(secret, body)}`;
}

/** 署名と有効期限を検証して中身を返す。不正・期限切れ・未設定なら null */
export function readCookieValue<T extends object>(
  secret: string,
  value: string | undefined,
): T | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  const expected = Buffer.from(sign(secret, body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T & {
      exp?: number;
    };
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now() / 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}
