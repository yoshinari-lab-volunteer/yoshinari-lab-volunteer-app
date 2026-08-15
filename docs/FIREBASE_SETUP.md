# Firebase セットアップ手順

ダッシュボード上で手動で行う作業をこの順番どおりに実施してください。
所要 20〜30 分程度です。

---

## STEP 1. Firebase プロジェクトを作成する

1. https://console.firebase.google.com/ にログイン
2. **プロジェクトを追加** をクリック
3. プロジェクト名: `yoshinari-lab-volunteer-app`（任意）
4. Google アナリティクスは **無効のままで問題ありません**（無料枠の節約と、非エンジニア運用の単純化のため）
5. **プロジェクトを作成** → 1分ほど待つ

> 💡 Firebase の無料プラン（**Sparkプラン**）は、クレジットカード登録なしで利用できます。
> このアプリでは Firestore・Authentication のいずれも
> Spark プランの範囲内（後述の無料枠）で収まる設計にしています。
> **Cloud Functions は使いません**（Cloud Functions の利用には Blaze プランへの
> アップグレードとクレジットカード登録が必要になるため、意図的に避けています）。
> 同様の理由で **Cloud Storage for Firebase も使いません**（STEP 5 参照。画像保存には
> クレカ登録不要の Cloudinary を使います）。

---

## STEP 2. Web アプリを登録する（Firebase 設定値の取得）

