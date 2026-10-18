import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentProfile } from '@/lib/auth';
import { getLineConfig, LINE_OAUTH_COOKIE } from '@/lib/line/config';
import {
  buildAuthorizeUrl,
  randomToken,
  sanitizeRedirectPath,
  type LineOAuthState,
} from '@/lib/line/oauth';
import { signCookieValue } from '@/lib/line/signed-cookie';

const STATE_TTL_SECONDS = 10 * 60;

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.nextUrl));
}

/** LINEの認証画面へ移動する。CSRF対策の state と、IDトークンのリプレイ対策の nonce を発行して Cookie に保存する */
export async function GET(request: NextRequest) {
  const config = getLineConfig();
  if (!config) return redirectTo(request, '/login?error=line_unavailable');

  const mode = request.nextUrl.searchParams.get('mode') === 'link' ? 'link' : 'login';

  if (mode === 'link' && !(await getCurrentProfile())) {
    return redirectTo(request, '/login?redirectTo=/mypage');
  }

  const payload: LineOAuthState = {
    kind: 'line_oauth',
    state: randomToken(),
    nonce: randomToken(),
    mode,
    redirectTo: sanitizeRedirectPath(request.nextUrl.searchParams.get('redirectTo')),
  };

  const response = NextResponse.redirect(
    buildAuthorizeUrl(config, { state: payload.state, nonce: payload.nonce }),
  );
  response.cookies.set(
    LINE_OAUTH_COOKIE,
    signCookieValue(config.channelSecret, payload, STATE_TTL_SECONDS),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_TTL_SECONDS,
      path: '/api/auth/line',
    },
  );
  return response;
}
