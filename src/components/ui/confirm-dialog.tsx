'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, type ButtonProps } from '@/components/ui/button';

/** 破壊的・取り消しにくい操作の前に挟む確認モーダル */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '実行する',
  cancelLabel = 'キャンセル',
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  // open は初期表示では常に false なので、SSR時にここへ到達することはない
  // （document.body への Portal は SSR 中には実行できないため、念のためガードしている）
  if (!open || typeof document === 'undefined') return null;

  const confirmVariant: ButtonProps['variant'] = danger ? 'danger' : 'primary';

  // ヘッダーの backdrop-blur など、祖先要素の CSS（backdrop-filter/filter/transform）が
  // position: fixed の基準を書き換えてしまうことがあるため、document.body 直下に
  // Portal で描画して常にビューポート基準で中央表示されるようにする
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg"
      >
        <p id="confirm-dialog-title" className="font-bold text-slate-900">
          {title}
        </p>
        {description && <p className="mt-1.5 text-sm text-slate-600">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} size="sm" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
