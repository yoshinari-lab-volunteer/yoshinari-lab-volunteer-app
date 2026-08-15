import type { Metadata } from 'next';
import Link from 'next/link';
import { listApplicationsByStatus } from '@/lib/firebase/queries';
import { Card, CardBody } from '@/components/ui/card';
import { ApplicationStatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ApplicantActions } from '@/components/admin/applicant-actions';
import { formatDate, formatDateTime, cn } from '@/lib/utils';
import { APPLICATION_STATUS } from '@/lib/constants';
import type { ApplicationStatus } from '@/types/firestore';

export const metadata: Metadata = { title: '応募管理' };

/** タブに出す順序。対応が必要なものを先頭に、確定済みのものを後ろに並べている */
const TABS: ApplicationStatus[] = [
  'pending',
  'cancellation_requested',
  'completion_requested',
  'approved',
  'completed',
  'rejected',
  'cancelled',
];

function isApplicationStatus(value: string | undefined): value is ApplicationStatus {
  return !!value && (TABS as string[]).includes(value);
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status: ApplicationStatus = isApplicationStatus(statusParam) ? statusParam : 'pending';
  const applications = await listApplicationsByStatus(status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">応募管理</h1>
        <p className="mt-1 text-sm text-slate-600">
          案件を横断して、ステータス別に応募者を確認・対応できます。
        </p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-slate-200 text-sm font-semibold">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/admin/applications?status=${tab}`}
            className={cn(
              'rounded-t-lg px-3 py-2.5',
              tab === status
                ? 'border-b-2 border-brand-600 text-brand-700'
                : 'text-slate-500 hover:bg-slate-100',
            )}
          >
            {APPLICATION_STATUS[tab].label}
          </Link>
        ))}
      </nav>

      {applications.length === 0 ? (
        <EmptyState title={`「${APPLICATION_STATUS[status].label}」の応募はありません`} />
      ) : (
        <div className="space-y-3">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{application.profile.fullName}</p>
                    <ApplicationStatusBadge status={application.status} />
                  </div>
                  <Link
                    href={`/volunteers/${application.volunteer.id}`}
                    className="block text-sm font-semibold text-brand-700 hover:underline"
                  >
                    {application.volunteer.title}
                  </Link>
                  <p className="text-sm text-slate-600">{formatDate(application.volunteer.eventDate)}</p>
                  <p className="text-sm text-slate-600">{application.profile.email}</p>
                  <p className="text-sm text-slate-600">{application.profile.phone}</p>
                  <p className="text-xs text-slate-400">
                    応募日時: {formatDateTime(application.appliedAt)}
                  </p>
                </div>

                <ApplicantActions
                  applicationId={application.id}
                  volunteerId={application.volunteer.id}
                  status={application.status}
                />
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
