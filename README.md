# yoshinari-lab-volunteer-app

愛知県内のボランティア活動を検索・応募できるマッチングアプリです。
Vercel + Supabase の無料枠のみで運用できるように設計しています。

## 技術構成

- **フロントエンド**: Next.js 16 (App Router) / React 19 / Tailwind CSS v4 / TypeScript
- **バックエンド**: Supabase（Auth / Postgres / Storage）
- **フォーム**: React Hook Form + Zod
- **メール送信**: Resend（管理者への通知メール用）

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Supabase のセットアップ

**[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)** の手順に沿って、Supabase プロジェクトの作成・テーブル作成・Storage・認証メールの設定を行ってください。

### 3. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` に Supabase・Resend の値を入力してください（各項目の取得方法は `docs/SUPABASE_SETUP.md` を参照）。

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開いて確認できます。

## ディレクトリ構成

```
src/
├ app/
│  ├ (main)/          … ヘッダー・フッター付きレイアウト（一般ページ／マイページ／管理画面）
│  ├ (auth)/           … 認証画面用のシンプルなレイアウト
│  └ globals.css       … ブランドカラーなどの共通スタイル
├ components/
│  ├ ui/               … 汎用 UI コンポーネント
│  └ layout/           … ヘッダー・フッターなど
├ lib/
│  ├ supabase/         … Supabase クライアント（ブラウザ／サーバー／管理者用）
│  ├ actions/          … Server Actions
│  ├ auth.ts           … ログイン必須ページ・管理者専用ページのガード
│  ├ constants.ts       … 分野・地域・ステータスなどの定義
│  └ utils.ts          … 日付整形・CSV 生成などの共通処理
├ types/database.types.ts … DB の型定義
└ proxy.ts             … セッション更新・アクセス制御（Next.js 16 の middleware）

supabase/migrations/    … Supabase に適用する SQL
docs/                    … セットアップ手順などのドキュメント
```

## 主な機能

- メールアドレス認証によるユーザー登録・ログイン
- 地域・日付・分野によるボランティア案件の検索
- 応募 → 参加承認 → 活動完了報告 → 完了承認、という 4 段階のステータス管理
- 活動完了時のポイント付与
- 管理者向けダッシュボード（案件管理・応募者管理・CSV 出力）

## デプロイ

Vercel にリポジトリを接続し、`.env.local` と同じ環境変数を Vercel の Environment Variables に設定してください。
