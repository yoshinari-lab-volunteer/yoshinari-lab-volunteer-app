import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { recordSitePageView } from '@/lib/firebase/tracking';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  await recordSitePageView();

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <Footer />
    </div>
  );
}
