import 'server-only';
import { randomBytes } from 'node:crypto';
import type { LineConfig } from '@/lib/line/config';

const AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';

/** 認証画面へ送り出す前に Cookie へ保存し、コールバックで突き合わせる値 */
export type LineOAuthState = {
  kind: 'line_oauth';
  state: string;
  nonce: string;
  /** login: ログイン／新規登録、link: ログイン中の会員へのLINE連携 */
  mode: 'login' | 'link';
  redirectTo: string;
};

export function randomToken(bytes = 16): string {
  return randomBytes(bytes).toString('base64url');
}

/** ログイン後の戻り先は、サイト内パスのみ許可する（オープンリダイレクト対策） */
export function sanitizeRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/mypage';
  }
  return value;
}

export function buildAuthorizeUrl(
  config: LineConfig,
  { state, nonce }: { state: string; nonce: string },
): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.channelId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', 'profile openid');
  url.searchParams.set('nonce', nonce);
  if (config.botPrompt) url.searchParams.set('bot_prompt', config.botPrompt);
  return url.toString();
}

export type LineIdentity = {
  /** LINEのユーザーID（プロバイダ内で一意） */
  sub: string;
  displayName: string;
};

async function postForm(url: string, params: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
    cache: 'no-store',
  });
  if (!res.ok) {
    // レスポンス本文にはエラー理由のみが入り、秘密情報は含まれない
    throw new Error(`LINE API ${new URL(url).pathname} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * 認可コードを LINE のIDトークンに交換し、署名・有効期限・nonce の検証まで LINE 側で行わせて
 * 本人確認済みのユーザー情報を返す（検証APIを使うことで、自前でJWT検証ライブラリを持たずに済む）。
 */
export async function fetchLineIdentity(
  config: LineConfig,
  { code, nonce }: { code: string; nonce: string },
): Promise<LineIdentity> {
  const token = await postForm(TOKEN_URL, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.channelId,
    client_secret: config.channelSecret,
  });
  const idToken = token.id_token;
  if (typeof idToken !== 'string' || !idToken) throw new Error('LINE did not return id_token');

  const claims = await postForm(VERIFY_URL, {
    id_token: idToken,
    client_id: config.channelId,
    nonce,
  });
  if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('LINE id_token has no sub');
  if (typeof claims.nonce === 'string' && claims.nonce !== nonce) {
    throw new Error('LINE id_token nonce mismatch');
  }

  return {
    sub: claims.sub,
    displayName: typeof claims.name === 'string' ? claims.name : '',
  };
}
