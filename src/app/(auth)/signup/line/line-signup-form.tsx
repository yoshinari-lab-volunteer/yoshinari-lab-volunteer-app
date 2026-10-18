'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { completeLineSignup } from '@/lib/actions/line';
import { newProfileSchema } from '@/lib/profile-schema';
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

type FormValues = z.infer<typeof newProfileSchema>;

export function LineSignupForm({ defaultFullName }: { defaultFullName: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(newProfileSchema),
    defaultValues: { fullName: defaultFullName, phone: '' },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const result = await completeLineSignup(values);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    router.push(result.redirectTo || '/mypage');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>LINEで新規登録</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardBody className="space-y-4">
          <Alert tone="success">
            LINEの認証が完了しました。ボランティアの応募に必要な情報を入力してください。
          </Alert>
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
        </CardBody>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" loading={isSubmitting}>
            登録する
          </Button>
          <p className="text-center text-sm text-slate-600">
            <Link href="/login" className="font-semibold text-brand-700 hover:underline">
              キャンセルしてログイン画面へ戻る
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
