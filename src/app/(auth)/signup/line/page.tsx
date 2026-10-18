import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readPendingLineSignup } from '@/lib/line/pending';
import { LineSignupForm } from './line-signup-form';

export const metadata: Metadata = { title: 'LINEで新規登録' };

export default async function LineSignupPage() {
  const pending = await readPendingLineSignup();
  if (!pending) redirect('/login?error=line_expired');

  return <LineSignupForm defaultFullName={pending.displayName} />;
}
