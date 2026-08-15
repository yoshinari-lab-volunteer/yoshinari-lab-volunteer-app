'use server';

import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth';
import { buildActivityLog, newActivityLogRef } from '@/lib/firebase/activity-log';

type ActionResult = { error?: string };

/** 「参加承認待ち」→「参加予定」 */
export async function approveApplication(
  applicationId: string,
  volunteerId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = adminDb();
  const appRef = db.collection('applications').doc(applicationId);
  const volunteerRef = db.collection('volunteers').doc(volunteerId);

  try {
    await db.runTransaction(async (tx) => {
      const [snap, volunteerSnap] = await Promise.all([tx.get(appRef), tx.get(volunteerRef)]);
      if (!snap.exists) throw new Error('応募が見つかりません');
      const data = snap.data()!;
      if (data.status !== 'pending') {
        throw new Error('承認できるのは「参加承認待ち」の応募のみです');
      }
      const volunteerTitle: string = volunteerSnap.exists ? (volunteerSnap.data()!.title ?? '') : '';
      const targetSnap = await tx.get(db.collection('users').doc(data.userId));
      const targetName: string = targetSnap.exists ? (targetSnap.data()!.fullName ?? '') : '';

      tx.update(appRef, {
        status: 'approved',
        approvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        newActivityLogRef(),
        buildActivityLog({
          type: 'application_approved',
          actorId: admin.id,
          actorName: admin.fullName,
          actorRole: 'admin',
          targetUserId: data.userId,
          volunteerId,
          volunteerTitle,
          applicationId,
          message: `${admin.fullName}さん（管理者）が${targetName}さんの「${volunteerTitle}」への参加を承認しました`,
        }),
      );
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : '承認に失敗しました' };
  }

  revalidatePath(`/admin/volunteers/${volunteerId}/applicants`);
  revalidatePath('/admin/applications');
  return {};
}

/** 応募を却下する（参加承認待ち・参加予定のいずれからも可） */
export async function rejectApplication(
  applicationId: string,
  volunteerId: string,
  note?: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = adminDb();
  const appRef = db.collection('applications').doc(applicationId);
  const volunteerRef = db.collection('volunteers').doc(volunteerId);

  try {
    await db.runTransaction(async (tx) => {
      const [snap, volunteerSnap] = await Promise.all([tx.get(appRef), tx.get(volunteerRef)]);
      if (!snap.exists) throw new Error('応募が見つかりません');
      const data = snap.data()!;
      if (!['pending', 'approved'].includes(data.status)) {
        throw new Error('却下できるのは「参加承認待ち」「参加予定」の応募のみです');
      }

      const volunteerTitle: string = volunteerSnap.exists ? (volunteerSnap.data()!.title ?? '') : '';
      const targetSnap = await tx.get(db.collection('users').doc(data.userId));
      const targetName: string = targetSnap.exists ? (targetSnap.data()!.fullName ?? '') : '';

      tx.update(appRef, {
        status: 'rejected',
        adminNote: note ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(volunteerRef, {
        currentApplicants: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        newActivityLogRef(),
        buildActivityLog({
          type: 'application_rejected',
          actorId: admin.id,
          actorName: admin.fullName,
          actorRole: 'admin',
          targetUserId: data.userId,
          volunteerId,
          volunteerTitle,
          applicationId,
          message: note
            ? `${admin.fullName}さん（管理者）が${targetName}さんの「${volunteerTitle}」への応募を却下しました（理由: ${note}）`
            : `${admin.fullName}さん（管理者）が${targetName}さんの「${volunteerTitle}」への応募を却下しました`,
        }),
      );
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : '却下に失敗しました' };
  }

  revalidatePath(`/admin/volunteers/${volunteerId}/applicants`);
  revalidatePath('/admin/applications');
  return {};
}

/** 「完了承認待ち」→「完了」（ここでポイントを付与する） */
export async function completeApplication(
  applicationId: string,
  volunteerId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = adminDb();
  const appRef = db.collection('applications').doc(applicationId);
  const volunteerRef = db.collection('volunteers').doc(volunteerId);
  // ドキュメントIDを応募IDと同じにすることで、二重付与を存在チェックだけで防いでいる
  const pointTxRef = db.collection('pointTransactions').doc(applicationId);

  try {
    await db.runTransaction(async (tx) => {
      const [appSnap, volunteerSnap, pointTxSnap] = await Promise.all([
        tx.get(appRef),
        tx.get(volunteerRef),
        tx.get(pointTxRef),
      ]);

      if (!appSnap.exists) throw new Error('応募が見つかりません');
      const app = appSnap.data()!;
      if (app.status !== 'completion_requested') {
        throw new Error('最終承認できるのは「完了承認待ち」の応募のみです');
      }
      if (pointTxSnap.exists) throw new Error('すでにポイントが付与されています');

      const points: number = volunteerSnap.exists ? (volunteerSnap.data()!.points ?? 0) : 0;
      const volunteerTitle: string = volunteerSnap.exists ? (volunteerSnap.data()!.title ?? '') : '';
      const targetSnap = await tx.get(db.collection('users').doc(app.userId));
      const targetName: string = targetSnap.exists ? (targetSnap.data()!.fullName ?? '') : '';

      tx.update(appRef, {
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        awardedPoints: points,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(pointTxRef, {
        userId: app.userId,
        applicationId,
        points,
        reason: 'ボランティア活動完了',
        adjustedBy: null,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(db.collection('users').doc(app.userId), {
        points: FieldValue.increment(points),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        newActivityLogRef(),
        buildActivityLog({
          type: 'completion_approved',
          actorId: admin.id,
          actorName: admin.fullName,
          actorRole: 'admin',
          targetUserId: app.userId,
          volunteerId,
          volunteerTitle,
          applicationId,
          message: `${admin.fullName}さん（管理者）が${targetName}さんの「${volunteerTitle}」完了を承認し、${points}ptを付与しました`,
        }),
      );
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : '完了処理に失敗しました' };
  }

  revalidatePath(`/admin/volunteers/${volunteerId}/applicants`);
  revalidatePath('/admin/applications');
  revalidatePath('/mypage');
  return {};
}

/** 完了報告の差し戻し（誤操作の修正用） */
export async function revertCompletionRequest(
  applicationId: string,
  volunteerId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = adminDb();
  const appRef = db.collection('applications').doc(applicationId);
  const volunteerRef = db.collection('volunteers').doc(volunteerId);

  try {
    await db.runTransaction(async (tx) => {
      const [snap, volunteerSnap] = await Promise.all([tx.get(appRef), tx.get(volunteerRef)]);
      if (!snap.exists) throw new Error('応募が見つかりません');
      const data = snap.data()!;
      if (data.status !== 'completion_requested') {
        throw new Error('差し戻せるのは「完了承認待ち」の応募のみです');
      }
      const volunteerTitle: string = volunteerSnap.exists ? (volunteerSnap.data()!.title ?? '') : '';
      const targetSnap = await tx.get(db.collection('users').doc(data.userId));
      const targetName: string = targetSnap.exists ? (targetSnap.data()!.fullName ?? '') : '';

      tx.update(appRef, {
        status: 'approved',
        completionRequestedAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        newActivityLogRef(),
        buildActivityLog({
          type: 'completion_reverted',
          actorId: admin.id,
          actorName: admin.fullName,
          actorRole: 'admin',
          targetUserId: data.userId,
          volunteerId,
          volunteerTitle,
          applicationId,
          message: `${admin.fullName}さん（管理者）が${targetName}さんの「${volunteerTitle}」完了報告を差し戻しました`,
        }),
      );
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : '差し戻しに失敗しました' };
  }

  revalidatePath(`/admin/volunteers/${volunteerId}/applicants`);
  revalidatePath('/admin/applications');
  return {};
}

/**
 * 「取消承認待ち」→「取消済み」（ここで初めて定員に空きが戻る）。
 * ユーザーからの取消申請を管理者が確認するための操作のため、あえて差し戻し機能は設けていない
 * （必要な場合は却下や個別の対応で行う）。
 */
export async function approveCancellation(
  applicationId: string,
  volunteerId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = adminDb();
  const appRef = db.collection('applications').doc(applicationId);
  const volunteerRef = db.collection('volunteers').doc(volunteerId);

  try {
    await db.runTransaction(async (tx) => {
      const [snap, volunteerSnap] = await Promise.all([tx.get(appRef), tx.get(volunteerRef)]);
      if (!snap.exists) throw new Error('応募が見つかりません');
      const data = snap.data()!;
      if (data.status !== 'cancellation_requested') {
        throw new Error('承認できるのは「取消承認待ち」の応募のみです');
      }
      const volunteerTitle: string = volunteerSnap.exists ? (volunteerSnap.data()!.title ?? '') : '';
      const targetSnap = await tx.get(db.collection('users').doc(data.userId));
      const targetName: string = targetSnap.exists ? (targetSnap.data()!.fullName ?? '') : '';

      tx.update(appRef, { status: 'cancelled', updatedAt: FieldValue.serverTimestamp() });
      tx.update(volunteerRef, {
        currentApplicants: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        newActivityLogRef(),
        buildActivityLog({
          type: 'cancellation_approved',
          actorId: admin.id,
          actorName: admin.fullName,
          actorRole: 'admin',
          targetUserId: data.userId,
          volunteerId,
          volunteerTitle,
          applicationId,
          message: `${admin.fullName}さん（管理者）が${targetName}さんの「${volunteerTitle}」取消を承認しました`,
        }),
      );
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : '取消の承認に失敗しました' };
  }

  revalidatePath(`/admin/volunteers/${volunteerId}/applicants`);
  revalidatePath('/admin/applications');
  revalidatePath('/mypage');
  return {};
}
