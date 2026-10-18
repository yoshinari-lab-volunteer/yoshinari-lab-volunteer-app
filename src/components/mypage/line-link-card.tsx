'use client';

import { useState, useTransition } from 'react';
import { unlinkLine } from '@/lib/actions/line';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { LineButton } from '@/components/auth/line-button';

/** /api/auth/line/callback が ?line=xxx で返してくる連携結果 */
const STATUS_MESSAGES: Record<string, { tone: 'success' | 'warning' | 'error'; text: string }> = {
  linked: { tone: 'success', text: 'LINEアカウントと連携しました。今後はLINEでもログインできます。' },
  already: { tone: 'success', text: 'すでにこのLINEアカウントと連携済みです。' },
  taken: { tone: 'error', text: 'このLINEアカウントは、すでに別の会員に連携されています。' },
  has_other: {
    tone: 'error',
    text: 'すでに別のLINEアカウントと連携しています。先に連携を解除してください。',
  },
  cancelled: { tone: 'warning', text: 'LINEとの連携がキャンセルされました。' },
  failed: { tone: 'error', text: 'LINEとの連携に失敗しました。時間をおいてもう一度お試しください。' },
};

export function LineLinkCard({
  linked,
  canUnlink,
  status,
}: {
  linked: boolean;
  /** メールアドレスがない会員は、解除するとログインできなくなるため解除不可 */
  canUnlink: boolean;
  status?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const message = status ? STATUS_MESSAGES[status] : undefined;

  function handleUnlink() {
    setError(null);
    startTransition(async () => {
      const result = await unlinkLine();
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>LINE連携</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}

        {linked ? (
          <>
            <p className="text-sm text-slate-600">
              LINEアカウントと連携済みです。LINEでもログインできます。
            </p>
            {canUnlink ? (
              <Button variant="outline" size="sm" loading={pending} onClick={handleUnlink}>
                連携を解除する
              </Button>
            ) : (
              <p className="text-xs text-slate-500">
                メールアドレスが未登録のため、連携は解除できません（ログインできなくなります）。
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              LINEアカウントと連携すると、次回からLINEでログインできるようになります。
            </p>
            <LineButton mode="link" label="LINEと連携する" redirectTo="/mypage" />
          </>
        )}
      </CardBody>
    </Card>
  );
}
