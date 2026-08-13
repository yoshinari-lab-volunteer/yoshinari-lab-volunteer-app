import type { ApplicationStatus, VolunteerStatus } from '@/types/database.types';

/** 案件の分野。クライアントが増やしたくなったらここに追記するだけ */
export const CATEGORIES = [
  '環境',
  '福祉',
  '子ども',
  '教育',
  '防災',
  'イベント',
  '国際交流',
  '動物',
  'その他',
] as const;

/** 地域（愛知県内を想定） */
export const AREAS = [
  '名古屋市',
  '豊橋市',
  '岡崎市',
  '一宮市',
  '豊田市',
  '春日井市',
  '尾張地域',
  '西三河地域',
  '東三河地域',
  '知多地域',
  'オンライン',
  'その他',
] as const;

type StatusMeta = {
  label: string;
  /** ユーザー向けの補足 */
  hint: string;
  className: string;
};

export const APPLICATION_STATUS: Record<ApplicationStatus, StatusMeta> = {
  pending: {
    label: '参加承認待ち',
    hint: '管理者の承認をお待ちください',
    className: 'bg-amber-100 text-amber-800 ring-amber-200',
  },
  approved: {
    label: '参加予定',
    hint: '活動が終わったら「活動を終了した」を押してください',
    className: 'bg-sky-100 text-sky-800 ring-sky-200',
  },
  completion_requested: {
    label: '完了承認待ち',
    hint: '管理者の最終承認後にポイントが付与されます',
    className: 'bg-violet-100 text-violet-800 ring-violet-200',
  },
  completed: {
    label: '完了',
    hint: 'ポイントが付与されました',
    className: 'bg-teal-100 text-teal-800 ring-teal-200',
  },
  rejected: {
    label: '却下',
    hint: '今回はご参加いただけませんでした',
    className: 'bg-rose-100 text-rose-800 ring-rose-200',
  },
  cancelled: {
    label: '取消済み',
    hint: '応募を取り消しました',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
  },
};

export const VOLUNTEER_STATUS: Record<VolunteerStatus, { label: string; className: string }> = {
  draft: { label: '下書き', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  published: { label: '公開中', className: 'bg-teal-100 text-teal-800 ring-teal-200' },
  closed: { label: '募集終了', className: 'bg-slate-200 text-slate-700 ring-slate-300' },
};

/** 退会の問い合わせ先 */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'admin@example.com';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const SITE_NAME = 'ボランティアひろば';
