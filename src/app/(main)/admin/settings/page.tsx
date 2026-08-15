import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/firebase/queries';
import { SiteSettingsForm } from '@/components/admin/site-settings-form';

export const metadata: Metadata = { title: 'サイト設定' };

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">サイト設定</h1>
        <p className="mt-1 text-sm text-slate-600">
          サイト名や見出し・説明文などの表示テキストを編集できます。
        </p>
      </div>
      <SiteSettingsForm settings={settings} />
    </div>
  );
}
