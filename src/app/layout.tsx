import type { Metadata, Viewport } from 'next';
import { SITE_NAME } from '@/lib/constants';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} | ボランティアを探す・応募する`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    '地域・日付・分野からボランティア活動を探して応募できます。活動を終えるとポイントが貯まります。',
  robots: { index: false, follow: false }, // 限定運用のため検索除外。公開する場合は削除
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
