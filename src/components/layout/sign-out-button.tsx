'use client';

import { useState, useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { signOutAction } from '@/lib/actions/auth';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function SignOutButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      // クライアントSDK側のセッションも消しておく（消さないと onAuthStateChanged が
      // ログイン中のままになり、次のログイン操作の状態管理がずれる）
      await firebaseSignOut(auth).catch(() => {});
      await signOutAction();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      >
        <LogOut className="size-4" aria-hidden />
        <span className="hidden sm:inline">ログアウト</span>
      </button>

      <ConfirmDialog
        open={confirming}
        title="ログアウトしますか？"
        confirmLabel="ログアウトする"
        loading={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={handleSignOut}
      />
    </>
  );
}
