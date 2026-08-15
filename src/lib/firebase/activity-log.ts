import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type { ActivityLogType, UserRole } from '@/types/firestore';

type LogInput = {
  type: ActivityLogType;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  targetUserId: string;
  volunteerId?: string | null;
  volunteerTitle?: string | null;
  applicationId?: string | null;
  message: string;
};

/**
 * 監査ログのドキュメントを作る（書き込みはしない）。
 * 呼び出し元の Firestore トランザクション内で
 * `tx.set(adminDb().collection('activityLogs').doc(), buildActivityLog({...}))`
 * のように使い、状態変更と同じトランザクションでログも確定させる。
 */
export function buildActivityLog(input: LogInput) {
  return {
    type: input.type,
    actorId: input.actorId,
    actorName: input.actorName,
    actorRole: input.actorRole,
    targetUserId: input.targetUserId,
    volunteerId: input.volunteerId ?? null,
    volunteerTitle: input.volunteerTitle ?? null,
    applicationId: input.applicationId ?? null,
    message: input.message,
    createdAt: FieldValue.serverTimestamp(),
  };
}

/** activityLogs コレクションへの新規ドキュメント参照を作る（自動採番ID） */
export function newActivityLogRef() {
  return adminDb().collection('activityLogs').doc();
}
