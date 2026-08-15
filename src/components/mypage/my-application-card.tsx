'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { cancelApplication, requestCompletion } from '@/lib/actions/applications';
import { Card, CardBody } from '@/components/ui/card';
import { ApplicationStatusBadge, PointsBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, hasVolunteerEnded } from '@/lib/utils';
import { APPLICATION_STATUS } from '@/lib/constants';
import type { ApplicationWithVolunteer } from '@/types/firestore';

export function MyApplicationCard({ application }: { application: ApplicationWithVolunteer }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { volunteer } = application;

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <Link
              href={`/volunteers/${volunteer.id}`}
              className="font-bold text-slate-900 hover:text-brand-700"
            >
              {volunteer.title}
            </Link>
            <p className="text-sm text-slate-500">{formatDate(volunteer.eventDate)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <ApplicationStatusBadge status={application.status} />
            {application.status === 'completed' && (
              <PointsBadge points={application.awardedPoints ?? volunteer.points} />
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500">{APPLICATION_STATUS[application.status].hint}</p>

        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

        {application.status === 'approved' && hasVolunteerEnded(volunteer) && (
          <Button
            size="sm"
            loading={pending}
            onClick={() => run(() => requestCompletion(volunteer.id))}
          >
            完了報告をする
          </Button>
        )}

        {(application.status === 'pending' || application.status === 'approved') && (
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-500"
            loading={pending}
            onClick={() => run(() => cancelApplication(volunteer.id))}
          >
            {application.status === 'pending' ? '応募を取り消す' : '取消を申請する'}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
