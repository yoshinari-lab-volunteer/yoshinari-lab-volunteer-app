import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { VerifyEmailPanel } from './verify-email-panel';

export default async function VerifyEmailPage() {
  const session = await requireSession();
  if (session.emailVerified) redirect('/mypage');

  return <VerifyEmailPanel email={session.profile.email} />;
}
