import type { Metadata } from 'next';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { listAllVolunteersForAdmin } from '@/lib/firebase/queries';
import { Card, CardBody } from '@/components/ui/card';
import { BeginnerBadge, PointsBadge, VolunteerStatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, cn } from '@/lib/utils';
import { VOLUNTEER_STATUS } from '@/lib/constants';
import { VolunteerStatusToggle } from '@/components/admin/volunteer-status-toggle';
import type { VolunteerStatus } from '@/types/firestore';

export const metadata: Metadata = { title: '案件管理' };

const TABS: VolunteerStatus[] = ['published', 'draft', 'closed'];

/** タブは表示幅の都合上、VOLUNTEER_STATUS の正式表記より短い呼び名で出す */
const TAB_LABELS: Record<VolunteerStatus, string> = {
  published: '公開中',
  draft: '非公開',
  closed: '募集終了',
};

function isVolunteerStatus(value: string | undefined): value is VolunteerStatus {
  return !!value && (TABS as string[]).includes(value);
}

export default async function AdminVolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = isVolunteerStatus(statusParam) ? statusParam : undefined;
  const volunteers = await listAllVolunteersForAdmin(status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">案件管理</h1>
          <p className="mt-1 text-sm text-slate-600">
            {status ? `${VOLUNTEER_STATUS[status].label} ${volunteers.length} 件` : `全 ${volunteers.length} 件`}
          </p>
        </div>
        <Link
          href="/admin/volunteers/new"
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          新規作成
        </Link>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-slate-200 text-sm font-semibold">
        <Link
          href="/admin/volunteers"
          className={cn(
            'rounded-t-lg px-3 py-2.5',
            !status ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:bg-slate-100',
          )}
        >
          すべて
        </Link>
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/admin/volunteers?status=${tab}`}
            className={cn(
              'rounded-t-lg px-3 py-2.5',
              tab === status
                ? 'border-b-2 border-brand-600 text-brand-700'
                : 'text-slate-500 hover:bg-slate-100',
            )}
          >
            {TAB_LABELS[tab]}
          </Link>
        ))}
      </nav>

      {volunteers.length === 0 ? (
        <EmptyState title="該当する案件がありません" description="「新規作成」から最初の案件を登録してください。" />
      ) : (
        <div className="space-y-3">
          {volunteers.map((volunteer) => (
            <Card key={volunteer.id}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <VolunteerStatusBadge status={volunteer.status} />
                    {volunteer.beginnerFriendly && <BeginnerBadge />}
                    <PointsBadge points={volunteer.points} />
                  </div>
                  <Link
                    href={`/admin/volunteers/${volunteer.id}/edit`}
                    className="block font-bold text-slate-900 hover:text-brand-700"
                  >
                    {volunteer.title}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {formatDate(volunteer.eventDate)} ・ {volunteer.area} ・{' '}
                    {volunteer.currentApplicants} / {volunteer.maxCapacity} 名
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <Link
                    href={`/admin/volunteers/${volunteer.id}/applicants`}
                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-brand-700"
                  >
                    <Users className="size-4" aria-hidden />
                    応募者一覧
                  </Link>
                  <Link
                    href={`/admin/volunteers/${volunteer.id}/edit`}
                    className="text-sm font-semibold text-slate-700 hover:text-brand-700"
                  >
                    編集
                  </Link>
                  <VolunteerStatusToggle id={volunteer.id} status={volunteer.status} />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
