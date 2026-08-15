'use client';

import { useState, useTransition } from 'react';
import { MessageSquareText, Pencil } from 'lucide-react';
import { submitSurvey } from '@/lib/actions/applications';
import { Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const MAX_LENGTH = 1000;

export function SurveyForm({
  applicationId,
  surveyComment,
}: {
  applicationId: string;
  surveyComment: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(surveyComment ?? '');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitSurvey(applicationId, value);
      if (result.error) setError(result.error);
      else setEditing(false);
    });
  }

  if (!editing && surveyComment) {
    return (
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <MessageSquareText className="size-4" aria-hidden />
            アンケート回答
          </p>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" aria-hidden />
            編集する
          </Button>
        </div>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{surveyComment}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && <Alert tone="error">{error}</Alert>}
      <label className="block text-xs font-semibold text-slate-600">
        活動の感想を教えてください（アンケート）
      </label>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={MAX_LENGTH}
        placeholder="活動を通して感じたこと、良かった点、改善してほしい点などをご自由にお書きください。"
        className="min-h-20 text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">{value.length} / {MAX_LENGTH}</p>
        <div className="flex gap-2">
          {surveyComment && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setValue(surveyComment);
                setError(null);
              }}
            >
              キャンセル
            </Button>
          )}
          <Button type="submit" size="sm" loading={pending}>
            送信する
          </Button>
        </div>
      </div>
    </form>
  );
}
