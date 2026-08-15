'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth';

type ActionResult = { error?: string };

const siteSettingsSchema = z.object({
  siteName: z.string().trim().min(1, 'サイト名を入力してください').max(50),
  tagline: z.string().trim().max(200).default(''),
  homeHeroTitle: z.string().trim().min(1, '見出しを入力してください').max(100),
  homeHeroDescription: z.string().trim().max(300).default(''),
  footerDescription: z.string().trim().max(300).default(''),
  contactEmail: z
    .string()
    .trim()
    .min(1, '問い合わせ先メールアドレスを入力してください')
    .email('メールアドレスの形式が正しくありません'),
});

/** サイト名・見出し・説明文の更新（管理者専用） */
export async function updateSiteSettings(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = siteSettingsSchema.safeParse({
    siteName: formData.get('siteName'),
    tagline: formData.get('tagline') ?? '',
    homeHeroTitle: formData.get('homeHeroTitle'),
    homeHeroDescription: formData.get('homeHeroDescription') ?? '',
    footerDescription: formData.get('footerDescription') ?? '',
    contactEmail: formData.get('contactEmail'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '入力内容を確認してください' };
  }

  await adminDb()
    .collection('settings')
    .doc('site')
    .set({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

  // ヘッダー・フッター・トップページなどサイト全体に影響するため layout ごと再検証する
  revalidatePath('/', 'layout');
  return {};
}
