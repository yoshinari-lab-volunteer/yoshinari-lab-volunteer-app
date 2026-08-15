'use server';

import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireProfile } from '@/lib/auth';
import { buildActivityLog, newActivityLogRef } from '@/lib/firebase/activity-log';
import { hasVolunteerEnded } from '@/lib/utils';
import { applicationDocId, NOT_COUNTED_STATUSES } from '@/types/firestore';

type ActionResult = { error?: string };

/**
 * 「参加する」ボタン。Firestore トランザクションで
 *   - 案件が公開中・募集期限内であること
 *   - 定員に空きがあること（volunteers.currentApplicants を同一トランザクションで参照）
 *   - 二重応募でないこと
 * を検証してから、応募ドキュメントの作成と currentApplicants の加算を1回の書き込みで行う。
 * SQL版の apply_to_volunteer RPC（行ロック + 検証）に相当する処理。
 */
export async function applyToVolunteer(volunteerId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const db = adminDb();
  const volunteerRef = db.collection('volunteers').doc(volunteerId);
  const applicationRef = db.collection('applications').doc(applicationDocId(volunteerId, profile.id));

  try {
    await db.runTransaction(async (tx) => {
      const [volunteerSnap, applicationSnap] = await Promise.all([
        tx.get(volunteerRef),
        tx.get(applicationRef),
      ]);

      if (!volunteerSnap.exists) throw new Error('案件が見つかりません');
      const volunteer = volunteerSnap.data()!;

      if (volunteer.status !== 'published') {
        throw new Error('この案件は現在応募を受け付けていません');
      }

      const deadline = volunteer.deadline?.toDate?.() as Date | undefined;
      if (deadline && deadline.getTime() < Date.now()) {
        throw new Error('募集期限を過ぎています');
      }

      const existing = applicationSnap.exists ? applicationSnap.data()! : null;
      const alreadyApplied = existing != null && !NOT_COUNTED_STATUSES.has(existing.status);
      if (alreadyApplied) {
        throw new Error('すでに応募済みです');
      }

      const currentApplicants: number = volunteer.currentApplicants ?? 0;
      const maxCapacity: number = volunteer.maxCapacity ?? 0;
      if (currentApplicants >= maxCapacity) {
        throw new Error('定員に達しています');
      }

      tx.set(applicationRef, {
        userId: profile.id,
        volunteerId,
        status: 'pending',
        appliedAt: FieldValue.serverTimestamp(),
        approvedAt: null,
        cancellationRequestedAt: null,
        completionRequestedAt: null,
        completedAt: null,
        awardedPoints: null,
        celebratedAt: null,
        adminNote: null,
        createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.update(volunteerRef, {
        currentApplicants: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        newActivityLogRef(),
        buildActivityLog({
          type: 'application_submitted',
          actorId: profile.id,
          actorName: profile.fullName,
          actorRole: 'user',
          targetUserId: profile.id,
          volunteerId,
          volunteerTitle: volunteer.title ?? '',
          applicationId: applicationRef.id,
          message: `${profile.fullName}さんが「${volunteer.title}」に応募しました`,
        }),
      );
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : '応募に失敗しました' };
  }

  revalidatePath(`/volunteers/${volunteerId}`);
  return {};
}

/**
 * 「応募を取り消す」ボタン。
 *   - 「参加承認待ち」の段階では、まだ管理者の承認を得ていないため即座に取り消す
 *   - 「参加予定」（管理者承認済み）の段階では、席を確保したままにするため
 *     即取消にはせず「取消承認待ち」に遷移させ、管理者の承認を経てはじめて取消が確定する
 *     （currentApplicants は承認まで減らさない＝席は空けない）
 */
export async function cancelApplication(volunteerId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const db = adminDb();
  const applicationRef = db.collection('applications').doc(applicationDocId(volunteerId, profile.id));
  const volunteerRef = db.collection('volunteers').doc(volunteerId);

  try {
    await db.runTransaction(async (tx) => {
      const [snap, volunteerSnap] = await Promise.all([tx.get(applicationRef), tx.get(volunteerRef)]);
      if (!snap.exists) throw new Error('応募が見つかりません');
      const data = snap.data()!;
      const volunteerTitle: string = volunteerSnap.exists ? (volunteerSnap.data()!.title ?? '') : '';

      if (data.userId !== profile.id) throw new Error('権限がありません');

      if (data.status === 'pending') {
        tx.update(applicationRef, { status: 'cancelled', updatedAt: FieldValue.serverTimestamp() });
        tx.update(volunteerRef, {
          currentApplicants: FieldValue.increment(-1),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.set(
          newActivityLogRef(),
          buildActivityLog({
            type: 'application_cancelled',
            actorId: profile.id,
            actorName: profile.fullName,
            actorRole: 'user',
            targetUserId: profile.id,
            volunteerId,
            volunteerTitle,
            applicationId: applicationRef.id,
            message: `${profile.fullName}さんが「${volunteerTitle}」への応募を取り消しました`,
          }),
        );
      } else if (data.status === 'approved') {
        tx.update(applicationRef, {
          status: 'cancellation_requested',
          cancellationRequestedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.set(
          newActivityLogRef(),
          buildActivityLog({
            type: 'cancellation_requested',
            actorId: profile.id,
            actorName: profile.fullName,
            actorRole: 'user',
            targetUserId: profile.id,
            volunteerId,
            volunteerTitle,
            applicationId: applicationRef.id,
            message: `${profile.fullName}さんが「${volunteerTitle}」の取消を申請しました`,
          }),
        );
      } else {
        throw new Error('この応募は取り消せません');
      }
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : '取り消しに失敗しました' };
  }

  revalidatePath(`/volunteers/${volunteerId}`);
  revalidatePath('/mypage');
  return {};
}

/** 「完了報告をする」ボタン。参加予定 → 完了承認待ち */
export async function requestCompletion(volunteerId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const db = adminDb();
  const applicationRef = db.collection('applications').doc(applicationDocId(volunteerId, profile.id));
  const volunteerRef = db.collection('volunteers').doc(volunteerId);

  try {
    await db.runTransaction(async (tx) => {
      const [snap, volunteerSnap] = await Promise.all([tx.get(applicationRef), tx.get(volunteerRef)]);
      if (!snap.exists) throw new Error('応募が見つかりません');
      const data = snap.data()!;
      const volunteerTitle: string = volunteerSnap.exists ? (volunteerSnap.data()!.title ?? '') : '';

      if (data.userId !== profile.id) throw new Error('権限がありません');
      if (data.status !== 'approved') {
        throw new Error('完了報告できるのは「参加予定」の応募のみです');
      }
      if (!volunteerSnap.exists) throw new Error('案件が見つかりません');
      const volunteer = volunteerSnap.data()!;
      if (!hasVolunteerEnded({ eventDate: volunteer.eventDate ?? '', endTime: volunteer.endTime ?? null })) {
        throw new Error('活動の終了時刻より前は完了報告できません');
      }

      tx.update(applicationRef, {
        status: 'completion_requested',
        completionRequestedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        newActivityLogRef(),
        buildActivityLog({
          type: 'completion_requested',
          actorId: profile.id,
          actorName: profile.fullName,
          actorRole: 'user',
          targetUserId: profile.id,
          volunteerId,
          volunteerTitle,
          applicationId: applicationRef.id,
          message: `${profile.fullName}さんが「${volunteerTitle}」の活動完了を報告しました`,
        }),
      );
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : '完了報告に失敗しました' };
  }

  revalidatePath('/mypage');
  return {};
}
