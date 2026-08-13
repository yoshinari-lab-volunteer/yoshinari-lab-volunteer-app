'use client';

import { Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary:
    'bg-slate-900 text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-400',
  outline:
    'border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:text-slate-400',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 disabled:bg-rose-300',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-13 px-7 text-base gap-2',
};

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** true にすると <form> の送信中に自動で loading + disabled になる */
  pendingAware?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  pendingAware = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const { pending } = useFormStatus();
  const isLoading = loading || (pendingAware && pending);

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-semibold',
        'transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
