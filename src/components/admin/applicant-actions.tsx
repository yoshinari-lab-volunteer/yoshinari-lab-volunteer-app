'use client';

import { useState, useTransition } from 'react';
import {
  approveApplication,
  approveCancellation,
  completeApplication,
  rejectApplication,
  revertCompletionRequest,
} from '@/lib/actions/admin-applications';
import { Button } from '@/components/ui/button';
import { RejectDialog } from '@/components/admin/reject-dialog';
import type { ApplicationStatus } from '@/types/firestore';

export function ApplicantActions({
  applicationId,
  volunteerId,
  status,
}: {
  applicationId: string;
  volunteerId: string;
  status: ApplicationStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
    });
  }

  function handleRejectConfirm(note: string) {
    setError(null);
    startTransition(async () => {
      const result = await rejectApplication(applicationId, volunteerId, note || undefined);
      if (result.error) setError(result.error);
      else setRejecting(false);
    });
  }

  return (
    <div className="space-y-1.5 text-right">
      <div className="flex flex-wrap justify-end gap-2">
        {status === 'pending' && (
          <>
            <Button
              size="sm"
              loading={pending}
              onClick={() => run(() => approveApplication(applicationId, volunteerId))}
            >
              承認する
            </Button>
            <Button size="sm" variant="outline" loading={pending} onClick={() => setRejecting(true)}>
              却下する
            </Button>
          </>
        )}

        {status === 'completion_requested' && (
          <>
            <Button
              size="sm"
              loading={pending}
              onClick={() => run(() => completeApplication(applicationId, volunteerId))}
            >
              完了を承認する（ポイント付与）
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={pending}
              onClick={() => run(() => revertCompletionRequest(applicationId, volunteerId))}
            >
              差し戻す
            </Button>
          </>
        )}

        {status === 'cancellation_requested' && (
          <Button
            size="sm"
            loading={pending}
            onClick={() => run(() => approveCancellation(applicationId, volunteerId))}
          >
            取消を承認する
          </Button>
        )}

        {status === 'approved' && (
          <Button size="sm" variant="outline" loading={pending} onClick={() => setRejecting(true)}>
            却下する
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}

      {rejecting && (
        <RejectDialog
          loading={pending}
          onCancel={() => setRejecting(false)}
          onConfirm={handleRejectConfirm}
        />
      )}
    </div>
  );
}
