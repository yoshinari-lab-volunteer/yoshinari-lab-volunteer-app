import { cn } from '@/lib/utils';
import { APPLICATION_STATUS, VOLUNTEER_STATUS } from '@/lib/constants';
import type { ApplicationStatus, VolunteerStatus } from '@/types/firestore';

export function Badge({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5',
        'text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
        'bg-slate-100 text-slate-700 ring-slate-200',
        className,
      )}
      {...props}
    />
  );
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = APPLICATION_STATUS[status];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

export function VolunteerStatusBadge({ status }: { status: VolunteerStatus }) {
  const meta = VOLUNTEER_STATUS[status];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

export function PointsBadge({ points }: { points: number }) {
  return (
    <Badge className="bg-amber-100 text-amber-900 ring-amber-200">
      {points.toLocaleString()} pt
    </Badge>
  );
}

export function BeginnerBadge() {
  return <Badge className="bg-brand-100 text-brand-800 ring-brand-200">初心者OK</Badge>;
}
