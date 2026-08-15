'use client';

import { useState, useTransition } from 'react';
import { updateSiteSettings } from '@/lib/actions/site-settings';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import type { SiteSettings } from '@/types/firestore';

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateSiteSettings(formData);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="success">サイト設定を更新しました</Alert>}

      <Field label="サイト名" htmlFor="siteName" required hint="ヘッダー・フッター・ページタイトルに表示されます">
        <Input id="siteName" name="siteName" defaultValue={settings.siteName} required maxLength={50} />
      </Field>

      <Field
        label="サイトの説明文"
        htmlFor="tagline"
        hint="検索結果などに表示されるページの説明文です"
      >
        <Textarea id="tagline" name="tagline" defaultValue={settings.tagline} maxLength={200} />
      </Field>

      <Field label="トップページの見出し" htmlFor="homeHeroTitle" required>
        <Input
          id="homeHeroTitle"
          name="homeHeroTitle"
          defaultValue={settings.homeHeroTitle}
          required
          maxLength={100}
        />
      </Field>

      <Field label="トップページの説明文" htmlFor="homeHeroDescription">
        <Textarea
          id="homeHeroDescription"
          name="homeHeroDescription"
          defaultValue={settings.homeHeroDescription}
          maxLength={300}
        />
      </Field>

      <Field
        label="フッターの案内文"
        htmlFor="footerDescription"
        hint="退会・お問い合わせに関する案内文です"
      >
        <Textarea
          id="footerDescription"
          name="footerDescription"
          defaultValue={settings.footerDescription}
          maxLength={300}
        />
      </Field>

      <Field
        label="問い合わせ先メールアドレス"
        htmlFor="contactEmail"
        required
        hint="フッターの mailto リンクの宛先になります"
      >
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={settings.contactEmail}
          required
        />
      </Field>

      <Button type="submit" loading={pending}>
        更新する
      </Button>
    </form>
  );
}
