import 'server-only';
import { cookies } from 'next/headers';
import { getLineConfig, LINE_SIGNUP_COOKIE } from '@/lib/line/config';
import { readCookieValue } from '@/lib/line/signed-cookie';

/** LINE認証は済んだが、氏名・電話番号の入力（会員登録）がまだのユーザー */
export type PendingLineSignup = {
  kind: 'line_signup';
  lineUserId: string;
  displayName: string;
  redirectTo: string;
};

export async function readPendingLineSignup(): Promise<PendingLineSignup | null> {
  // 設定の有無にかかわらず最初に cookies() を呼ぶ。LINE未設定のビルドで呼ばれないと、
  // このCookieに依存するページがビルド時に静的ページとして固定されてしまうため。
  const store = await cookies();
  const config = getLineConfig();
  if (!config) return null;

  const data = readCookieValue<PendingLineSignup>(
    config.channelSecret,
    store.get(LINE_SIGNUP_COOKIE)?.value,
  );
  return data?.kind === 'line_signup' && typeof data.lineUserId === 'string' ? data : null;
}
