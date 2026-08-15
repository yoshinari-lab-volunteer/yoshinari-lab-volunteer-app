import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { SignupForm } from './signup-form';

export default async function SignupPage() {
  const profile = await getCurrentProfile();
  if (profile?.isActive) redirect('/mypage');

  return <SignupForm />;
}
