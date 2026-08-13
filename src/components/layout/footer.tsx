import { Mail } from 'lucide-react';
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-8 text-sm text-slate-500">
        <p className="font-semibold text-slate-700">{SITE_NAME}</p>
        <p>
          退会をご希望の場合、およびご不明な点は管理者までお問い合わせください。
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('【お問い合わせ】退会希望')}`}
          className="inline-flex items-center gap-1.5 font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800"
        >
          <Mail className="size-4" aria-hidden />
          {CONTACT_EMAIL}
        </a>
        <p className="pt-2 text-xs text-slate-400">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </div>
    </footer>
  );
}
