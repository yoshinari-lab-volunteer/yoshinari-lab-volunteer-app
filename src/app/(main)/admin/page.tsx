import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardList, FileEdit, Hourglass, PartyPopper, Undo2 } from 'lucide-react';
import { getAdminDashboardStats } from '@/lib/firebase/queries';
import { Card, CardBody } from '@/components/ui/card';

export const metadata: Metadata = { title: '管理者ダッシュボード' };

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  const tiles = [
    {
      label: '公開中の案件',
      value: stats.publishedCount,
      icon: ClipboardList,
      href: '/admin/volunteers?status=published',
      accent: 'text-brand-600 bg-brand-100',
    },
    {
      label: '非公開の案件',
      value: stats.draftCount,
      icon: FileEdit,
      href: '/admin/volunteers?status=draft',
      accent: 'text-slate-600 bg-slate-100',
    },
    {
      label: '参加承認待ち',
      value: stats.pendingApplications,
      icon: Hourglass,
      href: '/admin/applications?status=pending',
      accent: 'text-amber-700 bg-amber-100',
    },
    {
      label: '取消承認待ち',
      value: stats.cancellationRequestedApplications,
      icon: Undo2,
      href: '/admin/applications?status=cancellation_requested',
      accent: 'text-orange-700 bg-orange-100',
    },
    {
      label: '完了承認待ち',
      value: stats.completionRequestedApplications,
      icon: PartyPopper,
      href: '/admin/applications?status=completion_requested',
      accent: 'text-violet-700 bg-violet-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">管理者ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-600">
          案件の公開状況と、対応が必要な応募の件数です。タイルをクリックすると該当の一覧に移動します。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {tiles.map(({ label, value, icon: Icon, href, accent }) => (
          <Link key={label} href={href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody className="space-y-3">
                <span className={`inline-flex size-9 items-center justify-center rounded-lg ${accent}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-sm font-medium text-slate-600">{label}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <Link
        href="/admin/volunteers/new"
        className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
      >
        新しい案件を作成する
      </Link>
    </div>
  );
}
