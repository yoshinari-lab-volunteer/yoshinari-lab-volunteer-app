import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * RLS をすべて無視する管理者クライアント。
 * 管理者への通知メールで宛先を引くなど、限定的な用途にのみ使うこと。
 * クライアントコンポーネントから絶対に import しないこと（'server-only' で防いでいる）。
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY が設定されていません');

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
