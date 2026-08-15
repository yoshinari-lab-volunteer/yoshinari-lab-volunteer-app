# yoshinari-lab-volunteer-app

愛知県内のボランティア活動を検索・応募できるマッチングアプリです。
Vercel + Firebase + Cloudinary の無料枠のみで運用できるように設計しています。

## 技術構成

- **フロントエンド**: Next.js 16 (App Router) / React 19 / Tailwind CSS v4 / TypeScript
- **バックエンド**: Firebase（Authentication / Firestore）
- **画像保存**: Cloudinary（Firebase Storage は無料プランで利用不可のため採用）
- **フォーム**: React Hook Form + Zod
- **メール送信**: Resend（管理者への通知メール用）

Firestore への読み書きは Next.js サーバー側（`firebase-admin`）からのみ行い、
ブラウザの Firebase SDK は認証（ログイン・新規登録）にのみ使用しています。
設計の背景は [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) の
「アーキテクチャ方針」を参照してください。

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Firebase のセットアップ

**[docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)** の手順に沿って、Firebase プロジェクトの作成・Authentication・Firestore の設定を行ってください。

### 3. Cloudinary のセットアップ（画像保存）

**[docs/CLOUDINARY_SETUP.md](docs/CLOUDINARY_SETUP.md)** の手順に沿って、Cloudinary アカウントを作成してください。

### 4. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` に Firebase・Cloudinary・Resend の値を入力してください（各項目の取得方法は上記のドキュメントを参照）。

### 5. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開いて確認できます。

## ディレクトリ構成

```
src/
├ app/
│  ├ (main)/           … ヘッダー・フッター付きレイアウト
│  │  ├ volunteers/     … 案件一覧・詳細
│  │  ├ mypage/         … マイページ
│  │  └ admin/          … 管理者ダッシュボード（案件管理・応募者管理）
│  ├ (auth)/            … 認証画面用のシンプルなレイアウト（ログイン／新規登録／メール確認など）
│  └ globals.css        … ブランドカラーなどの共通スタイル
├ components/
│  ├ ui/                … 汎用 UI コンポーネント
│  ├ layout/            … ヘッダー・フッターなど
│  ├ volunteers/        … 案件一覧・検索フォームなど
│  ├ mypage/            … プロフィール編集・応募履歴カード
│  └ admin/             … 案件フォーム・応募者承認ボタン・CSV出力など
├ lib/
│  ├ firebase/          … Firebase クライアント（ブラウザ／管理者用）・セッション・データ変換・読み取りクエリ
│  ├ actions/           … Server Actions（認証・応募・案件管理・応募者承認・プロフィール）
│  ├ cloudinary.ts      … 画像アップロード・削除・配信URL最適化（サーバー専用）
│  ├ auth.ts            … ログイン必須ページ・管理者専用ページのガード
│  ├ constants.ts        … 分野・地域・ステータスなどの定義
│  └ utils.ts           … 日付整形・CSV 生成などの共通処理
├ types/firestore.ts     … Firestore のデータ型定義
└ proxy.ts              … 未ログインユーザーの振り分け（Next.js 16 の middleware）

firestore.rules / firestore.indexes.json / firebase.json
                         … Firebase コンソールに適用するセキュリティルール・設定
scripts/seed-firestore.mjs … 動作確認用サンプルデータの投入スクリプト（任意）
docs/                    … セットアップ手順などのドキュメント
```

## 主な機能

### 一般ユーザー
- メールアドレス認証によるユーザー登録・ログイン
- 地域・日付・分野によるボランティア案件の検索
- 応募 → 参加承認 → 活動完了報告 → 完了承認、という 4 段階のステータス管理
- マイページでの登録情報（氏名・電話番号）編集、累積ポイントの確認
- 活動完了時のポイント付与

### 管理者
- 案件の新規作成・編集・公開/非公開の切り替え（画像アップロード込み）
- 案件ごとの応募者一覧（氏名・メールアドレス・電話番号）の確認
- 参加承認・完了承認（ポイント付与トリガー）・却下・差し戻し
- 応募者データのCSVダウンロード

## デプロイ

Vercel にリポジトリを接続し、`.env.local` と同じ環境変数を Vercel の Environment Variables に設定してください。
