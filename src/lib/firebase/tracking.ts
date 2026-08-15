import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';

/**
 * 案件詳細ページの累計閲覧数を記録する。
 * 集計目的のベストエフォート処理のため、失敗してもページ表示は継続する。
 */
export async function recordVolunteerView(volunteerId: string): Promise<void> {
  try {
    await adminDb()
      .collection('volunteers')
      .doc(volunteerId)
      .update({ viewCount: FieldValue.increment(1) });
  } catch {
    // 閲覧数の記録失敗はユーザー体験に影響させない
  }
}

/**
 * サイト全体のページビュー数を記録する（siteStats/overview の単一ドキュメント）。
 */
export async function recordSitePageView(): Promise<void> {
  try {
    await adminDb()
      .collection('siteStats')
      .doc('overview')
      .set({ pageViews: FieldValue.increment(1) }, { merge: true });
  } catch {
    // 閲覧数の記録失敗はユーザー体験に影響させない
  }
}
