'use client';

import { useState, useTransition } from 'react';
import { UserX, UserCheck } from 'lucide-react';
import { setUserActive } from '@/lib/actions/admin-users';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Alert } from '@/components/ui/alert';

export function UserActiveToggle({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await setUserActive(userId, !isActive);
      if (result.error) setError(result.error);
      setConfirming(false);
    });
  }

  return (
    <div className="space-y-2">
      {error && <Alert tone="error">{error}</Alert>}
      {isActive ? (
        <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
          <UserX className="size-4" aria-hidden />
          アカウントを無効化する
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
          <UserCheck className="size-4" aria-hidden />
          アカウントを再度有効化する
        </Button>
      )}

      <ConfirmDialog
        open={confirming}
        title={isActive ? 'このアカウントを無効化しますか？' : 'このアカウントを再度有効化しますか？'}
        description={
          isActive
            ? '無効化すると、このユーザーはログインできなくなります（退会処理）。ログイン中の場合は次のアクセスで強制的にログアウトされます。'
            : undefined
        }
        confirmLabel={isActive ? '無効化する' : '有効化する'}
        danger={isActive}
        loading={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
