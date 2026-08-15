import 'server-only';
import { v2 as cloudinary } from 'cloudinary';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const API_KEY = process.env.CLOUDINARY_API_KEY?.trim();
const API_SECRET = process.env.CLOUDINARY_API_SECRET?.trim();

// 環境変数の名前がずれている・値が空、といったケースは "Invalid Signature" という
// わかりにくいエラーになって初めて発覚するため、不足時のみ診断ログを出しておく
// （cloud_name / api_key は秘密情報ではないため、値そのものを出して照合しやすくしている。
//  正常時は毎リクエストのログを汚さないよう、あえて何も出力しない）。
if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error(
    '[cloudinary] 環境変数が不足しています:',
    JSON.stringify({
      CLOUDINARY_CLOUD_NAME: CLOUD_NAME || '(未設定)',
      CLOUDINARY_API_KEY: API_KEY ? `${API_KEY.slice(0, 4)}...(${API_KEY.length}文字)` : '(未設定)',
      CLOUDINARY_API_SECRET: API_SECRET ? `(設定済み・${API_SECRET.length}文字)` : '(未設定)',
    }),
  );
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const FOLDER = 'volunteer-images';

/**
 * Firebase Storage は Spark（無料）プランで利用できない（2026年2月時点、Blazeプラン＋
 * 請求先アカウントの登録が必須）ため、画像保存には Cloudinary（無料枠・クレカ登録不要）を使う。
 * アップロードは常にこのサーバー専用関数経由（管理者用 Server Action）で行い、
 * API シークレットをクライアントに一切渡さない。
 */
export async function uploadVolunteerImage(file: File): Promise<string> {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error(
      'Cloudinaryの環境変数（CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET）が正しく設定されていません。サーバーのログをご確認ください。',
    );
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('対応していない画像形式です（JPEG・PNG・WebPのみアップロードできます）');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('画像サイズは5MB以下にしてください');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: FOLDER,
      resource_type: 'image',
      // アップロード時点で保存サイズの上限を丸めておく（配信時の最適化は optimizedImageUrl で行う）
      transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
    });
    return result.secure_url;
  } catch (err) {
    // Cloudinary の Node SDK は `Error` のインスタンスではなく
    // { message, http_code } という素のオブジェクトで reject することがあり、
    // 呼び出し元の `err instanceof Error` 判定に引っかからず本来のエラー内容が
    // 握りつぶされてしまう。ここで必ず本物の Error に変換して詳細を残す。
    console.error('[cloudinary] アップロードに失敗しました', err);
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : '画像のアップロードに失敗しました（Cloudinaryの設定をご確認ください）';
    throw new Error(message);
  }
}

export async function deleteVolunteerImage(url: string): Promise<void> {
  const publicId = extractPublicId(url);
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId).catch(() => {
    // 削除失敗はアプリの動作をブロックしない（Cloudinary側に画像が残るだけで実害が小さいため）
  });
}

function extractPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
  return match ? match[1] : null;
}

/**
 * 表示用URLに変換する。
 * f_auto: ブラウザに応じて WebP/AVIF などへ自動変換
 * q_auto: 自動的に軽量な品質へ圧縮
 * c_fill,g_auto: 指定サイズへ自動でトリミング（被写体を自動検出）
 */
export function optimizedImageUrl(
  url: string,
  { width, height }: { width: number; height?: number },
): string {
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const size = height ? `,h_${height}` : '';
  const transform = `f_auto,q_auto,c_fill,g_auto,w_${width}${size}`;
  return url.slice(0, idx + marker.length) + transform + '/' + url.slice(idx + marker.length);
}
