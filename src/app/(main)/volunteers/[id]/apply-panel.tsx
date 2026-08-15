'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { applyToVolunteer, cancelApplication, requestCompletion } from '@/lib/actions/applications';
import { canApply, hasVolunteerEnded, isDeadlinePassed } from '@/lib/utils';
import { ApplicationStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import type { Application, Volunteer } from '@/types/firestore';

const ACTIVE_STATUSES: Application['status'][] = [
  'pending',
  'approved',
  'cancellation_requested',
  'completion_requested',
  'completed',
];

export function ApplyPanel({
  volunteerId,
  volunteer,
  isLoggedIn,
  isActive,
  application,
}: {
  volunteerId: string;
  volunteer: Volunteer;
  isLoggedIn: boolean;
  isActive: boolean;
  application: Application | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isLoggedIn) {
    return (
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
        <p className="text-sm text-slate-600">応募するにはログインが必要です</p>
        <Link href={`/login?redirectTo=/volunteers/${volunteerId}`}>
          <Button className="w-full sm:w-auto">ログインして応募する</Button>
        </Link>
      </div>
    );
  }

  if (!isActive) {
    return (
      <Alert tone="warning">
        現在このアカウントはご利用いただけません。管理者へお問い合わせください。
      </Alert>
    );
  }

  if (application && ACTIVE_STATUSES.includes(application.status)) {
    const cancellable = application.status === 'pending' || application.status === 'approved';
    const canReportCompletion = application.status === 'approved' && hasVolunteerEnded(volunteer);

    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">あなたの応募状況</span>
          <ApplicationStatusBadge status={application.status} />
        </div>

        {(cancellable || canReportCompletion) && error && <Alert tone="error">{error}</Alert>}

        {canReportCompletion && (
          <Button
            className="w-full"
            loading={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await requestCompletion(volunteerId);
                if (result.error) setError(result.error);
              });
            }}
          >
            完了報告をする
          </Button>
        )}

        {cancellable && (
          <Button
            variant="outline"
            className="w-full"
            loading={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await cancelApplication(volunteerId);
                if (result.error) setError(result.error);
              });
            }}
          >
            {application.status === 'pending' ? '応募を取り消す' : '取消を申請する'}
          </Button>
        )}
      </div>
    );
  }

  const applyable = canApply(volunteer);
  const label =
    volunteer.status !== 'published'
      ? '募集していません'
      : volunteer.currentApplicants >= volunteer.maxCapacity
        ? '満員です'
        : isDeadlinePassed(volunteer.deadline)
          ? '募集を締め切りました'
          : '参加する';

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {error && <Alert tone="error">{error}</Alert>}
      <Button
        className="w-full"
        disabled={!applyable}
        loading={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await applyToVolunteer(volunteerId);
            if (result.error) setError(result.error);
          });
        }}
      >
        {label}
      </Button>
    </div>
  );
}
