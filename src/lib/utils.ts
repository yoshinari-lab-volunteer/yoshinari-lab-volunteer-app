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

/**
 * このアプリは日本国内のみを対象とするため、datetime-local の入力値は常に
 * 日本時間（UTC+9固定。夏時間なし）として解釈・表示する。
 *
 * <input type="datetime-local"> の値はブラウザの実行環境のタイムゾーンで
 * 表示・解釈される一方、Server Action はサーバーの実行環境のタイムゾーンで
 * 同じ文字列を解釈する。Vercel 等サーバーが UTC で動作する環境では、
 * 「ブラウザ（JST）で表示・入力した時刻」と「サーバー（UTC）が保存する時刻」が
 * 9時間ずれてしまうため、両方をこの固定オフセットの変換関数に統一している。
 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 'YYYY-MM-DDTHH:mm'（日本時間として入力された文字列）→ Date */
export function parseJstDatetimeLocal(value: string): Date {
  return new Date(Date.parse(`${value}:00.000Z`) - JST_OFFSET_MS);
}

/** ISO文字列 → <input type="datetime-local"> 用の 'YYYY-MM-DDTHH:mm'（日本時間で表示） */
export function toDatetimeLocalValue(value: string) {
  const d = new Date(new Date(value).getTime() + JST_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** 活動の終了時刻を過ぎているか（終了時刻未設定の場合は開催日の23:59を終了とみなす） */
export function hasVolunteerEnded(v: { eventDate: string; endTime: string | null }): boolean {
  const time = v.endTime ?? '23:59';
  return isPast(new Date(`${v.eventDate}T${time}:00`));
}

/** 応募できる状態か */
export function canApply(v: {
  status: string;
  deadline: string;
  currentApplicants: number;
  maxCapacity: number;
}) {
  return (
    v.status === 'published' &&
    !isDeadlinePassed(v.deadline) &&
    v.currentApplicants < v.maxCapacity
  );
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
