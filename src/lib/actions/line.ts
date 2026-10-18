'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { requireProfile } from '@/lib/auth';
import {
  createSessionCookieForUid,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from '@/lib/firebase/session';
import { newProfileSchema } from '@/lib/profile-schema';
import { LINE_SIGNUP_COOKIE } from '@/lib/line/config';
import { readPendingLineSignup } from '@/lib/line/pending';
import { registerLineUser, unlinkLineAccount } from '@/lib/line/accounts';

/**
 * LINE認証後の新規会員登録を完了する（氏名・電話番号の入力後に呼ばれる）。
 * LINEのユーザーIDはクライアントから受け取らず、callback が発行した署名つきCookieからのみ取り出す。
 */
export async function completeLineSignup(input: {
  fullName: string;
  phone: string;
}): Promise<{ error?: string; redirectTo?: string }> {
  const parsed = newProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '入力内容を確認してください' };
  }

  const pending = await readPendingLineSignup();
  if (!pending) {
    return { error: 'LINE認証の有効期限が切れました。もう一度LINEでログインしてください。' };
  }

  try {
    const uid = await registerLineUser({ lineUserId: pending.lineUserId, ...parsed.data });

    const userSnap = await adminDb().collection('users').doc(uid).get();
    if (!userSnap.exists || userSnap.data()!.isActive === false) {
      return { error: 'このアカウントは現在ご利用いただけません。管理者へお問い合わせください。' };
    }

    const store = await cookies();
    store.set(SESSION_COOKIE_NAME, await createSessionCookieForUid(uid), SESSION_COOKIE_OPTIONS);
    store.delete(LINE_SIGNUP_COOKIE);
  } catch (err) {
    console.error('[line] 会員登録に失敗しました', err);
    return { error: '登録に失敗しました。時間をおいてもう一度お試しください。' };
  }

  return { redirectTo: pending.redirectTo };
}

/**
 * LINE連携の解除。メールアドレスを持たない会員（LINEで登録した会員）は、
 * 解除するとログイン手段がなくなってしまうため解除できない。
 */
export async function unlinkLine(): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!profile.email) {
    return { error: 'メールアドレスが未登録のため、LINE連携は解除できません（ログインできなくなります）' };
  }

  try {
    await unlinkLineAccount(profile.id);
  } catch (err) {
    console.error('[line] 連携解除に失敗しました', err);
    return { error: '連携の解除に失敗しました。時間をおいてもう一度お試しください。' };
  }

  revalidatePath('/mypage');
  return {};
}
