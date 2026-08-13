# Supabase セットアップ手順

ダッシュボード上で手動で行う作業をこの順番どおりに実施してください。
所要 15〜20 分程度です。

---

## STEP 1. プロジェクトを作成する

1. https://supabase.com/dashboard にログイン
2. **New project** をクリック
3. 入力内容
   | 項目 | 設定値 |
   |---|---|
   | Name | `yoshinari-lab-volunteer-app` |
   | Database Password | 自動生成 → **必ずパスワードマネージャに保存**（後で確認できません） |
   | Region | **Northeast Asia (Tokyo)** |
   | Plan | Free |
4. **Create new project** → 2分ほど待つ

> ⚠️ **無料枠の注意**: 無料プロジェクトは **7日間まったくアクセスがないと一時停止（pause）** されます。
> 運用期間中は問題ありませんが、開発の合間に1週間空ける場合はダッシュボードから Restore してください。

---

## STEP 2. テーブル・RLS・関数を作成する

1. 左メニュー **SQL Editor** → **New query**
2. `supabase/migrations/0001_init.sql` の **全文をコピー&ペースト**
3. **Run**（`Ctrl + Enter`）
4. `Success. No rows returned` と出れば完了

作成されるもの:

- テーブル: `profiles` / `volunteers` / `applications` / `point_transactions`
- 全テーブルの RLS ポリシー
- サインアップ時に `profiles` を自動作成するトリガー
- ステータス遷移用の RPC（`apply_to_volunteer`、`admin_complete_application` など）

---

## STEP 3. Storage（画像保存用バケット）を作成する

### 方法A: SQL でまとめて作る（推奨・こちらだけでOK）

1. **SQL Editor** → **New query**
2. `supabase/migrations/0002_storage.sql` の全文を貼り付けて **Run**

### 方法B: GUI で作る場合

1. 左メニュー **Storage** → **New bucket**
2. 設定
   - Name: `volunteer-images`
   - **Public bucket: ON**（画像は CDN 配信され、無料枠の帯域を節約できます）
   - Restrict file size: `2 MB`
   - Allowed MIME types: `image/jpeg, image/png, image/webp`
3. **Save**
4. その後 **方法A の SQL** を実行してポリシーだけ適用してください
   （`insert ... on conflict do update` なので二重作成にはなりません）

ポリシーの内容:

| 操作 | 誰が |
|---|---|
| 閲覧 | 誰でも（未ログイン含む） |
| アップロード / 上書き / 削除 | **管理者のみ** |

---

## STEP 4. Auth（メール認証）を設定する

### 4-1. メール確認を有効にする

1. 左メニュー **Authentication** → **Sign In / Providers** → **Email**
2. 設定
   - **Enable Email provider: ON**
   - **Confirm email: ON** ← 初回のメールアドレス認証に必須
   - **Secure email change: ON**（推奨。新旧両方のアドレスに確認メールが飛ぶ）
   - Minimum password length: `8`
3. **Save**

### 4-2. リダイレクト URL を登録する

1. **Authentication** → **URL Configuration**
2. **Site URL**
   - 開発中: `http://localhost:3000`
   - 本番: `https://<あなたのVercelドメイン>`（Vercel デプロイ後に差し替え）
3. **Redirect URLs** に以下を **Add URL** で追加

   ```
   http://localhost:3000/**
   https://<あなたのVercelドメイン>/**
   ```

   > Vercel のプレビューデプロイも使う場合は `https://*-<your-team>.vercel.app/**` も追加

### 4-3. メールテンプレートを日本語化する

**Authentication** → **Emails** → 各テンプレートを編集。

**Confirm signup**（件名: `【ボランティアアプリ】メールアドレスの確認`）

```html
<h2>メールアドレスの確認</h2>
<p>ご登録ありがとうございます。<br />下のボタンをクリックして登録を完了してください。</p>
<p>
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;padding:12px 24px;background:#0d9488;color:#fff;
            border-radius:8px;text-decoration:none;font-weight:bold;">
    メールアドレスを確認する
  </a>
</p>
<p style="color:#666;font-size:12px;">
  このリンクの有効期限は24時間です。心当たりがない場合はこのメールを破棄してください。
</p>
```

**Reset password**（件名: `【ボランティアアプリ】パスワードの再設定`）も同様に
`{{ .ConfirmationURL }}` を使って日本語化してください。

### 4-4. ⚠️ メール送信量の制限（重要）

Supabase の**組み込みメール送信は 1時間あたり 2通まで**です。
これは特に設定を変えなくても使えますが、登録が同じ時間帯に集中すると送信が遅延・失敗します。

今回は**ドメイン費用をかけない**方針のため、ユーザー向けの認証メール（新規登録確認・パスワード再設定）は
**Supabase の組み込みメール送信をそのまま使用**します（追加の登録・設定は不要です）。

