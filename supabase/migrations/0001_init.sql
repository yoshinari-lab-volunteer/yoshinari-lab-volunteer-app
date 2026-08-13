-- =============================================================================
-- yoshinari-lab-volunteer-app / 初期スキーマ
-- Supabase ダッシュボード > SQL Editor に全文を貼り付けて "Run" してください。
-- 何度実行しても安全（冪等）になるように書いてあります。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. 共通ユーティリティ
-- -----------------------------------------------------------------------------

-- updated_at を自動更新する
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 1. profiles : auth.users と 1:1 のプロフィール
--    email は auth.users からトリガーで同期する（管理画面の応募者一覧で使うため）
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text        not null,
  full_name   text        not null default '',
  phone       text        not null default '',
  role        text        not null default 'user' check (role in ('user', 'admin')),
  points      integer     not null default 0 check (points >= 0),
  is_active   boolean     not null default true,   -- 退会処理: 管理者が false にする
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.profiles          is 'ユーザープロフィール（auth.users と 1:1）';
comment on column public.profiles.points   is '累積獲得ポイント。point_transactions の合計と一致する（RPC 経由でのみ更新）';
comment on column public.profiles.is_active is '退会処理用。false のユーザーは middleware でログアウトさせる';

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. volunteers : ボランティア案件
--    団体情報はマスター化せず、案件ごとにフラットに持つ（要件どおり）
-- -----------------------------------------------------------------------------
create table if not exists public.volunteers (
  id                 uuid primary key default gen_random_uuid(),
  title              text        not null,
  description        text        not null default '',
  category           text        not null,                    -- 分野
  area               text        not null,                    -- 地域
  event_date         date        not null,                    -- 活動日（日付での絞り込みに使用）
  start_time         text,                                    -- '09:00' など。任意
  end_time           text,
  location           text        not null default '',         -- 集合場所
  points             integer     not null default 0 check (points >= 0),
  max_capacity       integer     not null check (max_capacity > 0),
  current_applicants integer     not null default 0 check (current_applicants >= 0),
  deadline           timestamptz not null,                    -- 募集期限
  beginner_friendly  boolean     not null default false,       -- 「初心者OK」バッジ
  status             text        not null default 'draft'
                     check (status in ('draft', 'published', 'closed')),
  org_name           text        not null default '',
  org_description    text        not null default '',
  org_image_url      text,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table  public.volunteers                    is 'ボランティア案件';
comment on column public.volunteers.status             is 'draft=下書き（一般非公開） / published=公開中 / closed=募集終了';
comment on column public.volunteers.current_applicants is 'キャンセル・却下を除く応募者数。トリガーで自動更新（手で触らないこと）';

create index if not exists idx_volunteers_listing
  on public.volunteers (status, event_date);
create index if not exists idx_volunteers_area     on public.volunteers (area);
create index if not exists idx_volunteers_category on public.volunteers (category);

drop trigger if exists trg_volunteers_updated_at on public.volunteers;
create trigger trg_volunteers_updated_at
  before update on public.volunteers
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 3. applications : 応募とステータス進行
--
--   pending              参加承認待ち   ← ユーザーが「参加する」
--   approved             参加予定       ← 管理者が承認
--   completion_requested 完了承認待ち   ← ユーザーが「活動を終了した」
--   completed            完了           ← 管理者が最終承認（ここでポイント付与）
--   rejected             却下           ← 管理者
--   cancelled            取消           ← ユーザー / 管理者
-- -----------------------------------------------------------------------------
create table if not exists public.applications (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles(id)   on delete cascade,
  volunteer_id             uuid not null references public.volunteers(id) on delete cascade,
  status                   text not null default 'pending'
                           check (status in ('pending', 'approved', 'completion_requested',
                                             'completed', 'rejected', 'cancelled')),
  applied_at               timestamptz not null default now(),
  approved_at              timestamptz,
  completion_requested_at  timestamptz,
  completed_at             timestamptz,
  awarded_points           integer,      -- 完了時に確定した付与ポイント（案件のポイントが後で変わっても履歴は不変）
  celebrated_at            timestamptz,  -- ポイント獲得演出を表示済みか
  admin_note               text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (user_id, volunteer_id)          -- 同じ案件への二重応募を禁止
);

comment on table public.applications is '応募。status の遷移は RPC 経由でのみ行う';

create index if not exists idx_applications_volunteer on public.applications (volunteer_id, status);
create index if not exists idx_applications_user      on public.applications (user_id, status);

drop trigger if exists trg_applications_updated_at on public.applications;
create trigger trg_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 4. point_transactions : ポイント付与台帳
--    application_id を UNIQUE にすることで「二重付与」を DB レベルで不可能にする
-- -----------------------------------------------------------------------------
create table if not exists public.point_transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  application_id uuid unique references public.applications(id) on delete set null,
  points         integer not null,
  reason         text    not null default '',
  created_at     timestamptz not null default now()
);

