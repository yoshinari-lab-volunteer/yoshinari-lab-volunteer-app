import 'server-only';
import { SITE_URL } from '@/lib/constants';

export const LINE_OAUTH_COOKIE = 'line_oauth';
export const LINE_SIGNUP_COOKIE = 'line_signup';
export const LINE_CALLBACK_PATH = '/api/auth/line/callback';

export type LineConfig = {
  channelId: string;
  channelSecret: string;
  redirectUri: string;
  /** LINE Login チャネルに紐付けた公式アカウントを、ログイン時に友だち追加させるか */
  botPrompt: 'normal' | 'aggressive' | null;
};

/** LINE Login の環境変数が未設定なら null（その場合、LINE関連のUIは一切表示しない） */
export function getLineConfig(): LineConfig | null {
  const channelId = process.env.LINE_CHANNEL_ID?.trim();
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  if (!channelId || !channelSecret) return null;

  const botPrompt = process.env.LINE_BOT_PROMPT?.trim();
  return {
    channelId,
    channelSecret,
    redirectUri: `${SITE_URL.replace(/\/$/, '')}${LINE_CALLBACK_PATH}`,
    botPrompt: botPrompt === 'normal' || botPrompt === 'aggressive' ? botPrompt : null,
  };
}

export function isLineLoginEnabled(): boolean {
  return getLineConfig() !== null;
}
