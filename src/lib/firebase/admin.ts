import 'server-only';
import { cert, getApps, getApp, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * サーバー専用の管理者SDK。Firestore のセキュリティルールをすべて無視する。
 * このアプリでは「クライアントは Firebase Auth のみ使用し、データの読み書きは
 * すべてこの Admin SDK 経由でサーバー側から行う」方針を取っている
 * （詳細は docs/FIREBASE_SETUP.md の「アーキテクチャ方針」を参照）。
 * クライアントコンポーネントから絶対に import しないこと（'server-only' で防いでいる）。
 *
 * 画像保存は Firebase Storage ではなく Cloudinary を使っている
 * （Firebase Storage は Spark プランで利用不可のため。詳細は docs/CLOUDINARY_SETUP.md）。
 */
function getAdminApp(): App {
  if (getApps().length) return getApp();

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!privateKey || !projectId || !clientEmail) {
    throw new Error(
      'Firebase の管理者用環境変数（FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY）が設定されていません',
    );
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}
