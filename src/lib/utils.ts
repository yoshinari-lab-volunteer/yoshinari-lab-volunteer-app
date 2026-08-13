import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isPast, formatDistanceToNowStrict } from 'date-fns';
import { ja } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** '2026-08-14' → '2026年8月14日(金)' */
export function formatDate(value: string | Date) {
  return format(new Date(value), 'yyyy年M月d日(E)', { locale: ja });
}

/** ISO → '8月14日 18:00' */
export function formatDateTime(value: string | Date) {
  return format(new Date(value), 'M月d日 HH:mm', { locale: ja });
}

/** 募集期限の表示。過ぎていれば「締切済み」 */
export function formatDeadline(deadline: string) {
  const d = new Date(deadline);
  if (isPast(d)) return '締切済み';
  return `あと${formatDistanceToNowStrict(d, { locale: ja })}`;
}

export function isDeadlinePassed(deadline: string) {
  return isPast(new Date(deadline));
}

/** 応募できる状態か */
export function canApply(v: {
  status: string;
  deadline: string;
  current_applicants: number;
  max_capacity: number;
}) {
  return (
    v.status === 'published' &&
    !isDeadlinePassed(v.deadline) &&
    v.current_applicants < v.max_capacity
  );
}

/** Postgres の raise exception メッセージをそのままユーザーに見せる */
export function toErrorMessage(error: unknown, fallback = '処理に失敗しました'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) {
    const msg = String((error as { message: unknown }).message);
    // Supabase が付ける接頭辞を落とす
    return msg.replace(/^.*?violates row-level security.*$/i, '権限がありません') || fallback;
  }
  return fallback;
}

/** CSV 用のセルエスケープ。先頭記号は数式インジェクション対策で無害化する */
export function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** 配列を CSV 文字列に。Excel 用に BOM 付き */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((r) => r.map(csvCell).join(',')),
  ];
  return '﻿' + lines.join('\r\n');
}
