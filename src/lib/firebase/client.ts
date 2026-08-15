import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * ブラウザ（Client Component）専用。
 * Firestore への直接アクセスはせず、Firebase Auth の操作
 * （ログイン・新規登録・パスワード再設定・メール確認）にのみ使用する。
 * データの読み書きはすべて Server Component / Server Action から
 * firebase-admin 経由で行う（src/lib/firebase/admin.ts）。
 * 画像は Firebase Storage ではなく Cloudinary を使うため storageBucket は設定していない。
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
