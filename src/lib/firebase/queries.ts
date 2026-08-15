import 'server-only';
import { cache } from 'react';
import type { Query } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import {
  mapActivityLog,
  mapApplication,
  mapSiteSettings,
  mapUserProfile,
  mapVolunteer,
} from '@/lib/firebase/converters';
import { applicationDocId } from '@/types/firestore';
import { DEFAULT_SITE_SETTINGS } from '@/lib/constants';
import type {
  ActivityLog,
  Application,
  ApplicationStatus,
  ApplicationWithProfile,
  ApplicationWithProfileAndVolunteer,
  ApplicationWithVolunteer,
  SiteSettings,
  UserProfile,
  Volunteer,
  VolunteerStatus,
} from '@/types/firestore';

export type VolunteerFilter = {
  area?: string;
  /** 'YYYY-MM-DD'。この日以降 */
  dateFrom?: string;
  /** 'YYYY-MM-DD'。この日以前 */
  dateTo?: string;
};

/** 一般ユーザー向けの案件一覧（下書きは含まない） */
export async function listVolunteers(filter: VolunteerFilter = {}): Promise<Volunteer[]> {
  let query: Query = adminDb()
    .collection('volunteers')
    .where('status', 'in', ['published', 'closed']);

  if (filter.area) query = query.where('area', '==', filter.area);
  query = query.orderBy('eventDate', 'asc');

  const snap = await query.get();
  const volunteers = snap.docs.map(mapVolunteer);

  // 日付の絞り込みは件数が少ない前提でアプリ側で行う（複合インデックスを増やさないため）
  return volunteers.filter((v) => {
    if (filter.dateFrom && v.eventDate < filter.dateFrom) return false;
    if (filter.dateTo && v.eventDate > filter.dateTo) return false;
    return true;
  });
}

/**
 * cache() で同一リクエスト内の重複読み取りを防いでいる。
 * 案件詳細ページでは generateMetadata() とページ本体の両方がこの関数を呼ぶため。
 */
export const getVolunteer = cache(async (id: string): Promise<Volunteer | null> => {
  const snap = await adminDb().collection('volunteers').doc(id).get();
  return snap.exists ? mapVolunteer(snap) : null;
});

/** ログインユーザー自身の、指定案件への応募状況 */
export async function getMyApplication(
  volunteerId: string,
  userId: string,
): Promise<Application | null> {
  const snap = await adminDb()
    .collection('applications')
    .doc(applicationDocId(volunteerId, userId))
    .get();
  return snap.exists ? mapApplication(snap) : null;
}

/**
 * 管理画面向け: 案件一覧（新しい順）。status を指定するとその状態のみに絞り込む。
 * 等値フィルタ + 別フィールドでの orderBy は複合インデックスが必要になるため、
 * Firestore 側では orderBy をかけずアプリ側でソートしている。
 */
