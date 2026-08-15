import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/mypage', '/admin'];
const SESSION_COOKIE_NAME = 'session';

/**
 * Next.js 16 の proxy（旧 middleware）。Edge ランタイムで動作するため、
 * Node.js の crypto に依存する firebase-admin はここでは使えない。
 *
 * そのため、ここでは Cookie の有無だけを見て未ログインユーザーを
 * ログイン画面へ振り分ける「UX目的の一次チェック」のみを行う。
 * 署名検証・退会（isActive）チェックといった本当の認可判定は、
 * 実際にデータへアクセスする Server Component 側の
 * requireProfile() / requireAdmin()（Node.js ランタイム）で行っている。
 *
 * ログイン済みユーザーが /login にアクセスした際の振り分けは、
 * ここでは行わない（Cookie が残っているが無効、というケースで
 * リダイレクトループになるのを避けるため）。該当の振り分けは
 * login/signup ページ自身が requireProfile 相当のチェックで行う。
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!hasSession && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
