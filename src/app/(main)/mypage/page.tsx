import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { listMyApplications } from '@/lib/firebase/queries';
import { isLineLoginEnabled } from '@/lib/line/config';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProfileForm } from '@/components/mypage/profile-form';
import { MyApplicationCard } from '@/components/mypage/my-application-card';
import { LineLinkCard } from '@/components/mypage/line-link-card';

export const metadata: Metadata = { title: 'マイページ' };

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ line?: string }>;
}) {
  const [{ line }, profile] = await Promise.all([searchParams, requireProfile()]);
  const applications = await listMyApplications(profile.id);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-brand-600 to-brand-800 text-white">
          <CardBody className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-brand-100">
              <Sparkles className="size-4" aria-hidden />
              累積獲得ポイント
            </div>
            <p className="text-4xl font-bold">{profile.points.toLocaleString()}</p>
            <p className="text-sm text-brand-100">pt</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>登録情報</CardTitle>
          </CardHeader>
          <CardBody>
            <ProfileForm profile={profile} />
          </CardBody>
        </Card>

        {isLineLoginEnabled() && (
          <LineLinkCard linked={profile.lineLinked} canUnlink={Boolean(profile.email)} status={line} />
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">応募履歴</h2>
        {applications.length === 0 ? (
          <EmptyState
            title="まだ応募した案件がありません"
            description="気になるボランティア活動を探してみましょう。"
          />
        ) : (
          <div className="space-y-3">
            {applications.map((application) => (
              <MyApplicationCard key={application.id} application={application} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
