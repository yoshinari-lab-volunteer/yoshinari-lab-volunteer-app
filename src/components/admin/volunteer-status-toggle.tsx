'use client';

import { useState, useTransition } from 'react';
import { setVolunteerStatus } from '@/lib/actions/volunteers';
import type { VolunteerStatus } from '@/types/firestore';

const NEXT_ACTION: Record<VolunteerStatus, { label: string; next: VolunteerStatus } | null> = {
  draft: { label: '公開する', next: 'published' },
  published: { label: '非公開にする', next: 'draft' },
  closed: { label: '公開に戻す', next: 'published' },
};

export function VolunteerStatusToggle({ id, status }: { id: string; status: VolunteerStatus }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const action = NEXT_ACTION[status];
  if (!action) return null;

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await setVolunteerStatus(id, action.next);
            if (result.error) setError(result.error);
          });
        }}
        className="text-sm font-semibold text-brand-700 hover:underline disabled:opacity-50"
      >
        {action.label}
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
