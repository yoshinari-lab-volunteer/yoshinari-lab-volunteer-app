'use client';

import { useState, useTransition } from 'react';
import { Check, Copy } from 'lucide-react';
import { issueVolunteerEditLink, revokeVolunteerEditLink } from '@/lib/actions/volunteer-edit-links';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { formatDateTime } from '@/lib/utils';
import { SITE_URL } from '@/lib/constants';
import type { VolunteerEditLink } from '@/types/firestore';

export function VolunteerEditLinkPanel({
  volunteerId,
  editLink,
}: {
  volunteerId: string;
  editLink: VolunteerEditLink | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [issued, setIssued] = useState<{ token: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const active = issued ?? (editLink ? { token: editLink.token, email: editLink.email } : null);
  const url = active ? `${SITE_URL}/edit/${active.token}` : null;

  function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await issueVolunteerEditLink(volunteerId, email);
      if (result.error) setError(result.error);
      else if (result.token) {
        setIssued({ token: result.token, email: email.trim() });
        setEmail('');
      }
    });
  }

  function handleRevoke() {
    setError(null);
    startTransition(async () => {
      const result = await revokeVolunteerEditLink(volunteerId);
      if (result.error) setError(result.error);
      else setIssued(null);
    });
  }

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>団体編集リンク</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-sm text-slate-600">
          発行したリンクを知っている人は、ログインなしでこの案件の募集要項（獲得ポイントを除く）を編集できます。
        </p>

        {error && <Alert tone="error">{error}</Alert>}

        {url && active ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              発行先: {active.email}
              {editLink && !issued && `（${formatDateTime(editLink.createdAt)}）`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                {url}
              </code>
              <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                {copied ? 'コピーしました' : 'コピー'}
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-rose-600"
              loading={pending}
              onClick={handleRevoke}
            >
              リンクを無効化する
            </Button>
          </div>
        ) : (
          <form onSubmit={handleIssue} className="flex flex-wrap items-end gap-2">
            <label className="min-w-48 flex-1 space-y-1 text-sm">
              <span className="block font-semibold text-slate-800">担当団体のメールアドレス</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="org@example.com"
                required
              />
            </label>
            <Button type="submit" size="sm" loading={pending}>
              発行する
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
