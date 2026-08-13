'use client';

import { LogOut } from 'lucide-react';
import { useTransition } from 'react';
import { signOut } from '@/lib/actions/auth';

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
    >
      <LogOut className="size-4" aria-hidden />
      <span className="hidden sm:inline">ログアウト</span>
    </button>
  );
}
