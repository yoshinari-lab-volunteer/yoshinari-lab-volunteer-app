'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth';
import { buildActivityLog, newActivityLogRef } from '@/lib/firebase/activity-log';

type ActionResult = { error?: string };

const adjustmentSchema = z.object({
  delta: z.coerce
    .number({ message: '増減させるポイント数を入力してください' })
    .int('整数で入力してください')
    .refine((v) => v !== 0, '0以外の値を入力してください'),
  reason: z.string().trim().min(1, '理由を入力してください').max(200),
});

/**
 * 管理者によるポイントの手動増減（操作ミスなどの是正用）。
 *
 * 不正防止のための制約:
 *   - 管理者自身のポイントも調整可能だが、必ず活動ログに「誰が・誰に・いくつ・なぜ」
 *     調整したかが残る（自己付与を隠せない）ため、記録による抑止にしている
 *   - 理由の入力を必須にし、空欄では実行できない
 *   - pointTransactions（ポイント台帳）と activityLogs（監査ログ）の両方に、
 *     誰が・いつ・なぜ調整したかを同一トランザクションで記録する
 *   - 調整後のポイントが0未満になる操作は拒否する
 */
export async function adjustUserPoints(userId: string, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = adjustmentSchema.safeParse({
    delta: formData.get('delta'),
    reason: formData.get('reason'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '入力内容を確認してください' };
  }
  const { delta, reason } = parsed.data;

  const db = adminDb();
  const userRef = db.collection('users').doc(userId);
  const pointTxRef = db.collection('pointTransactions').doc();

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new Error('ユーザーが見つかりません');

      const currentPoints: number = snap.data()!.points ?? 0;
      const nextPoints = currentPoints + delta;
      if (nextPoints < 0) {
        throw new Error(`ポイントは0未満にできません（現在 ${currentPoints}pt）`);
      }
      const targetName: string = snap.data()!.fullName ?? '';

      tx.update(userRef, {
        points: FieldValue.increment(delta),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(pointTxRef, {
        userId,
        applicationId: null,
        points: delta,
        reason,
        adjustedBy: admin.id,
        createdAt: FieldValue.serverTimestamp(),
      });

      const targetDescription = userId === admin.id ? '自分自身の' : `${targetName}さんの`;
      tx.set(
        newActivityLogRef(),
        buildActivityLog({
          type: 'points_adjusted',
          actorId: admin.id,
          actorName: admin.fullName,
          actorRole: 'admin',
          targetUserId: userId,
          message: `${admin.fullName}さん（管理者）が${targetDescription}ポイントを${delta > 0 ? '+' : ''}${delta}pt調整しました（理由: ${reason}）`,
        }),
      );
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'ポイントの調整に失敗しました' };
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath('/mypage');
  return {};
}

/**
 * ユーザーの有効/無効を切り替える（退会処理）。
 * 無効化時は Firebase Auth のリフレッシュトークンも失効させるため、
 * 有効期限内のセッション Cookie を持つ端末があっても次のアクセスで強制ログアウトされる
 * （src/lib/firebase/session.ts の verifySessionCookie が checkRevoked: true で検証しているため）。
 * 不正防止のため、管理者は自分自身を無効化できない。
 */
export async function setUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { error: '自分自身は無効化できません' };
  }

  const db = adminDb();
  const userRef = db.collection('users').doc(userId);

  try {
    const snap = await userRef.get();
    if (!snap.exists) return { error: 'ユーザーが見つかりません' };
    const targetName: string = snap.data()!.fullName ?? '';

    await userRef.update({ isActive, updatedAt: FieldValue.serverTimestamp() });

    if (!isActive) {
      await adminAuth().revokeRefreshTokens(userId);
    }

    await newActivityLogRef().set(
      buildActivityLog({
        type: isActive ? 'user_activated' : 'user_deactivated',
        actorId: admin.id,
        actorName: admin.fullName,
        actorRole: 'admin',
        targetUserId: userId,
        message: isActive
          ? `${admin.fullName}さん（管理者）が${targetName}さんのアカウントを有効化しました`
          : `${admin.fullName}さん（管理者）が${targetName}さんのアカウントを無効化しました`,
      }),
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : '処理に失敗しました' };
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath('/admin/users');
  return {};
}
