# Cloudinary セットアップ手順（画像保存）

Firebase Storage は Spark（無料）プランで利用できない（2026年2月以降、Blazeプラン＋
請求先アカウント登録が必須）ため、団体・案件の画像保存には
**Cloudinary**（無料枠・クレジットカード登録不要）を使用します。

所要 5分程度です。

---

## STEP 1. Cloudinary アカウントを作成する

1. https://cloudinary.com/users/register/free にアクセス
2. メールアドレスで登録（**クレジットカードの入力は不要**）

## STEP 2. API 認証情報を取得する

1. ログイン後の **Dashboard** に、以下の3つがそのまま表示されています

   | 項目 | 例 |
   |---|---|
   | Cloud Name | `dxxxxxxx` |
   | API Key | `123456789012345` |
   | API Secret | `Show` をクリックして表示 |

2. `.env.local` に以下を追加

```
CLOUDINARY_CLOUD_NAME=dxxxxxxx
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> 🔒 `CLOUDINARY_API_SECRET` はサーバー専用のシークレットです（`NEXT_PUBLIC_` を付けないこと）。
> 本アプリでは画像アップロードを常に管理者用の Server Action（`src/lib/cloudinary.ts`）経由で
> 行い、この鍵がブラウザに渡ることはありません。

Vercel にデプロイする際は、同じ3つの環境変数を Vercel の **Environment Variables** にも設定してください。

---

## 動作の仕組み

- 管理者が案件の編集画面で画像を選択すると、Server Action がファイルをサーバー側で受け取り、
  Cloudinary へアップロードします（ブラウザから Cloudinary へ直接アップロードすることはありません）
- アップロード時に **1600×1600px を上限に自動リサイズ**して保存容量を節約します
- 一覧・詳細画面に表示する際は、URLに変換パラメータ（`f_auto,q_auto,c_fill,g_auto,w_◯◯`）を
  付与することで、**閲覧者のブラウザに応じて自動的に WebP/AVIF などの軽量な形式に変換**し、
  表示に必要なサイズだけを配信します（`src/lib/cloudinary.ts` の `optimizedImageUrl()`）
- 画像を削除・差し替えした場合は、Cloudinary 上の古い画像も自動的に削除します

## 無料枠の目安

| 項目 | 無料枠 |
|---|---|
| 保存容量 | 25 GB（クレジット制。目安として） |
| 月間クレジット | 25クレジット/月（変換・配信を含めても、この規模のアプリでは十分な余裕があります） |

数十人規模・案件数十件程度の運用であれば、無料枠を超えることはまずありません。
万一超過した場合も、Cloudinary は自動課金されるプランではないため、
急に高額請求が発生する心配はありません（利用制限がかかるのみです）。
