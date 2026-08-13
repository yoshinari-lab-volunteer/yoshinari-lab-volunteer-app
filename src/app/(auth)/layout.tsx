import Link from 'next/link';
import { HeartHandshake } from 'lucide-react';
import { SITE_NAME } from '@/lib/constants';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-12">
      <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
        <HeartHandshake className="size-7 text-brand-600" aria-hidden />
        <span className="text-xl">{SITE_NAME}</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
