'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { establishSession } from '@/lib/actions/auth';
import { toAuthErrorMessage } from '@/lib/firebase/error-messages';
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const schema = z.object({
  email: z.string().min(1, 'メールアドレスを入力してください').email('メールアドレスの形式が正しくありません'),
  password: z.string().min(1, 'パスワードを入力してください'),
});
type FormValues = z.infer<typeof schema>;

export function LoginForm({ redirectTo, errorParam }: { redirectTo?: string; errorParam?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(
    errorParam === 'deactivated'
      ? 'このアカウントは現在ご利用いただけません。管理者へお問い合わせください。'
      : null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const idToken = await credential.user.getIdToken();
      await establishSession(idToken);
      router.push(redirectTo || '/mypage');
      router.refresh();
    } catch (err) {
      setFormError(toAuthErrorMessage(err, 'ログインに失敗しました'));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ログイン</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardBody className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}

          <Field label="メールアドレス" htmlFor="email" required error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
          </Field>

          <Field label="パスワード" htmlFor="password" required error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
          </Field>

          <div className="text-right text-sm">
            <Link href="/reset-password" className="font-semibold text-brand-700 hover:underline">
              パスワードをお忘れですか？
            </Link>
          </div>
        </CardBody>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" loading={isSubmitting}>
            ログイン
          </Button>
          <p className="text-center text-sm text-slate-600">
            アカウントをお持ちでない方は{' '}
            <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
              新規登録
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
