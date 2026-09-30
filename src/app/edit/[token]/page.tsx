import type { Metadata } from 'next';
import { getSiteSettings, getVolunteerByEditToken } from '@/lib/firebase/queries';
import { updateVolunteerByEditToken } from '@/lib/actions/org-volunteer-edit';
import { VolunteerForm } from '@/components/admin/volunteer-form';

export const metadata: Metadata = { title: '案件の編集（団体担当者用）' };

export default async function OrgEditPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [volunteer, settings] = await Promise.all([
    getVolunteerByEditToken(token),
    getSiteSettings(),
  ]);

  if (!volunteer) {
    return (
      <div className="mx-auto max-w-md space-y-3 px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-slate-900">このリンクは無効です</h1>
        <p className="text-sm text-slate-600">
          リンクが無効化されたか、URLが正しくない可能性があります。発行元の管理者にお問い合わせください。
        </p>
      </div>
    );
  }

  const updateWithToken = updateVolunteerByEditToken.bind(null, token);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-brand-600">{settings.siteName} 団体編集ページ</p>
        <h1 className="text-xl font-bold text-slate-900">{volunteer.title}</h1>
        <p className="text-sm text-slate-600">
          このページから募集要項を編集できます（獲得ポイントのみ管理者が設定します）。
        </p>
      </div>

      <VolunteerForm
        volunteer={volunteer}
        action={updateWithToken}
        submitLabel="保存する"
        hidePoints
        successMessage="保存しました"
      />
    </div>
  );
}
