import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getCurrentProfile } from '@/lib/auth';
import {
  createSessionCookieForUid,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from '@/lib/firebase/session';
import { getLineConfig, LINE_OAUTH_COOKIE, LINE_SIGNUP_COOKIE } from '@/lib/line/config';
import { fetchLineIdentity, type LineOAuthState } from '@/lib/line/oauth';
import { findUidByLineUserId, linkLineAccount } from '@/lib/line/accounts';
import { readCookieValue, signCookieValue } from '@/lib/line/signed-cookie';
import type { PendingLineSignup } from '@/lib/line/pending';

const SIGNUP_TTL_SECONDS = 15 * 60;

/** 使い終わった state Cookie を消しつつ、指定パスへ移動する */
function finish(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.nextUrl));
  response.cookies.set(LINE_OAUTH_COOKIE, '', { path: '/api/auth/line', maxAge: 0 });
  return response;
}

/** LINE認証の結果を受け取り、ログイン・新規登録の続き・アカウント連携のいずれかに振り分ける */
export async function GET(request: NextRequest) {
  const config = getLineConfig();
  const saved = config
    ? readCookieValue<LineOAuthState>(config.channelSecret, request.cookies.get(LINE_OAUTH_COOKIE)?.value)
    : null;
  if (!config || saved?.kind !== 'line_oauth') return finish(request, '/login?error=line_failed');

  const failedPath = saved.mode === 'link' ? '/mypage?line=failed' : '/login?error=line_failed';
  const params = request.nextUrl.searchParams;

  // ユーザーがLINEの画面で「キャンセル」した場合など
  if (params.get('error')) {
    return finish(request, saved.mode === 'link' ? '/mypage?line=cancelled' : '/login?error=line_cancelled');
  }

  const code = params.get('code');
  if (!code || params.get('state') !== saved.state) return finish(request, failedPath);

  let identity;
  try {
    identity = await fetchLineIdentity(config, { code, nonce: saved.nonce });
  } catch (err) {
    console.error('[line] 認証情報の取得に失敗しました', err);
    return finish(request, failedPath);
  }

  if (saved.mode === 'link') {
    const profile = await getCurrentProfile();
    if (!profile) return finish(request, '/login?redirectTo=/mypage');
    try {
      const result = await linkLineAccount(profile.id, identity.sub);
      return finish(request, `/mypage?line=${result}`);
    } catch (err) {
      console.error('[line] アカウント連携に失敗しました', err);
      return finish(request, failedPath);
    }
  }

  try {
    const uid = await findUidByLineUserId(identity.sub);

    if (!uid) {
      // 初めてのLINEアカウント: 氏名・電話番号の入力ページへ（LINEで確認済みの情報は署名つきCookieで引き継ぐ）
      const pending: PendingLineSignup = {
        kind: 'line_signup',
        lineUserId: identity.sub,
        displayName: identity.displayName,
        redirectTo: saved.redirectTo,
      };
      const response = finish(request, '/signup/line');
      response.cookies.set(
        LINE_SIGNUP_COOKIE,
        signCookieValue(config.channelSecret, pending, SIGNUP_TTL_SECONDS),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: SIGNUP_TTL_SECONDS,
          path: '/',
        },
      );
      return response;
    }

    const userSnap = await adminDb().collection('users').doc(uid).get();
    if (!userSnap.exists) return finish(request, failedPath);
    if (userSnap.data()!.isActive === false) return finish(request, '/login?error=deactivated');

    const response = finish(request, saved.redirectTo);
    response.cookies.set(SESSION_COOKIE_NAME, await createSessionCookieForUid(uid), SESSION_COOKIE_OPTIONS);
    return response;
  } catch (err) {
    console.error('[line] ログイン処理に失敗しました', err);
    return finish(request, failedPath);
  }
}
