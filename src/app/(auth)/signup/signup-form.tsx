'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { createUserProfile } from '@/lib/actions/auth';
import { toAuthErrorMessage } from '@/lib/firebase/error-messages';
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const schema = z.object({
  fullName: z.string().trim().min(1, '氏名を入力してください').max(100),
  phone: z
    .string()
    .trim()
    .min(1, '電話番号を入力してください')
    .regex(/^[0-9-]+$/, '電話番号はハイフンを含む数字で入力してください'),
  email: z.string().min(1, 'メールアドレスを入力してください').email('メールアドレスの形式が正しくありません'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});
type FormValues = z.infer<typeof schema>;

export function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await sendEmailVerification(credential.user);
      const idToken = await credential.user.getIdToken();
      await createUserProfile(idToken, { fullName: values.fullName, phone: values.phone });
      router.push('/signup/complete');
    } catch (err) {
      setFormError(toAuthErrorMessage(err, '登録に失敗しました'));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>新規登録</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardBody className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}

          <Field label="氏名" htmlFor="fullName" required error={errors.fullName?.message}>
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="山田 太郎"
              aria-invalid={!!errors.fullName}
              {...register('fullName')}
            />
          </Field>

          <Field label="電話番号" htmlFor="phone" required error={errors.phone?.message}>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="090-1234-5678"
              aria-invalid={!!errors.phone}
              {...register('phone')}
            />
          </Field>

          <Field label="メールアドレス" htmlFor="email" required error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
          </Field>

          <Field
            label="パスワード"
            htmlFor="password"
            required
            hint="8文字以上で設定してください"
            error={errors.password?.message}
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
          </Field>
        </CardBody>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" loading={isSubmitting}>
            登録する
          </Button>
          <p className="text-center text-sm text-slate-600">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="font-semibold text-brand-700 hover:underline">
              ログイン
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
