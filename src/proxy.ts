import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

/** Next.js 16 の proxy（旧 middleware）。全リクエストで Supabase セッションを更新する */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 静的アセットと画像最適化を除く全パスに適用。
     * Vercel 無料枠の実行回数を無駄に消費しないための除外設定。
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
