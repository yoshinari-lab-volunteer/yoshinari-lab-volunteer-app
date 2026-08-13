import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<Tone, { className: string; Icon: typeof Info }> = {
  info: { className: 'bg-sky-50 text-sky-900 ring-sky-200', Icon: Info },
  success: { className: 'bg-teal-50 text-teal-900 ring-teal-200', Icon: CheckCircle2 },
  warning: { className: 'bg-amber-50 text-amber-900 ring-amber-200', Icon: TriangleAlert },
  error: { className: 'bg-rose-50 text-rose-900 ring-rose-200', Icon: AlertCircle },
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { className: toneClass, Icon } = TONES[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset',
        toneClass,
        className,
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
