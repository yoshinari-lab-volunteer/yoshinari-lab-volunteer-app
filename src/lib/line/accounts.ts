import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * lineAccounts/{LINEユーザーID} = { uid, linkedAt }
 * LINEアカウント → 会員(uid) の対応表。ドキュメントIDをLINEのユーザーIDにすることで、
 * 「同じLINEアカウントが複数の会員に連携される」ことをトランザクション内の存在チェックだけで防ぐ。
 * 会員側にも users/{uid}.lineUserId を持たせ、マイページでの連携状況の表示に使う。
 */
const lineAccounts = () => adminDb().collection('lineAccounts');
const users = () => adminDb().collection('users');

export async function findUidByLineUserId(lineUserId: string): Promise<string | null> {
  const snap = await lineAccounts().doc(lineUserId).get();
  return snap.exists ? (snap.data()!.uid as string) : null;
}

export type LinkResult =
  | 'linked'
  /** すでにこの会員と連携済み */
  | 'already'
  /** このLINEアカウントは別の会員に連携済み */
  | 'taken'
  /** この会員は別のLINEアカウントと連携済み */
  | 'has_other';

/** ログイン中の会員に LINE アカウントを紐付ける */
export async function linkLineAccount(uid: string, lineUserId: string): Promise<LinkResult> {
  const db = adminDb();
  const accountRef = lineAccounts().doc(lineUserId);
  const userRef = users().doc(uid);

  return db.runTransaction(async (tx) => {
    const [accountSnap, userSnap] = await Promise.all([tx.get(accountRef), tx.get(userRef)]);
    if (!userSnap.exists) throw new Error('会員情報が見つかりません');

    if (accountSnap.exists) {
      return accountSnap.data()!.uid === uid ? 'already' : 'taken';
    }
    const currentLineUserId: string | undefined = userSnap.data()!.lineUserId;
    if (currentLineUserId && currentLineUserId !== lineUserId) return 'has_other';

    tx.set(accountRef, { uid, linkedAt: FieldValue.serverTimestamp() });
    tx.update(userRef, { lineUserId, updatedAt: FieldValue.serverTimestamp() });
    return 'linked';
  });
}

/** 会員とLINEアカウントの紐付けを解除する */
export async function unlinkLineAccount(uid: string): Promise<void> {
  const db = adminDb();
  const userRef = users().doc(uid);

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const lineUserId: string | undefined = userSnap.data()?.lineUserId;
    if (!lineUserId) return;

    const accountRef = lineAccounts().doc(lineUserId);
    const accountSnap = await tx.get(accountRef);
    // 対応表が別の会員のものになっていた場合は、他人の連携を消さない
    if (accountSnap.exists && accountSnap.data()!.uid === uid) tx.delete(accountRef);
    tx.update(userRef, { lineUserId: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
  });
}

/**
 * LINEアカウントで新規会員登録する。メールアドレスは持たない会員になる。
 * uid を LINE のユーザーIDから決めることで、二重送信や途中失敗後の再試行でも
 * Firebase Auth のユーザーが重複・孤立しない（作成済みなら再利用する）。
 * すでにそのLINEアカウントが会員に紐付いていれば、新規作成はせずその会員の uid を返す。
 */
export async function registerLineUser(input: {
  lineUserId: string;
  fullName: string;
  phone: string;
}): Promise<string> {
  const existingUid = await findUidByLineUserId(input.lineUserId);
  if (existingUid) return existingUid;

  const uid = `line_${input.lineUserId}`;
  try {
    await adminAuth().createUser({ uid, displayName: input.fullName });
  } catch (err) {
    if ((err as { code?: string }).code !== 'auth/uid-already-exists') throw err;
  }

  await adminDb().runTransaction(async (tx) => {
    const accountRef = lineAccounts().doc(input.lineUserId);
    if ((await tx.get(accountRef)).exists) return;

    tx.set(users().doc(uid), {
      email: '',
      fullName: input.fullName,
      phone: input.phone,
      role: 'user',
      points: 0,
      isActive: true,
      lineUserId: input.lineUserId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(accountRef, { uid, linkedAt: FieldValue.serverTimestamp() });
  });

  return uid;
}
