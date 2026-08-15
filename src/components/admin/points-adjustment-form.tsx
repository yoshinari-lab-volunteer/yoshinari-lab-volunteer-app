'use client';

import { useState, useTransition } from 'react';
import { adjustUserPoints } from '@/lib/actions/admin-users';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export function PointsAdjustmentForm({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    // React の SyntheticEvent は同期処理が終わると currentTarget が null に戻るため、
    // async コールバックの中で使う分は先に変数へ退避しておく
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await adjustUserPoints(userId, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        form.reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="success">ポイントを調整しました</Alert>}

      <Field
        label="増減させるポイント数"
        htmlFor="delta"
        required
        hint="マイナスの値を入力すると減算できます（例: -30）"
      >
        <Input id="delta" name="delta" type="number" step={1} required placeholder="例: 50 / -30" />
      </Field>

      <Field label="理由" htmlFor="reason" required hint="操作ログに記録され、後から確認できます">
        <Textarea id="reason" name="reason" required maxLength={200} placeholder="例: 完了処理のミスにより手動付与" />
      </Field>

      <Button type="submit" variant="secondary" loading={pending}>
        ポイントを調整する
      </Button>
    </form>
  );
}
