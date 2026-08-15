import Link from 'next/link';
import { MailCheck, AlertCircle } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export default function SignupCompletePage() {
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
        <MailCheck className="size-10 text-brand-600" aria-hidden />
        <h1 className="text-lg font-bold text-slate-900">確認メールを送信しました</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          ご入力いただいたメールアドレスに確認メールをお送りしました。
          メール内のリンクをクリックして、登録を完了してください。
        </p>
        <Alert tone="info" className="flex items-start gap-3 bg-blue-50 text-left">
          <AlertCircle className="size-5 shrink-0 text-blue-600 mt-0.5" aria-hidden />
          <div className="text-sm">
            <strong className="text-blue-900">メールが届かない場合</strong>
            <p className="text-blue-800 mt-1">迷惑メール・スパムフォルダをご確認ください。それでも見つからない場合は、管理者までお問い合わせください。</p>
          </div>
        </Alert>
        <Link href="/login">
          <Button variant="outline">ログイン画面へ</Button>
        </Link>
      </CardBody>
    </Card>
  );
}
