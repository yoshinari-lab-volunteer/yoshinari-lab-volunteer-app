/**
 * Firestore のデータ型定義。
 *
 * 日時フィールドはすべて ISO 文字列で表現する。
 * Firestore（Admin SDK）の Timestamp 型は Server Component から Client Component へ
 * そのまま props で渡せない（シリアライズ不可）ため、
 * src/lib/firebase/converters.ts で取得時に必ず ISO 文字列へ変換する。
 */

export type ApplicationStatus =
  | 'pending'
  | 'approved'
  | 'cancellation_requested'
  | 'completion_requested'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type VolunteerStatus = 'draft' | 'published' | 'closed';
export type UserRole = 'user' | 'admin';

/**
 * この状態の応募は volunteers.currentApplicants に数えない。
 * applications.ts / admin-applications.ts の両方から参照される単一の定義
 * （以前は2ファイルにそれぞれ複製されており、ステータス追加時に片方だけ
 * 更新されると集計がずれる恐れがあった）。
 */
export const NOT_COUNTED_STATUSES = new Set<ApplicationStatus>(['rejected', 'cancelled']);

/** users/{uid} */
export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  points: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** volunteers/{volunteerId} */
export type Volunteer = {
  id: string;
  title: string;
  description: string;
  category: string;
  area: string;
  /** 'YYYY-MM-DD' */
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string;
  points: number;
  maxCapacity: number;
  currentApplicants: number;
  /** 案件詳細ページの累計閲覧数（管理者のみ確認可能） */
  viewCount: number;
  deadline: string;
  beginnerFriendly: boolean;
  status: VolunteerStatus;
  orgName: string;
  orgDescription: string;
  /** 最大5枚まで。1枚目が一覧のサムネイルに使われる */
  orgImageUrls: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * applications/{volunteerId}_{userId}
 * ドキュメントIDを決定的にすることで「同一案件への二重応募」を
 * Firestore のトランザクション内での存在チェックだけで防げるようにしている。
 */
export type Application = {
  id: string;
  userId: string;
  volunteerId: string;
  status: ApplicationStatus;
  appliedAt: string;
  approvedAt: string | null;
  cancellationRequestedAt: string | null;
  completionRequestedAt: string | null;
  completedAt: string | null;
  awardedPoints: number | null;
  celebratedAt: string | null;
  adminNote: string | null;
  /** 活動完了後にユーザーが入力する感想アンケート */
  surveyComment: string | null;
  surveySubmittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * pointTransactions/{id}
 * 案件完了によるポイント付与の場合は、ドキュメントIDを応募IDと同じにすることで
 * 「同じ応募に対する二重付与」をトランザクション内の存在チェックだけで防げるようにしている
 * （RDB版の UNIQUE 制約に相当）。管理者による手動調整の場合は applicationId が null になり、
 * ドキュメントIDは自動採番（調整ごとに個別のイベントのため、自然な重複防止キーがないため）。
 */
export type PointTransaction = {
  id: string;
  userId: string;
  applicationId: string | null;
  points: number;
  reason: string;
  /** 手動調整の場合のみ: 実行した管理者のuid */
  adjustedBy: string | null;
  createdAt: string;
};

/** 管理者が確認できる操作ログの種類 */
export type ActivityLogType =
  | 'application_submitted'
  | 'application_cancelled'
  | 'cancellation_requested'
  | 'cancellation_approved'
  | 'completion_requested'
  | 'application_approved'
  | 'application_rejected'
  | 'completion_approved'
  | 'completion_reverted'
  | 'points_adjusted'
  | 'user_deactivated'
  | 'user_activated';

/**
 * activityLogs/{autoId}
 * 「誰が・いつ・何をしたか」を管理者が後から確認できるようにするための監査ログ。
 * message は書き込み時点で人が読める日本語文として組み立てて保存する
 * （表示側で構造化データから毎回文言を組み立てる複雑さを避けるため）。
 */
export type ActivityLog = {
  id: string;
  type: ActivityLogType;
  /** 操作を行った人 */
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  /** この操作の影響を受けたユーザー（自分自身の操作の場合は actorId と同じ） */
  targetUserId: string;
  volunteerId: string | null;
  volunteerTitle: string | null;
  applicationId: string | null;
  message: string;
  createdAt: string;
};

export type ApplicationWithVolunteer = Application & { volunteer: Volunteer };
export type ApplicationWithProfile = Application & { profile: UserProfile };
/** 管理画面の横断的な応募一覧（/admin/applications）用: 応募者・案件の両方を含む */
export type ApplicationWithProfileAndVolunteer = Application & {
  profile: UserProfile;
  volunteer: Volunteer;
};

/**
 * settings/site（単一ドキュメント）
 * サイト名・見出し・説明文など、管理者が編集できるサイト全体のテキスト設定。
 */
export type SiteSettings = {
  siteName: string;
  tagline: string;
  homeHeroTitle: string;
  homeHeroDescription: string;
  footerDescription: string;
  contactEmail: string;
};

export function applicationDocId(volunteerId: string, userId: string) {
  return `${volunteerId}_${userId}`;
}