comment on table public.point_transactions is 'ポイント付与履歴。profiles.points はこの合計と一致する';

create index if not exists idx_point_tx_user on public.point_transactions (user_id, created_at desc);


-- -----------------------------------------------------------------------------
-- 5. current_applicants を自動で正しく保つトリガー
-- -----------------------------------------------------------------------------
create or replace function public.sync_volunteer_applicant_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_id  uuid;
begin
  v_ids := array_remove(array[
    case when tg_op in ('UPDATE', 'DELETE') then old.volunteer_id end,
    case when tg_op in ('UPDATE', 'INSERT') then new.volunteer_id end
  ], null);

  foreach v_id in array v_ids loop
    update public.volunteers v
       set current_applicants = (
             select count(*)
               from public.applications a
              where a.volunteer_id = v_id
                and a.status not in ('rejected', 'cancelled')
           )
     where v.id = v_id;
  end loop;

  return null;
end;
$$;

drop trigger if exists trg_applications_sync_count on public.applications;
create trigger trg_applications_sync_count
  after insert or update of status, volunteer_id or delete on public.applications
  for each row execute function public.sync_volunteer_applicant_count();


-- -----------------------------------------------------------------------------
-- 6. auth.users → profiles の自動連携
-- -----------------------------------------------------------------------------

-- サインアップ時に profiles 行を自動作成
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- メールアドレス変更を profiles に同期
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auth_user_email_changed on auth.users;
create trigger trg_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();


-- -----------------------------------------------------------------------------
-- 7. 権限判定ヘルパー
--    SECURITY DEFINER にすることで、profiles の RLS ポリシー内から
--    profiles を参照しても無限再帰しない
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'admin' and is_active
  );
$$;

grant execute on function public.is_admin() to authenticated;


-- =============================================================================
-- 8. Row Level Security
-- =============================================================================
alter table public.profiles           enable row level security;
alter table public.volunteers         enable row level security;
alter table public.applications       enable row level security;
alter table public.point_transactions enable row level security;

-- ---- profiles ---------------------------------------------------------------
drop policy if exists "profiles: 本人または管理者が閲覧" on public.profiles;
create policy "profiles: 本人または管理者が閲覧"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: 本人が更新" on public.profiles;
create policy "profiles: 本人が更新"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles: 管理者が更新" on public.profiles;
create policy "profiles: 管理者が更新"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 列レベル権限：一般ユーザーが自分で role / points / is_active を書き換えるのを防ぐ。
-- （RLS では列単位の制御ができないため、GRANT で縛るのが確実）
revoke update on public.profiles from authenticated;
grant  update (full_name, phone) on public.profiles to authenticated;
-- INSERT / DELETE ポリシーは作らない ＝ 誰も直接 追加/削除 できない
revoke insert, delete on public.profiles from authenticated, anon;

-- ---- volunteers -------------------------------------------------------------
drop policy if exists "volunteers: 公開案件は誰でも閲覧" on public.volunteers;
create policy "volunteers: 公開案件は誰でも閲覧"
  on public.volunteers for select to anon, authenticated
  using (status in ('published', 'closed'));

drop policy if exists "volunteers: 管理者は全件閲覧" on public.volunteers;
create policy "volunteers: 管理者は全件閲覧"
  on public.volunteers for select to authenticated
  using (public.is_admin());

drop policy if exists "volunteers: 管理者のみ作成" on public.volunteers;
create policy "volunteers: 管理者のみ作成"
  on public.volunteers for insert to authenticated
  with check (public.is_admin());

drop policy if exists "volunteers: 管理者のみ更新" on public.volunteers;
create policy "volunteers: 管理者のみ更新"
  on public.volunteers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "volunteers: 管理者のみ削除" on public.volunteers;
create policy "volunteers: 管理者のみ削除"
  on public.volunteers for delete to authenticated
  using (public.is_admin());

-- current_applicants はトリガー専用。管理者にも直接更新させない
revoke update (current_applicants) on public.volunteers from authenticated, anon;

-- ---- applications -----------------------------------------------------------
-- 参照のみ許可。状態遷移はすべて後述の RPC 経由（直接 INSERT/UPDATE は不可）
drop policy if exists "applications: 本人または管理者が閲覧" on public.applications;
create policy "applications: 本人または管理者が閲覧"
  on public.applications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.applications from authenticated, anon;