1. プロジェクトの概要ページ → **`</>`（ウェブ）** アイコンをクリック
2. アプリのニックネーム: `volunteer-app-web`
3. **Firebase Hosting は設定しない**（Vercel を使うため不要。チェックを外したままで OK）
4. **アプリを登録**
5. 表示される `firebaseConfig` の値を控えておきます（STEP 8 で `.env.local` に転記します）

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...", // このアプリでは使いません（STEP 5 参照）。控え不要です
  messagingSenderId: "...",
  appId: "...",
};
```

---

## STEP 3. Authentication（メール/パスワード認証）を設定する

1. 左メニュー **Authentication** → **始める**
2. **Sign-in method** タブ → **メール / パスワード** を選択 → **有効にする** → 保存
3. **Templates** タブで各メールを日本語化（任意ですが推奨）
   - **メールアドレスの確認**: 件名・本文を日本語に編集できます
   - **パスワードの再設定**: 同様に編集
4. **Settings** タブ → **承認済みドメイン** に、Vercel の本番ドメインを追加
   （開発中は `localhost` がデフォルトで登録済みなのでそのままで大丈夫です）

### メール送信量について（Supabase からの移行理由）

Firebase Authentication の組み込みメール送信（デフォルトドメイン
`<プロジェクトID>.firebaseapp.com` を使う方式）は、**無料の Spark プランで1日1,000通**まで
送信できます。追加のドメイン取得や SMTP 設定は一切不要です。

> ⚠️ 一部で「1日1万通」という情報を見かけますが、Firebase 公式ドキュメント
> （[Authentication limits](https://firebase.google.com/docs/auth/limits)）によると
> 正しくは **Spark プラン: 1,000通/日、Blaze プラン: 100,000通/日** です。
> 数十人規模・半年運用であれば 1,000通/日でも十分すぎる余裕があります。

独自ドメインからの送信（`noreply@example.com` のようなアドレス）にしたい場合は
[カスタムドメインの設定](https://firebase.google.com/docs/auth/email-custom-domain)が
別途必要ですが、**ドメイン費用をかけない今回の方針では設定不要**です。

---

## STEP 4. Firestore データベースを作成する

1. 左メニュー **Firestore Database** → **データベースの作成**
2. ロケーション: **`asia-northeast1`（東京）**を選択
   （名古屋からの通信距離・レイテンシと、Vercel の東京リージョンとの組み合わせを考慮）
3. **本番環境モードで開始**を選択（セキュリティルールは後で適用します）
4. **有効にする**

### セキュリティルールを適用する

1. **ルール** タブを開く
2. リポジトリの [`firestore.rules`](../firestore.rules) の中身を**丸ごとコピー&ペースト**
3. **公開**

このルールは「クライアントからの直接アクセスをすべて拒否」という内容です。
理由は次の「アーキテクチャ方針」を参照してください。

### インデックスを作成する（案件検索用）

案件一覧の「地域」「分野」での絞り込みには複合インデックスが必要です。

- **開発中に一番簡単な方法**: 絞り込み検索を実際に試すと、ブラウザのコンソールや
  ターミナルに Firestore からのエラーメッセージとインデックス作成用の**直接リンク**が
  表示されるので、それをクリックするだけで作成できます
- **まとめて作りたい場合**: リポジトリの [`firestore.indexes.json`](../firestore.indexes.json) に
  よく使う組み合わせをあらかじめ定義しています。Firebase CLI を使える場合は

  ```bash
  npm install -g firebase-tools
  firebase login
  firebase deploy --only firestore:indexes --project <プロジェクトID>
  ```

---

## STEP 5. 画像保存について（Firebase Storage は使いません）

> ⚠️ **2026年2月3日以降、Cloud Storage for Firebase の利用には Blaze プラン
> （従量課金プラン・請求先アカウントの登録）が必須**になりました。Spark（無料）プランの
> プロジェクトは Storage バケットに一切アクセスできません
> （[公式ドキュメント](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)）。
>
> そのため本アプリでは団体・案件の画像保存に **Cloudinary**（無料枠・クレジットカード登録不要）を
> 使用しています。設定手順は **[docs/CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md)** を参照してください。
> Firestore・Authentication は引き続き Spark プランのみで完結します。

---

## STEP 6. サーバー用の認証情報（サービスアカウントキー）を発行する

Next.js サーバー（Vercel）から Firestore/Auth を操作するために、
`firebase-admin` 用の秘密鍵が必要です。

1. **プロジェクトの設定**（⚙️ アイコン）→ **サービスアカウント** タブ
2. **新しい秘密鍵の生成** → **キーを生成**
3. JSON ファイルがダウンロードされます。中身は以下のような形です

```json
{
  "project_id": "xxxxx",
  "client_email": "firebase-adminsdk-xxxxx@xxxxx.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

> 🔒 このファイルは **Firestore の全データを読み書きできる管理者用の鍵**です。
> **Git に絶対にコミットしないでください**（`.gitignore` で除外済みです）。
> ダウンロード後は安全な場所に保管し、ローカルのダウンロードフォルダからは削除してください。

---

## STEP 7. 環境変数を設定する

```bash
cp .env.example .env.local
```

`.env.local` に、STEP 2 の `firebaseConfig` と STEP 6 の JSON の値を転記します。

| `.env.local` のキー | 値の取得元 |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `firebaseConfig.apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `firebaseConfig.authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `firebaseConfig.projectId` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `firebaseConfig.messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `firebaseConfig.appId` |
| `FIREBASE_PROJECT_ID` | サービスアカウント JSON の `project_id` |
| `FIREBASE_CLIENT_EMAIL` | サービスアカウント JSON の `client_email` |
| `FIREBASE_PRIVATE_KEY` | サービスアカウント JSON の `private_key`（改行を含む文字列。ダブルクォートで囲んだままコピーしてください） |

> `FIREBASE_PRIVATE_KEY` の中の改行は `\n` という2文字のまま `.env.local` に貼り付けて構いません。
> アプリ側（`src/lib/firebase/admin.ts`）で自動的に本物の改行に変換しています。

Vercel にデプロイする際は、同じ環境変数一式を Vercel の **Environment Variables** にも設定してください
（`FIREBASE_PRIVATE_KEY` は改行込みの値をそのまま貼り付けても Vercel 側で問題なく扱えます）。

---

## STEP 8. 自分を管理者にする

1. サインアップ前に一度アプリで**通常どおり新規登録**し、ユーザーを1人作成する
2. Firebase コンソール → **Firestore Database** → **データ** タブ
3. `users` コレクション → 自分の uid のドキュメントを開く
   （uid は **Authentication** タブのユーザー一覧に表示されている「ユーザー UID」で確認できます）
4. `role` フィールドの値を `"user"` から `"admin"` に**手動で書き換える**

> 管理者への昇格は、誤操作事故を防ぐためあえてアプリの管理画面から
> 行えないようにしています（Supabase 版で SQL Editor から行っていたのと同じ考え方です）。
> 今後、新しい管理者を追加する場合もこの手順（コンソールでの手動編集）で行ってください。

---

## STEP 9.（任意）サンプルデータを投入する

```bash
node scripts/seed-firestore.mjs
```

動作確認用の案件が3件登録されます。本番投入前は Firestore コンソールの
`volunteers` コレクションから該当ドキュメントを削除してください。

---

## STEP 10. 動作確認

```bash
npm run dev
```

`/signup` から新規登録 → 確認メールが届くか → `/login` からログインできるかを確認してください。

---

# アーキテクチャ方針: なぜ Firestore を「サーバー経由のみ」にしたか

Supabase（PostgreSQL）版では、定員チェックやステータス遷移、ポイントの二重付与防止を
**RLS ＋ `SECURITY DEFINER` の RPC（DBの行ロックを使ったトランザクション）**で保証していました。

Firestore にはストアドプロシージャに相当する仕組みがなく、こうした
「複数ドキュメントにまたがる検証つきの原子的な更新」を**セキュリティルールだけで安全に表現するのは
現実的ではありません**（ルールは基本的に1回の書き込みの可否を判定するものであり、
「案件の残り定員を見てから応募を1件だけ追加する」といった競合を伴う処理には向いていません）。

選択肢は主に2つありました。

| 選択肢 | 無料枠 | 採用可否 |
|---|---|---|
| Cloud Functions で同等のトランザクション処理を書く | ❌ **Blaze プラン必須**（従量課金の請求先アカウント登録が必要） | 見送り |
| **Next.js の Server Action から `firebase-admin` で直接 Firestore トランザクションを実行** | ✅ Spark プランのみで完結 | ✅ 採用 |

そのため、本アプリでは以下の方針を取っています。

- **ブラウザの Firebase SDK は Authentication のみに使用**（ログイン・新規登録・パスワード再設定）
- **Firestore への読み書きは、すべて Next.js サーバー側（Server Component / Server Action）から
  `firebase-admin` 経由で行う**（画像は Cloudinary。[docs/CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md) 参照）
- そのため **Firestore セキュリティルールは全拒否**（`firestore.rules`）にできる
  → 「ルールの書き漏らしで情報が漏れる」というクラスの事故が構造的に起きない
- 定員チェックやステータス遷移は `runTransaction()` で実装し、SQL版の RPC と同じ検証ロジックを
  TypeScript で書いている（例: [`src/lib/actions/applications.ts`](../src/lib/actions/applications.ts)）

この方針により、Cloud Functions（＝Blazeプラン）を使わずに Spark プランのみで
「安全な状態遷移」を実現しています。

---

# Firestore データモデル

RDB 版（`profiles` / `volunteers` / `applications` / `point_transactions`）から、
以下のように NoSQL 向けに設計し直しました。

## コレクション構成

```
users/{uid}
volunteers/{volunteerId}
applications/{volunteerId}_{userId}
pointTransactions/{applicationId}
```

### `users/{uid}`（旧 `profiles`）

Firebase Authentication の `uid` をそのままドキュメントIDにする、1:1の関係。

| フィールド | 型 | 備考 |
|---|---|---|
| `email` | string | Auth の email をサインアップ時にコピー |
| `fullName` | string | |
| `phone` | string | |
| `role` | `'user' \| 'admin'` | STEP 8 の手順で手動更新 |
| `points` | number | 累積獲得ポイント |
| `isActive` | boolean | 退会処理用フラグ |
| `createdAt` / `updatedAt` | Timestamp | |

### `volunteers/{volunteerId}`（旧 `volunteers`）

RDB 版と同じくフラット構造（団体情報はマスター化しない）。`volunteerId` は自動採番。

主なフィールド: `title` `description` `category` `area` `eventDate`(`'YYYY-MM-DD'`)
`startTime` `endTime` `location` `points` `maxCapacity` `currentApplicants`
`deadline`(Timestamp) `beginnerFriendly` `status`(`draft/published/closed`)
`orgName` `orgDescription` `orgImageUrl` `createdBy`

### `applications/{volunteerId}_{userId}`（旧 `applications`）

**サブコレクションではなく、トップレベルのフラットなコレクション**にし、
ドキュメントIDを `${volunteerId}_${userId}` という**決定的な文字列**にしています。

#### なぜサブコレクションにしなかったか

このデータには、性質の異なる2方向の参照パターンがあります。

1. マイページ: 「**あるユーザー**が応募したすべての案件」を見る
2. 管理画面: 「**ある案件**に応募したすべてのユーザー」を見る

`volunteers/{id}/applications` のようなサブコレクションにすると (2) は自然に書けますが、
(1) を実現するには **`collectionGroup` クエリ**が必要になり、`users/{id}/applications` に
すると逆に (1) は自然でも (2) が `collectionGroup` 必須になります。
どちらか一方に決めても、もう一方のために結局コレクショングループの理解と
複合インデックス管理が必要になり、複雑さが減りません。

一方、**トップレベルのフラットなコレクション**にして `userId` と `volunteerId` を
両方フィールドとして持たせれば、(1) は `where('userId','==',uid)`、
(2) は `where('volunteerId','==',volunteerId)` という**単純な単一条件クエリ**で
どちらも書けます。さらにドキュメントIDを `${volunteerId}_${userId}` という
決定的な値にすることで、

- 「同じ案件への二重応募」の防止が、クエリ不要の **ID直指定の存在チェック**だけで済む
- SQL版の `unique (user_id, volunteer_id)` 制約と同じ効果を、インデックスなしで実現できる

という利点があり、今回の規模（数十人・半年運用）ではこちらの設計の方が
シンプルで運用上のミスも起きにくいと判断しました。

| フィールド | 型 | 備考 |
|---|---|---|
| `userId` / `volunteerId` | string | |
| `status` | `pending/approved/completion_requested/completed/rejected/cancelled` | |
| `appliedAt` `approvedAt` `completionRequestedAt` `completedAt` | Timestamp \| null | |
| `awardedPoints` | number \| null | 完了時に確定した付与ポイント（案件のポイントが後で変わっても履歴は不変） |
| `celebratedAt` | Timestamp \| null | ポイント獲得演出の表示済みフラグ |
| `adminNote` | string \| null | |

`volunteers.currentApplicants` は、SQL版のようなトリガーの代わりに、
応募のトランザクション内で `FieldValue.increment(1)` を使って同時に更新しています。

### `pointTransactions/{applicationId}`（旧 `point_transactions`）

こちらもドキュメントIDを **`applicationId` と同じ値**にしています。
これにより「同じ応募に対してポイントが2回付与される」事故が、
`pointTransactions/{applicationId}` の**存在チェックだけ**で防げます
（SQL版の `application_id UNIQUE` 制約に相当）。`userId` を集計する際は
`where('userId','==',uid)` で単一条件クエリが可能です。

## RDB 版との対応表

| RDB（Supabase） | Firestore | 備考 |
|---|---|---|
| `profiles` テーブル | `users` コレクション | uid = ドキュメントID |
| `volunteers` テーブル | `volunteers` コレクション | ほぼ同じ構造 |
| `applications` テーブル + `UNIQUE(user_id, volunteer_id)` | `applications` コレクション、ID = `${volunteerId}_{userId}` | UNIQUE制約 → 決定的ID |
| `point_transactions` テーブル + `UNIQUE(application_id)` | `pointTransactions` コレクション、ID = `applicationId` | UNIQUE制約 → 決定的ID |
| RLS ポリシー + `SECURITY DEFINER` RPC | Firestore ルール（全拒否）+ Server Action の `runTransaction()` | 検証ロジックは TypeScript に移動 |
| `current_applicants` 同期トリガー | `FieldValue.increment()` を同一トランザクション内で実行 | |

## 無料枠（Sparkプラン）の目安

| サービス | 無料枠 |
|---|---|
| Firestore | 読み取り 50,000回/日・書き込み 20,000回/日・削除 20,000回/日・保存容量 1GiB |
| Authentication | メール/パスワード認証は無制限（メール送信のみ1,000通/日） |

画像保存（Cloudinary）の無料枠は [docs/CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md) を参照してください。

数十人規模・半年運用であれば、通常の利用でこの無料枠を超えることはまずありません。
