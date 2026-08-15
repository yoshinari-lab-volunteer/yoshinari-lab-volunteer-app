import type { Metadata } from 'next';
import { Eye, Globe } from 'lucide-react';
import { getSiteAnalytics } from '@/lib/firebase/queries';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { VolunteerStatusBadge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'アクセス状況' };

export default async function AdminAnalyticsPage() {
  const { pageViews, volunteers } = await getSiteAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">アクセス状況</h1>
        <p className="mt-1 text-sm text-slate-600">
          サイト全体の累計ページビューと、案件ごとの累計閲覧数です。
        </p>
      </div>

      <Card className="max-w-xs">
        <CardBody className="space-y-3">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
            <Globe className="size-5" aria-hidden />
          </span>
          <p className="text-2xl font-bold text-slate-900">{pageViews.toLocaleString()}</p>
          <p className="text-sm font-medium text-slate-600">サイト全体の累計ページビュー</p>
        </CardBody>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">案件ごとの閲覧数</h2>
        {volunteers.length === 0 ? (
          <EmptyState title="案件がまだありません" />
        ) : (
          <Card>
            <div className="divide-y divide-slate-100">
              {volunteers.map((volunteer) => (
                <div
                  key={volunteer.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <VolunteerStatusBadge status={volunteer.status} />
                    <p className="truncate text-sm font-semibold text-slate-800">{volunteer.title}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-slate-700">
                    <Eye className="size-4 text-slate-400" aria-hidden />
                    {volunteer.viewCount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
