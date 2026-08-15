import Link from 'next/link';
import { HeartHandshake, LayoutDashboard, LogIn, UserRound } from 'lucide-react';
import { getCurrentProfile } from '@/lib/auth';
import { getSiteSettings } from '@/lib/firebase/queries';
import { SignOutButton } from '@/components/layout/sign-out-button';

export async function Header() {
  const [profile, settings] = await Promise.all([getCurrentProfile(), getSiteSettings()]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-bold text-slate-900 hover:text-brand-700"
        >
          <HeartHandshake className="size-6 shrink-0 text-brand-600" aria-hidden />
          <span className="truncate text-lg">{settings.siteName}</span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm">
          {profile ? (
            <>
              {profile.role === 'admin' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <LayoutDashboard className="size-4" aria-hidden />
                  <span className="hidden sm:inline">管理</span>
                </Link>
              )}
              <Link
                href="/mypage"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"
              >
                <UserRound className="size-4" aria-hidden />
                <span className="hidden sm:inline">マイページ</span>
              </Link>
              <span className="hidden items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 sm:inline-flex">
                {profile.points.toLocaleString()} pt
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"
              >
                <LogIn className="size-4" aria-hidden />
                ログイン
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                新規登録
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
