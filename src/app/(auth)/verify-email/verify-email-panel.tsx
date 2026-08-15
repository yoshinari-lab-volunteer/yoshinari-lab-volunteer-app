'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MailWarning } from 'lucide-react';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { establishSession, signOutAction } from '@/lib/actions/auth';
import { toAuthErrorMessage } from '@/lib/firebase/error-messages';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export function VerifyEmailPanel({ email }: { email: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  async function handleResend() {
    setSending(true);
    setStatus('idle');
    try {
      if (!auth.currentUser) {
        setStatus('error');
        setErrorMessage('セッションが切れています。お手数ですが再度ログインしてください。');
        return;
      }
      await sendEmailVerification(auth.currentUser);
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMessage(toAuthErrorMessage(err, '送信に失敗しました。時間をおいて再度お試しください'));
    } finally {
      setSending(false);
    }
  }

  async function handleCheck() {
    setChecking(true);
    try {
      await auth.currentUser?.reload();
      // サーバー側のセッションCookieには確認前の email_verified が焼き込まれているため、
      // 強制的にIDトークンを再取得してセッションを作り直す必要がある
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) {
        setStatus('error');
        setErrorMessage('セッションが切れています。お手数ですが再度ログインしてください。');
        return;
      }
      await establishSession(idToken);
      if (auth.currentUser?.emailVerified) {
        router.push('/mypage');
      } else {
        setStatus('error');
        setErrorMessage('まだ確認が完了していません。メール内のリンクをクリックしてからお試しください。');
      }
      router.refresh();
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
        <MailWarning className="size-10 text-amber-500" aria-hidden />
        <h1 className="text-lg font-bold text-slate-900">メールアドレスの確認が必要です</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          <span className="font-semibold">{email}</span> 宛に確認メールをお送りしています。
          メール内のリンクをクリックした後、下の「確認する」を押してください。
        </p>

        {status === 'sent' && <Alert tone="success">確認メールを再送信しました</Alert>}
        {status === 'error' && <Alert tone="error">{errorMessage}</Alert>}

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={handleCheck} loading={checking}>
            確認する
          </Button>
          <Button variant="outline" onClick={handleResend} loading={sending}>
            確認メールを再送信
          </Button>
        </div>

        <button
          type="button"
          onClick={() => signOutAction()}
          className="text-sm font-semibold text-slate-500 hover:underline"
        >
          ログアウトする
        </button>
      </CardBody>
    </Card>
  );
}
