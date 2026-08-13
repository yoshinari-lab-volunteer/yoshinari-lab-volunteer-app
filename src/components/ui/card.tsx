import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('border-b border-slate-100 px-5 py-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 className={cn('text-lg font-bold text-slate-900', className)} {...props} />;
}

export function CardBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('border-t border-slate-100 bg-slate-50/60 px-5 py-3', className)}
      {...props}
    />
  );
}
