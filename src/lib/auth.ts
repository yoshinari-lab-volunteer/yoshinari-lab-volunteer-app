import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database.types';

/** ログインしていなければ null */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data ?? null;
}

/** ログイン必須ページで使う */
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (!profile.is_active) redirect('/login?error=deactivated');
  return profile;
}

/** 管理者専用ページで使う */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') redirect('/');
  return profile;
}
