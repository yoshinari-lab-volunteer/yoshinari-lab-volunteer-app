import Link from 'next/link';
import { ClipboardCheck, LayoutDashboard, ListChecks, Settings, Users } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';

const NAV_LINK_CLASS =
  'flex w-full items-center gap-1.5 rounded-lg px-4 py-2.5 text-slate-600 hover:bg-slate-100 sm:w-auto sm:rounded-t-lg';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <nav className="flex flex-col gap-1 border-b border-slate-200 text-sm font-semibold sm:flex-row">
        <Link href="/admin" className={NAV_LINK_CLASS}>
          <LayoutDashboard className="size-4" aria-hidden />
          ダッシュボード
        </Link>
        <Link href="/admin/volunteers" className={NAV_LINK_CLASS}>
          <ListChecks className="size-4" aria-hidden />
          案件管理
        </Link>
        <Link href="/admin/applications" className={NAV_LINK_CLASS}>
          <ClipboardCheck className="size-4" aria-hidden />
          応募管理
        </Link>
        <Link href="/admin/users" className={NAV_LINK_CLASS}>
          <Users className="size-4" aria-hidden />
          ユーザー管理
        </Link>
        <Link href="/admin/settings" className={NAV_LINK_CLASS}>
          <Settings className="size-4" aria-hidden />
          サイト設定
        </Link>
      </nav>
      {children}
    </div>
  );
}