-- ---- point_transactions -----------------------------------------------------
drop policy if exists "point_transactions: 本人または管理者が閲覧" on public.point_transactions;
create policy "point_transactions: 本人または管理者が閲覧"
  on public.point_transactions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.point_transactions from authenticated, anon;


-- =============================================================================
-- 9. RPC : ステータス遷移はすべてここを通す
--    （検証・行ロック・ポイント付与を 1 トランザクションで実行）
-- =============================================================================

-- ---- ユーザー: 参加する -----------------------------------------------------
create or replace function public.apply_to_volunteer(p_volunteer_id uuid)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_vol     public.volunteers;
  v_count   integer;
  v_app     public.applications;
begin
  if v_user_id is null then
    raise exception 'ログインが必要です' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = v_user_id and is_active) then
    raise exception 'このアカウントは現在ご利用いただけません' using errcode = '42501';
  end if;

  -- 案件行をロックして、定員チェックと INSERT の間の競合を防ぐ
  select * into v_vol from public.volunteers where id = p_volunteer_id for update;
  if not found then
    raise exception '案件が見つかりません';
  end if;

  if v_vol.status <> 'published' then
    raise exception 'この案件は現在応募を受け付けていません';
  end if;

  if v_vol.deadline < now() then
    raise exception '募集期限を過ぎています';
  end if;

  select count(*) into v_count
    from public.applications
   where volunteer_id = p_volunteer_id
     and status not in ('rejected', 'cancelled');

  if v_count >= v_vol.max_capacity then
    raise exception '定員に達しています';
  end if;

  if exists (
    select 1 from public.applications
     where user_id = v_user_id and volunteer_id = p_volunteer_id
       and status not in ('rejected', 'cancelled')
  ) then
    raise exception 'すでに応募済みです';
  end if;

  insert into public.applications (user_id, volunteer_id, status, applied_at)
  values (v_user_id, p_volunteer_id, 'pending', now())
  on conflict (user_id, volunteer_id) do update
    set status      = 'pending',
        applied_at  = now(),
        approved_at = null,
        completion_requested_at = null,
        completed_at = null,
        admin_note  = null
  returning * into v_app;

  return v_app;
end;
$$;

-- ---- ユーザー: 応募を取り消す（管理者承認前のみ） ---------------------------
create or replace function public.cancel_application(p_application_id uuid)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.applications;
begin
  select * into v_app from public.applications
   where id = p_application_id and user_id = auth.uid() for update;

  if not found then
    raise exception '応募が見つかりません' using errcode = '42501';
  end if;

  if v_app.status not in ('pending', 'approved') then
    raise exception 'この応募は取り消せません';
  end if;

  update public.applications
     set status = 'cancelled'
   where id = p_application_id
  returning * into v_app;

  return v_app;
end;
$$;

-- ---- ユーザー: 活動を終了した -----------------------------------------------
create or replace function public.request_completion(p_application_id uuid)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.applications;
begin
  select * into v_app from public.applications
   where id = p_application_id and user_id = auth.uid() for update;

  if not found then
    raise exception '応募が見つかりません' using errcode = '42501';
  end if;

  if v_app.status <> 'approved' then
    raise exception '完了報告できるのは「参加予定」の応募のみです';
  end if;

  update public.applications
     set status = 'completion_requested',
         completion_requested_at = now()
   where id = p_application_id
  returning * into v_app;

  return v_app;
end;
$$;

