import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database.types';

/** ログインが必要なパス */
const PROTECTED_PREFIXES = ['/mypage', '/admin'];
/** ログイン済みなら入る意味がないパス */
const GUEST_ONLY_PREFIXES = ['/login', '/signup'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() を呼ぶことでトークンが更新される。getSession() では検証されないので使わない。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  if (user && GUEST_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/mypage';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 退会処理（is_active = false）されたユーザーは強制ログアウト
  if (user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .single();

    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '?error=deactivated';
      return NextResponse.redirect(url);
    }
  }

  return response;
}
