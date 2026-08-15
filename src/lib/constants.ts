import type { ApplicationStatus, SiteSettings, VolunteerStatus } from '@/types/firestore';

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
  cancellation_requested: {
    label: '取消承認待ち',
    hint: '管理者の承認後に取消が確定します',
    className: 'bg-orange-100 text-orange-800 ring-orange-200',
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
  draft: { label: '非公開（下書き）', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  published: { label: '公開中', className: 'bg-teal-100 text-teal-800 ring-teal-200' },
  closed: { label: '募集終了', className: 'bg-slate-200 text-slate-700 ring-slate-300' },
};

/** 退会の問い合わせ先 */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'admin@example.com';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * サイト名・見出し・説明文の初期値。
 * 実際の表示値は Firestore の settings/site ドキュメント（管理者が /admin/settings から編集）を
 * 優先し、ドキュメントが存在しない・一部フィールドが空の場合にこの値へフォールバックする。
 * （src/lib/firebase/queries.ts の getSiteSettings 参照）
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'ボランティアひろば',
  tagline: '地域・日付・分野からボランティア活動を探して応募できます。活動を終えるとポイントが貯まります。',
  homeHeroTitle: 'やってみたい活動が、きっと見つかる。',
  homeHeroDescription: '地域のボランティア活動を探して応募できます。活動を終えるとポイントが貯まります。',
  footerDescription: '退会をご希望の場合、およびご不明な点は管理者までお問い合わせください。',
  contactEmail: CONTACT_EMAIL,
};
