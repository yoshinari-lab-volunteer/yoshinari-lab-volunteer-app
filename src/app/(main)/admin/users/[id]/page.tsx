import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { getUserProfile, listActivityLogsForUser } from '@/lib/firebase/queries';
import { requireAdmin } from '@/lib/auth';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, PointsBadge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { PointsAdjustmentForm } from '@/components/admin/points-adjustment-form';
import { ActivityLogList } from '@/components/admin/activity-log-list';
import { UserActiveToggle } from '@/components/admin/user-active-toggle';

export const metadata: Metadata = { title: 'ユーザー詳細' };

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const [user, logs] = await Promise.all([getUserProfile(id), listActivityLogsForUser(id)]);
  if (!user) notFound();
  const isSelf = id === admin.id;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-lg font-bold text-slate-900">{user.fullName || '(未登録)'}</p>
              {user.role === 'admin' && (
                <Badge className="bg-brand-100 text-brand-800 ring-brand-200">
                  <ShieldCheck className="size-3.5" aria-hidden />
                  管理者
                </Badge>
              )}
              {!user.isActive && (
                <Badge className="bg-rose-100 text-rose-800 ring-rose-200">無効化済み</Badge>
              )}
            </div>
            <dl className="space-y-1 text-sm text-slate-600">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">メール</dt>
                <dd>{user.email}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">電話番号</dt>
                <dd>{user.phone || '未登録'}</dd>
              </div>
            </dl>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm font-semibold text-slate-700">累積ポイント</span>
              <PointsBadge points={user.points} />
            </div>
            <div className="border-t border-slate-100 pt-3">
              {isSelf ? (
                <p className="text-xs text-slate-500">自分自身のアカウントは無効化できません。</p>
              ) : (
                <UserActiveToggle userId={id} isActive={user.isActive} />
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ポイントの手動調整</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {isSelf && (
              <Alert tone="info">
                自分自身のポイントも調整できますが、誰が・いつ・なぜ調整したかは操作履歴に記録されます。
              </Alert>
            )}
            <PointsAdjustmentForm userId={id} />
          </CardBody>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">操作履歴</h2>
        <p className="text-sm text-slate-600">
          このユーザー本人の操作（応募・取消申請など）と、管理者による操作（承認・却下・ポイント調整など）の両方を表示しています。
        </p>
        <ActivityLogList logs={logs} />
      </div>
    </div>
  );
}