export async function listAllVolunteersForAdmin(status?: VolunteerStatus): Promise<Volunteer[]> {
  const db = adminDb();
  const query = status
    ? db.collection('volunteers').where('status', '==', status)
    : db.collection('volunteers');

  const snap = await query.get();
  return snap.docs.map(mapVolunteer).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * 管理ダッシュボードの概況。
 * 件数を数えるだけなので、ドキュメント本体を読まずに count() 集計クエリを使う
 * （Firestore の無料枠は読み取り回数課金のため、全件フェッチより安く済む）。
 */
export async function getAdminDashboardStats() {
  const db = adminDb();
  const [publishedCount, draftCount, pendingCount, completionRequestedCount, cancellationRequestedCount] =
    await Promise.all([
      db.collection('volunteers').where('status', '==', 'published').count().get(),
      db.collection('volunteers').where('status', '==', 'draft').count().get(),
      db.collection('applications').where('status', '==', 'pending').count().get(),
      db.collection('applications').where('status', '==', 'completion_requested').count().get(),
      db.collection('applications').where('status', '==', 'cancellation_requested').count().get(),
    ]);

  return {
    publishedCount: publishedCount.data().count,
    draftCount: draftCount.data().count,
    pendingApplications: pendingCount.data().count,
    completionRequestedApplications: completionRequestedCount.data().count,
    cancellationRequestedApplications: cancellationRequestedCount.data().count,
  };
}

/**
 * 管理者向けのアクセス状況。
 * サイト全体の累計ページビューと、案件ごとの累計閲覧数（多い順）を返す。
 */
export async function getSiteAnalytics(): Promise<{
  pageViews: number;
  volunteers: Volunteer[];
}> {
  const db = adminDb();
  const [overviewSnap, volunteersSnap] = await Promise.all([
    db.collection('siteStats').doc('overview').get(),
    db.collection('volunteers').get(),
  ]);

  const pageViews: number = overviewSnap.exists ? (overviewSnap.data()!.pageViews ?? 0) : 0;
  const volunteers = volunteersSnap.docs
    .map(mapVolunteer)
    .sort((a, b) => b.viewCount - a.viewCount);

  return { pageViews, volunteers };
}

/** ログインユーザー自身の応募履歴（案件情報つき、新しい順） */
export async function listMyApplications(userId: string): Promise<ApplicationWithVolunteer[]> {
  const db = adminDb();
  const snap = await db.collection('applications').where('userId', '==', userId).get();
  const applications = snap.docs
    .map(mapApplication)
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  if (applications.length === 0) return [];

  const volunteerRefs = applications.map((a) => db.collection('volunteers').doc(a.volunteerId));
  const volunteerDocs = await db.getAll(...volunteerRefs);
  const volunteerById = new Map(
    volunteerDocs.map((d) => [d.id, d.exists ? mapVolunteer(d) : null]),
  );

  return applications
    .filter((a) => volunteerById.get(a.volunteerId))
    .map((a) => ({ ...a, volunteer: volunteerById.get(a.volunteerId)! }));
}

/** 管理画面向け: 指定案件への応募者一覧（応募者プロフィールつき、新しい順） */
export async function listApplicationsWithProfiles(
  volunteerId: string,
): Promise<ApplicationWithProfile[]> {
  const db = adminDb();
  const snap = await db.collection('applications').where('volunteerId', '==', volunteerId).get();
  const applications = snap.docs
    .map(mapApplication)
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  if (applications.length === 0) return [];

  const userRefs = applications.map((a) => db.collection('users').doc(a.userId));
  const userDocs = await db.getAll(...userRefs);
  const profileById = new Map(userDocs.map((d) => [d.id, d.exists ? mapUserProfile(d) : null]));

  return applications
    .filter((a) => profileById.get(a.userId))
    .map((a) => ({ ...a, profile: profileById.get(a.userId)! }));
}

/**
 * 管理画面向け: 案件を横断して、指定ステータスの応募を一覧する
 * （応募者プロフィール・対象案件つき、新しい順）。
 * /admin/applications で使用。
 */
export async function listApplicationsByStatus(
  status: ApplicationStatus,
): Promise<ApplicationWithProfileAndVolunteer[]> {
  const db = adminDb();
  const snap = await db.collection('applications').where('status', '==', status).get();
  const applications = snap.docs
    .map(mapApplication)
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  if (applications.length === 0) return [];

  const userRefs = applications.map((a) => db.collection('users').doc(a.userId));
  const volunteerRefs = applications.map((a) => db.collection('volunteers').doc(a.volunteerId));
  const [userDocs, volunteerDocs] = await Promise.all([
    db.getAll(...userRefs),
    db.getAll(...volunteerRefs),
  ]);
  const profileById = new Map(userDocs.map((d) => [d.id, d.exists ? mapUserProfile(d) : null]));
  const volunteerById = new Map(
    volunteerDocs.map((d) => [d.id, d.exists ? mapVolunteer(d) : null]),
  );

  return applications
    .filter((a) => profileById.get(a.userId) && volunteerById.get(a.volunteerId))
    .map((a) => ({
      ...a,
      profile: profileById.get(a.userId)!,
      volunteer: volunteerById.get(a.volunteerId)!,
    }));
}

/** 管理画面向け: 全ユーザー一覧（新しい順） */
export async function listAllUsers(): Promise<UserProfile[]> {
  const snap = await adminDb().collection('users').get();
  return snap.docs.map(mapUserProfile).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await adminDb().collection('users').doc(userId).get();
  return snap.exists ? mapUserProfile(snap) : null;
}

/**
 * 管理画面向け: 指定ユーザーに関する操作ログ（本人の操作・管理者による操作の両方、新しい順）。
 * /admin/users/[id] で使用。
 */
export async function listActivityLogsForUser(userId: string): Promise<ActivityLog[]> {
  const snap = await adminDb()
    .collection('activityLogs')
    .where('targetUserId', '==', userId)
    .get();
  return snap.docs.map(mapActivityLog).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * サイト名・見出し・説明文など、管理者が編集できるサイト設定。
 * 未設定のフィールドは DEFAULT_SITE_SETTINGS で補う。
 * cache() で包み、同一リクエスト内（例: ヘッダーとフッターの両方から呼ばれる場合）の
 * 重複読み取りを防いでいる。
 *
 * ヘッダー・フッターなどサイト全体のレイアウトから呼ばれるため、Firestore に
 * 一時的にアクセスできない場合でもサイト全体が落ちないよう、失敗時は
 * デフォルト値にフォールバックする。
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const snap = await adminDb().collection('settings').doc('site').get();
    return snap.exists ? mapSiteSettings(snap) : DEFAULT_SITE_SETTINGS;
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
});
