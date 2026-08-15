'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { toAuthErrorMessage } from '@/lib/firebase/error-messages';
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const schema = z.object({
  email: z.string().min(1, 'メールアドレスを入力してください').email('メールアドレスの形式が正しくありません'),
});
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setSent(true);
    } catch (err) {
      // メール存在有無を推測させないため、user-not-found も成功として扱う
      const code = (err as { code?: string })?.code;
      if (code === 'auth/user-not-found') {
        setSent(true);
        return;
      }
      setFormError(toAuthErrorMessage(err, '送信に失敗しました'));
    }
  }

  if (sent) {
    return (
      <Card>
        <CardBody className="space-y-3 py-8 text-center">
          <p className="font-bold text-slate-900">メールを送信しました</p>
          <p className="text-sm text-slate-600">
            ご入力いただいたメールアドレス宛にパスワード再設定用のリンクをお送りしました。
          </p>
          <Link href="/login" className="text-sm font-semibold text-brand-700 hover:underline">
            ログイン画面へ戻る
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>パスワードの再設定</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardBody className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}
          <p className="text-sm text-slate-600">
            登録済みのメールアドレスを入力してください。再設定用のリンクをお送りします。
          </p>
          <Field label="メールアドレス" htmlFor="email" required error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
          </Field>
        </CardBody>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" loading={isSubmitting}>
            送信する
          </Button>
          <Link href="/login" className="text-center text-sm font-semibold text-brand-700 hover:underline">
            ログイン画面へ戻る
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
