import { cn } from '@/lib/utils';

const CONTROL_BASE =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] ' +
  'text-slate-900 placeholder:text-slate-400 shadow-sm ' +
  'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none ' +
  'disabled:bg-slate-50 disabled:text-slate-500 ' +
  'aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-500/20';

export function Input({ className, ...props }: React.ComponentPropsWithRef<'input'>) {
  return <input className={cn(CONTROL_BASE, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(CONTROL_BASE, 'min-h-28 resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return <select className={cn(CONTROL_BASE, 'pr-8', className)} {...props} />;
}

export function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<'label'> & { required?: boolean }) {
  return (
    <label className={cn('block text-sm font-semibold text-slate-800', className)} {...props}>
      {children}
      {required && (
        <span className="ml-1 text-xs font-bold text-rose-600" aria-label="必須">
          必須
        </span>
      )}
    </label>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="text-sm font-medium text-rose-600" role="alert">
      {children}
    </p>
  );
}

/** ラベル + コントロール + エラー をまとめる器 */
export function Field({
  label,
  required,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}
