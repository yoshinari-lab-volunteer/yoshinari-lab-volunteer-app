import { ShieldCheck, User } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateTime, cn } from '@/lib/utils';
import type { ActivityLog } from '@/types/firestore';

export function ActivityLogList({ logs }: { logs: ActivityLog[] }) {
  if (logs.length === 0) {
    return <EmptyState title="まだ操作履歴がありません" />;
  }

  return (
    <ol className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <span
            className={cn(
              'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
              log.actorRole === 'admin'
                ? 'bg-brand-100 text-brand-700'
                : 'bg-slate-100 text-slate-500',
            )}
          >
            {log.actorRole === 'admin' ? (
              <ShieldCheck className="size-4" aria-hidden />
            ) : (
              <User className="size-4" aria-hidden />
            )}
          </span>
          <div className="space-y-0.5">
            <p className="text-sm text-slate-800">{log.message}</p>
            <p className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
