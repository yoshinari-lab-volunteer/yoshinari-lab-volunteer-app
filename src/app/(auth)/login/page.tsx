import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile?.isActive) redirect('/mypage');

  const { redirectTo, error } = await searchParams;
  return <LoginForm redirectTo={redirectTo} errorParam={error} />;
}