> ⚠️ 独自ドメインなしで使える Resend の送信元アドレス（`onboarding@resend.dev`）は、
> **Resend アカウントの登録メールアドレス宛にしか送信できません**。
> そのため一般ユーザー向けの確認メールには使えません（ドメイン認証には DNS 設定と、
> ドメイン自体の取得費用が必要になるため、今回は見送ります）。
> 独自ドメインを取得する予定ができた場合は、そのときに Resend のドメイン認証と
> カスタム SMTP への切り替えをご案内します。

**運用上の注意（1時間2通の制限への対応）**

- 数十人規模・半年運用であれば、通常の登録ペースでは問題になりません
- ただし、告知して一斉に登録が集まるような場面（イベント開催など）が想定される場合は、
  管理者から登録リンクを**数人ずつ時間を空けて案内**してください
  （例: 1時間あたり2〜3人ずつグループを分けて案内する）
- 万一「確認メールが届かない」という問い合わせが増える場合は、
  STEP 4-1 の **Confirm email を OFF** にして「メール確認なしの即時登録」へ切り替える
  運用も可能です（その場合はなりすまし登録を防ぐため、管理者が手動で招待する運用と
  組み合わせることを推奨します。ご希望があればご相談ください）

---

## STEP 5. 環境変数を取得して `.env.local` を作る

1. **Project Settings** → **API Keys**
2. 以下をコピー

   | ダッシュボード上の名前 | `.env.local` のキー |
   |---|---|
   | Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
   | `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

3. プロジェクトルートの `.env.example` を `.env.local` にコピーして値を貼り付け

```bash
cp .env.example .env.local
```

> 🔒 `service_role` キーは **RLS をすべて無視する管理者キー**です。
> `NEXT_PUBLIC_` を付けない・クライアントコンポーネントで使わない・Git にコミットしない。
> （`.gitignore` に `.env*` が入っていることを確認済みです）

---

## STEP 6. 自分を管理者にする

1. まずアプリ（または Supabase の **Authentication → Users → Add user**）から
   **通常どおりサインアップ**してユーザーを1人作る
2. **SQL Editor** で以下を実行（メールアドレスは自分のものに書き換え）

```sql
update public.profiles
   set role = 'admin'
 where email = 'your-email@example.com';

-- 確認
select id, email, full_name, role, is_active from public.profiles;
```

> 管理者の追加・削除は、運用中もこの SQL で行います（管理画面からの権限昇格は、
> 誤操作事故を防ぐためあえて実装していません）。

---

## STEP 7.（任意）サンプルデータを入れる

**SQL Editor** で `supabase/migrations/0003_seed.sql` を実行すると、
動作確認用の案件が3件入ります。本番投入前に削除してください。

```sql
-- サンプルを消したいとき
delete from public.volunteers where org_name in ('NPO法人 うみのわ', '一般社団法人 まちのだいどころ', '〇〇商店会');
```

---

## STEP 8. 設定できたか確認する

**SQL Editor** で実行してください。すべて `true` になれば OK です。

```sql
select
  (select count(*) = 4 from pg_tables
     where schemaname = 'public'
       and tablename in ('profiles','volunteers','applications','point_transactions')
  ) as "テーブル4つ作成済み",
  (select bool_and(rowsecurity) from pg_tables
     where schemaname = 'public'
       and tablename in ('profiles','volunteers','applications','point_transactions')
  ) as "RLS全て有効",
  (select count(*) >= 9 from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('apply_to_volunteer','cancel_application','request_completion',
                        'mark_points_celebrated','admin_approve_application',
                        'admin_reject_application','admin_complete_application',
                        'admin_revert_completion_request','admin_set_user_active')
  ) as "RPC作成済み",
  (select exists (select 1 from storage.buckets where id = 'volunteer-images')) as "バケット作成済み",
  (select exists (select 1 from public.profiles where role = 'admin')) as "管理者が存在";
```

---

## 付録: 通知メールの構成

ユーザーの応募時・完了報告時に管理者へ自動通知します。

| 選択肢 | コスト | 判断 |
|---|---|---|
| **Resend + Next.js Server Action** | 無料（3,000通/月・100通/日） | ✅ **採用**。追加インフラ不要 |
| Supabase Edge Function + DB Webhook | 無料枠内 | 構成が増え、非エンジニアの運用が難しい |
| Vercel Cron で定期ダイジェスト | 無料（Hobby は 1日1回） | リアルタイム性がない |

**必要な作業**:

1. [Resend](https://resend.com) に **管理者（クライアント）のメールアドレスで**登録（無料枠 3,000通/月）
2. Resend で **API Key** を発行
3. `.env.local` に以下を追加

```
RESEND_API_KEY=re_xxxxxxxxxxxx
ADMIN_NOTIFICATION_EMAIL=admin@example.com   # 通知の宛先。Resend に登録したメールアドレスと同じにすること
MAIL_FROM="ボランティアアプリ <onboarding@resend.dev>"
```

> ドメイン認証をしていない場合、`onboarding@resend.dev` からは
> **Resend アカウントの登録メールアドレス宛にしか届きません**。
> `ADMIN_NOTIFICATION_EMAIL` を Resend 登録時のメールアドレスと同じにしておけば、
> ドメインなし・追加費用なしで管理者通知だけは問題なく運用できます。
