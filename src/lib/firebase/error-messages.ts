/** Firebase Auth のエラーコード → 日本語メッセージ */
export const FIREBASE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません',
  'auth/invalid-email': 'メールアドレスの形式が正しくありません',
  'auth/user-disabled': 'このアカウントは無効化されています',
  'auth/user-not-found': 'メールアドレスまたはパスワードが正しくありません',
  'auth/wrong-password': 'メールアドレスまたはパスワードが正しくありません',
  'auth/too-many-requests': '試行回数が多すぎます。しばらくしてから再度お試しください',
  'auth/email-already-in-use': 'このメールアドレスはすでに登録されています',
  'auth/weak-password': 'パスワードは8文字以上で設定してください',
  'auth/network-request-failed': '通信エラーが発生しました。通信環境をご確認ください',
};

export function toAuthErrorMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string })?.code;
  if (code && FIREBASE_AUTH_ERROR_MESSAGES[code]) return FIREBASE_AUTH_ERROR_MESSAGES[code];
  return fallback;
}
