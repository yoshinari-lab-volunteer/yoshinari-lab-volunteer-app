-- =============================================================================
-- Storage : 団体イメージ画像用バケット
-- SQL Editor に貼り付けて実行してください（GUI で作る場合は SUPABASE_SETUP.md 参照）
-- =============================================================================

-- 公開バケットを作成（画像は誰でも閲覧できる ＝ CDN 経由で配信されるので高速・無料枠に優しい）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'volunteer-images',
  'volunteer-images',
  true,
  2097152,                                            -- 2MB 上限
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 閲覧: 誰でも
drop policy if exists "volunteer-images: 誰でも閲覧" on storage.objects;
create policy "volunteer-images: 誰でも閲覧"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'volunteer-images');

-- アップロード / 上書き / 削除: 管理者のみ
drop policy if exists "volunteer-images: 管理者のみアップロード" on storage.objects;
create policy "volunteer-images: 管理者のみアップロード"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'volunteer-images' and public.is_admin());

drop policy if exists "volunteer-images: 管理者のみ更新" on storage.objects;
create policy "volunteer-images: 管理者のみ更新"
  on storage.objects for update to authenticated
  using (bucket_id = 'volunteer-images' and public.is_admin())
  with check (bucket_id = 'volunteer-images' and public.is_admin());

drop policy if exists "volunteer-images: 管理者のみ削除" on storage.objects;
create policy "volunteer-images: 管理者のみ削除"
  on storage.objects for delete to authenticated
  using (bucket_id = 'volunteer-images' and public.is_admin());
