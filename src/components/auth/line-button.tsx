import { cn } from '@/lib/utils';

/**
 * LINE 認証へ移動するボタン。route handler への通常のリンクなので <a> を使う
 * （next/link だと先読み(prefetch)で認証用の state が余計に発行されてしまうため）。
 */
export function LineButton({
  mode,
  label,
  redirectTo,
  className,
}: {
  mode: 'login' | 'link';
  label: string;
  redirectTo?: string;
  className?: string;
}) {
  const params = new URLSearchParams({ mode });
  if (redirectTo) params.set('redirectTo', redirectTo);

  return (
    <a
      href={`/api/auth/line/start?${params.toString()}`}
      className={cn(
        'inline-flex h-11 w-full items-center justify-center rounded-lg px-5 text-[15px] font-semibold',
        'bg-[#06C755] text-white shadow-sm transition-colors hover:bg-[#05b34c] active:bg-[#049f43]',
        className,
      )}
    >
      {label}
    </a>
  );
}

/** 「または」で区切って LINE ボタンを下に置くための仕切り */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-400" role="separator">
      <span className="h-px flex-1 bg-slate-200" />
      または
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
