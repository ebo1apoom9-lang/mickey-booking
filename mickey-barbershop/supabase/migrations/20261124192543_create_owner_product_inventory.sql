create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  price numeric(10,2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  category text,
  brand text,
  description text,
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_name_idx on public.products (lower(name));
alter table public.products enable row level security;
grant select, insert, update, delete on public.products to authenticated;
drop policy if exists products_owner_select on public.products;
create policy products_owner_select on public.products for select to authenticated using ((select private.is_owner()));
drop policy if exists products_owner_insert on public.products;
create policy products_owner_insert on public.products for insert to authenticated with check ((select private.is_owner()));
drop policy if exists products_owner_update on public.products;
create policy products_owner_update on public.products for update to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
drop policy if exists products_owner_delete on public.products;
create policy products_owner_delete on public.products for delete to authenticated using ((select private.is_owner()));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists product_images_owner_insert on storage.objects;
create policy product_images_owner_insert on storage.objects for insert to authenticated with check (bucket_id='product-images' and (select private.is_owner()));
drop policy if exists product_images_owner_update on storage.objects;
create policy product_images_owner_update on storage.objects for update to authenticated using (bucket_id='product-images' and (select private.is_owner())) with check (bucket_id='product-images' and (select private.is_owner()));
drop policy if exists product_images_owner_delete on storage.objects;
create policy product_images_owner_delete on storage.objects for delete to authenticated using (bucket_id='product-images' and (select private.is_owner()));
