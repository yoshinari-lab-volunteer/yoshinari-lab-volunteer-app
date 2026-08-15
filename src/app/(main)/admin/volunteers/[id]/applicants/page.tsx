import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getVolunteer, listApplicationsWithProfiles } from '@/lib/firebase/queries';
import { Card, CardBody } from '@/components/ui/card';
import { ApplicationStatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateTime } from '@/lib/utils';
import { ApplicantActions } from '@/components/admin/applicant-actions';
import { CsvDownloadButton } from '@/components/admin/csv-download-button';

export const metadata: Metadata = { title: '応募者一覧' };

export default async function VolunteerApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [volunteer, applications] = await Promise.all([
    getVolunteer(id),
    listApplicationsWithProfiles(id),
  ]);
  if (!volunteer) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{volunteer.title}</h1>
          <p className="mt-1 text-sm text-slate-600">応募者 {applications.length} 名</p>
        </div>
        <CsvDownloadButton volunteerTitle={volunteer.title} applications={applications} />
      </div>

      {applications.length === 0 ? (
        <EmptyState title="まだ応募がありません" />
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
                  <p className="text-sm text-slate-600">{application.profile.email}</p>
                  <p className="text-sm text-slate-600">{application.profile.phone}</p>
                  <p className="text-xs text-slate-400">
                    応募日時: {formatDateTime(application.appliedAt)}
                  </p>
                  {application.surveyComment && (
                    <div className="mt-1 max-w-md rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <p className="text-xs font-semibold text-slate-500">アンケート回答</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">
                        {application.surveyComment}
                      </p>
                    </div>
                  )}
                </div>

                <ApplicantActions
                  applicationId={application.id}
                  volunteerId={id}
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
