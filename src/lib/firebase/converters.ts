import 'server-only';
import type { DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { DEFAULT_SITE_SETTINGS } from '@/lib/constants';
import type {
  ActivityLog,
  Application,
  PointTransaction,
  SiteSettings,
  UserProfile,
  Volunteer,
} from '@/types/firestore';

type Doc = DocumentSnapshot | QueryDocumentSnapshot;

/** Firestore Timestamp | undefined を ISO 文字列に変換する */
function toIso(value: unknown): string {
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date(0).toISOString();
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null) return null;
  return toIso(value);
}

export function mapUserProfile(doc: Doc): UserProfile {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    email: d.email ?? '',
    fullName: d.fullName ?? '',
    phone: d.phone ?? '',
    role: d.role === 'admin' ? 'admin' : 'user',
    points: d.points ?? 0,
    isActive: d.isActive ?? true,
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
  };
}

export function mapVolunteer(doc: Doc): Volunteer {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    title: d.title ?? '',
    description: d.description ?? '',
    category: d.category ?? '',
    area: d.area ?? '',
    eventDate: d.eventDate ?? '',
    startTime: d.startTime ?? null,
    endTime: d.endTime ?? null,
    location: d.location ?? '',
    points: d.points ?? 0,
    maxCapacity: d.maxCapacity ?? 0,
    currentApplicants: d.currentApplicants ?? 0,
    viewCount: d.viewCount ?? 0,
    deadline: toIso(d.deadline),
    beginnerFriendly: d.beginnerFriendly ?? false,
    status: d.status ?? 'draft',
    orgName: d.orgName ?? '',
    orgDescription: d.orgDescription ?? '',
    // orgImageUrls 導入前に作成された案件は単数形の orgImageUrl しか持たないため、
    // 後方互換として1枚だけの配列に変換する
    orgImageUrls: Array.isArray(d.orgImageUrls)
      ? d.orgImageUrls
      : d.orgImageUrl
        ? [d.orgImageUrl]
        : [],
    createdBy: d.createdBy ?? null,
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
  };
}

export function mapApplication(doc: Doc): Application {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    userId: d.userId ?? '',
    volunteerId: d.volunteerId ?? '',
    status: d.status ?? 'pending',
    appliedAt: toIso(d.appliedAt),
    approvedAt: toIsoOrNull(d.approvedAt),
    cancellationRequestedAt: toIsoOrNull(d.cancellationRequestedAt),
    completionRequestedAt: toIsoOrNull(d.completionRequestedAt),
    completedAt: toIsoOrNull(d.completedAt),
    awardedPoints: d.awardedPoints ?? null,
    celebratedAt: toIsoOrNull(d.celebratedAt),
    adminNote: d.adminNote ?? null,
    surveyComment: d.surveyComment ?? null,
    surveySubmittedAt: toIsoOrNull(d.surveySubmittedAt),
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
  };
}

/**
 * settings/site ドキュメント専用の変換。
 * doc.data() を丸ごと展開すると updatedAt（Firestore Timestamp インスタンス）が
 * 紛れ込み、Server Component から Client Component へ渡す際にシリアライズエラーになるため、
 * 公開する文字列フィールドだけを明示的に取り出す。
 */
export function mapSiteSettings(doc: Doc): SiteSettings {
  const d = doc.data() ?? {};
  return {
    siteName: d.siteName ?? DEFAULT_SITE_SETTINGS.siteName,
    tagline: d.tagline ?? DEFAULT_SITE_SETTINGS.tagline,
    homeHeroTitle: d.homeHeroTitle ?? DEFAULT_SITE_SETTINGS.homeHeroTitle,
    homeHeroDescription: d.homeHeroDescription ?? DEFAULT_SITE_SETTINGS.homeHeroDescription,
    footerDescription: d.footerDescription ?? DEFAULT_SITE_SETTINGS.footerDescription,
    contactEmail: d.contactEmail ?? DEFAULT_SITE_SETTINGS.contactEmail,
  };
}

export function mapPointTransaction(doc: Doc): PointTransaction {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    userId: d.userId ?? '',
    applicationId: d.applicationId ?? null,
    points: d.points ?? 0,
    reason: d.reason ?? '',
    adjustedBy: d.adjustedBy ?? null,
    createdAt: toIso(d.createdAt),
  };
}

export function mapActivityLog(doc: Doc): ActivityLog {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    type: d.type ?? 'application_submitted',
    actorId: d.actorId ?? '',
    actorName: d.actorName ?? '',
    actorRole: d.actorRole === 'admin' ? 'admin' : 'user',
    targetUserId: d.targetUserId ?? '',
    volunteerId: d.volunteerId ?? null,
    volunteerTitle: d.volunteerTitle ?? null,
    applicationId: d.applicationId ?? null,
    message: d.message ?? '',
    createdAt: toIso(d.createdAt),
  };
}
