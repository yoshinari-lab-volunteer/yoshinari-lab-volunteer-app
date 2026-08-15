'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Label, Textarea } from '@/components/ui/field';

/**
 * 却下理由を入力してもらう画面中央のモーダル（ブラウザ標準の prompt() だと画面上部に出て使いづらいため）。
 * 呼び出し側で `{rejecting && <RejectDialog ... />}` のように条件付きレンダリングすること。
 * 開くたびに新しいインスタンスとしてマウントされるため、入力欄は毎回空の状態から始まる。
 */
export function RejectDialog({
  loading,
  onCancel,
  onConfirm,
}: {
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reject-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg"
      >
        <p id="reject-dialog-title" className="font-bold text-slate-900">
          この応募を却下しますか？
        </p>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor="reject-note">却下理由（任意・操作履歴に記録されます）</Label>
          <Textarea
            id="reject-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="例: 定員に達したため"
            autoFocus
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            キャンセル
          </Button>
          <Button variant="danger" size="sm" loading={loading} onClick={() => onConfirm(note)}>
            却下する
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
