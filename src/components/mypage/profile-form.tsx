'use client';

import { useState, useTransition } from 'react';
import { updateProfile } from '@/lib/actions/profile';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import type { UserProfile } from '@/types/firestore';

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="success">登録情報を更新しました</Alert>}

      <Field label="メールアドレス" htmlFor="email">
        <Input id="email" value={profile.email} disabled />
      </Field>

      <Field label="氏名" htmlFor="fullName" required>
        <Input id="fullName" name="fullName" defaultValue={profile.fullName} required maxLength={100} />
      </Field>

      <Field label="電話番号" htmlFor="phone" required>
        <Input id="phone" name="phone" type="tel" defaultValue={profile.phone} required />
      </Field>

      <Button type="submit" loading={pending}>
        更新する
      </Button>
    </form>
  );
}
