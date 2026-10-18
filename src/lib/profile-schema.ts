import { z } from 'zod';

/** 会員登録時に入力してもらう氏名・電話番号（メール登録・LINE登録で共通） */
export const newProfileSchema = z.object({
  fullName: z.string().trim().min(1, '氏名を入力してください').max(100),
  phone: z
    .string()
    .trim()
    .min(1, '電話番号を入力してください')
    .regex(/^[0-9-]+$/, '電話番号はハイフンを含む数字で入力してください'),
});