-- ---- ユーザー: ポイント獲得演出を表示済みにする -----------------------------
create or replace function public.mark_points_celebrated(p_application_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.applications
     set celebrated_at = now()
   where id = any(p_application_ids)
     and user_id = auth.uid()
     and status = 'completed'
     and celebrated_at is null;
$$;

-- ---- 管理者: 参加申請を承認 -------------------------------------------------
create or replace function public.admin_approve_application(p_application_id uuid)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app   public.applications;
  v_vol   public.volunteers;
  v_count integer;
begin
  if not public.is_admin() then
    raise exception '権限がありません' using errcode = '42501';
  end if;

  select * into v_app from public.applications where id = p_application_id for update;
  if not found then
    raise exception '応募が見つかりません';
  end if;
  if v_app.status <> 'pending' then
    raise exception '承認できるのは「参加承認待ち」の応募のみです';
  end if;

  select * into v_vol from public.volunteers where id = v_app.volunteer_id for update;

  select count(*) into v_count
    from public.applications
   where volunteer_id = v_app.volunteer_id
     and status in ('approved', 'completion_requested', 'completed');

  if v_count >= v_vol.max_capacity then
    raise exception '承認済みの人数が定員（%名）に達しています', v_vol.max_capacity;
  end if;

  update public.applications
     set status = 'approved', approved_at = now()
   where id = p_application_id
  returning * into v_app;

  return v_app;
end;
$$;

-- ---- 管理者: 参加申請を却下 -------------------------------------------------
create or replace function public.admin_reject_application(
  p_application_id uuid,
  p_note           text default null
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.applications;
begin
  if not public.is_admin() then
    raise exception '権限がありません' using errcode = '42501';
  end if;

  select * into v_app from public.applications where id = p_application_id for update;
  if not found then
    raise exception '応募が見つかりません';
  end if;
  if v_app.status = 'completed' then
    raise exception '完了済みの応募は却下できません';
  end if;

  update public.applications
     set status = 'rejected', admin_note = p_note
   where id = p_application_id
  returning * into v_app;

  return v_app;
end;
$$;

-- ---- 管理者: 最終承認（★ここで初めてポイントが付与される） -----------------
create or replace function public.admin_complete_application(p_application_id uuid)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app    public.applications;
  v_points integer;
begin
  if not public.is_admin() then
    raise exception '権限がありません' using errcode = '42501';
  end if;

  select * into v_app from public.applications where id = p_application_id for update;
  if not found then
    raise exception '応募が見つかりません';
  end if;
  if v_app.status <> 'completion_requested' then
    raise exception '最終承認できるのは「完了承認待ち」の応募のみです';
  end if;

  select points into v_points from public.volunteers where id = v_app.volunteer_id;
  v_points := coalesce(v_points, 0);

  update public.applications
     set status = 'completed', completed_at = now(), awarded_points = v_points
   where id = p_application_id
  returning * into v_app;

  -- application_id は UNIQUE なので、万一二重に呼ばれてもここで必ず失敗する
  insert into public.point_transactions (user_id, application_id, points, reason)
  values (v_app.user_id, v_app.id, v_points, 'ボランティア活動完了');

  update public.profiles
     set points = points + v_points
   where id = v_app.user_id;

  return v_app;
end;
$$;

-- ---- 管理者: 完了報告を差し戻す（誤報告の修正用） ---------------------------
create or replace function public.admin_revert_completion_request(
  p_application_id uuid,
  p_note           text default null
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.applications;
begin
  if not public.is_admin() then
    raise exception '権限がありません' using errcode = '42501';
  end if;

  select * into v_app from public.applications where id = p_application_id for update;
  if v_app.status <> 'completion_requested' then
    raise exception '差し戻せるのは「完了承認待ち」の応募のみです';
  end if;

  update public.applications
     set status = 'approved', completion_requested_at = null, admin_note = p_note
   where id = p_application_id
  returning * into v_app;

  return v_app;
end;
$$;

-- ---- 管理者: 退会処理（アカウント無効化） -----------------------------------
create or replace function public.admin_set_user_active(p_user_id uuid, p_active boolean)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception '権限がありません' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception '自分自身は無効化できません';
  end if;

  update public.profiles set is_active = p_active where id = p_user_id
  returning * into v_profile;

  return v_profile;
end;
$$;

-- ---- 保守用: current_applicants を全件再計算 --------------------------------
create or replace function public.recount_all_applicants()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.volunteers v
     set current_applicants = coalesce((
           select count(*) from public.applications a
            where a.volunteer_id = v.id
              and a.status not in ('rejected', 'cancelled')
         ), 0);
$$;


-- ---- RPC の実行権限 ---------------------------------------------------------
grant execute on function public.apply_to_volunteer(uuid)               to authenticated;
grant execute on function public.cancel_application(uuid)               to authenticated;
grant execute on function public.request_completion(uuid)               to authenticated;
grant execute on function public.mark_points_celebrated(uuid[])         to authenticated;
grant execute on function public.admin_approve_application(uuid)        to authenticated;
grant execute on function public.admin_reject_application(uuid, text)   to authenticated;
grant execute on function public.admin_complete_application(uuid)       to authenticated;
grant execute on function public.admin_revert_completion_request(uuid, text) to authenticated;
grant execute on function public.admin_set_user_active(uuid, boolean)   to authenticated;

revoke execute on function public.recount_all_applicants() from authenticated, anon;
revoke execute on function public.handle_new_user()        from authenticated, anon;
revoke execute on function public.handle_user_email_change() from authenticated, anon;
revoke execute on function public.sync_volunteer_applicant_count() from authenticated, anon;
