import type { Metadata, Viewport } from 'next';
import { getSiteSettings } from '@/lib/firebase/queries';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: {
      default: `${settings.siteName} | ボランティアを探す・応募する`,
      template: `%s | ${settings.siteName}`,
    },
    description: settings.tagline,
    robots: { index: false, follow: false }, // 限定運用のため検索除外。公開する場合は削除
  };
}

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
