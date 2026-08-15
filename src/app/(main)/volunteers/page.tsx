import type { Metadata } from 'next';
import { listVolunteers } from '@/lib/firebase/queries';
import { VolunteerSearchForm } from '@/components/volunteers/search-form';
import { VolunteerCard } from '@/components/volunteers/volunteer-card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'ボランティアを探す' };

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const { area, dateFrom, dateTo } = await searchParams;
  const volunteers = await listVolunteers({ area, dateFrom, dateTo });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">ボランティアを探す</h1>
        <p className="mt-1 text-sm text-slate-600">地域・開催日で絞り込めます。</p>
      </div>

      <VolunteerSearchForm defaultValues={{ area, dateFrom, dateTo }} />

      {volunteers.length === 0 ? (
        <EmptyState
          title="条件に合う案件が見つかりませんでした"
          description="絞り込み条件を変えて再度お試しください。"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {volunteers.map((volunteer) => (
            <VolunteerCard key={volunteer.id} volunteer={volunteer} />
          ))}
        </div>
      )}
    </div>
  );
}
