import Link from 'next/link';
import { CalendarDays, MapPin, Sparkles } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const STEPS = [
  { icon: MapPin, title: '探す', body: '地域・日付・分野で絞り込んで、気になる活動を見つけます。' },
  { icon: CalendarDays, title: '参加する', body: '「参加する」を押して申請。管理者の承認で参加が確定します。' },
  { icon: Sparkles, title: '報告する', body: '活動後に完了を報告。管理者の最終承認でポイントが貯まります。' },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-12 text-white sm:px-10">
        <h1 className="text-2xl font-bold sm:text-3xl">
          やってみたい活動が、きっと見つかる。
        </h1>
        <p className="max-w-xl text-brand-50">
          地域のボランティア活動を探して応募できます。活動を終えるとポイントが貯まります。
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/volunteers">
            <Button size="lg" className="bg-white text-brand-800 hover:bg-brand-50">
              募集中の活動を見る
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">
              はじめての方はこちら
            </Button>
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">参加までの流れ</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <Card className="h-full">
                <CardBody className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                      {i + 1}
                    </span>
                    <Icon className="size-5 text-brand-600" aria-hidden />
                  </div>
                  <p className="font-bold text-slate-900">{title}</p>
                  <p className="text-sm text-slate-600">{body}</p>
                </CardBody>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
