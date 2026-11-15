-- ============================================================
-- WhatsApp Storefront: full database setup for Supabase
-- Run in the Supabase SQL editor (or `psql`). Safe to re-run: it creates
-- what's missing and upgrades older databases in place.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  description text,
  image_urls text[] default '{}',
  category_id uuid references public.categories (id) on delete set null,
  -- "Options" such as sizes. Kept under the original column names so older
  -- databases keep working: is_decant = has options, decant_sizes = list of
  -- {"size_ml": number, "price": number}. The UI labels come from shop settings.
  is_decant boolean default false,
  decant_sizes jsonb,
  in_stock boolean default true,
  created_at timestamptz default now()
);
create index if not exists products_category_idx on public.products (category_id);

-- Stock count. NULL = not tracked (in_stock alone decides).
alter table public.products add column if not exists stock_quantity integer;
do $$ begin
  alter table public.products add constraint products_stock_nonnegative check (stock_quantity is null or stock_quantity >= 0);
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  location text not null default 'Not specified',
  cart_items jsonb not null,
  total numeric(12,2) not null,
  status text not null default 'pending',
  created_at timestamptz default now()
);
alter table public.orders add column if not exists status text not null default 'pending';

-- Shop settings and storefront text (one row, key = 'default').
create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  key text unique not null default 'default',
  store_name text not null,
  logo_url text,
  hero_badge text,
  hero_title text,
  hero_subtitle text,
  cta_primary text,
  cta_secondary text,
  why_title text,
  why_bullets text[] default '{}',
  panel_images text[] default '{}',
  brand_primary text,
  brand_primary_strong text,
  brand_primary_soft text,
  brand_accent text,
  brand_accent_soft text,
  updated_at timestamptz default now()
);
alter table public.site_content add column if not exists currency text not null default 'KES';
alter table public.site_content add column if not exists whatsapp_number text;
alter table public.site_content add column if not exists tagline text;
alter table public.site_content add column if not exists option_label text not null default 'Size';
alter table public.site_content add column if not exists option_unit text not null default '';
alter table public.site_content add column if not exists low_stock_threshold integer not null default 3;

-- Who may use the admin. Being signed in is not enough: the email must be listed here.
--   insert into public.shop_admins (email) values ('you@example.com');
create table if not exists public.shop_admins (
  email text primary key check (email = lower(email))
);

create or replace function public.is_shop_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.shop_admins where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_shop_admin() to anon, authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.site_content enable row level security;
alter table public.shop_admins enable row level security;  -- no policies: not readable through the API

drop policy if exists "Public read categories" on public.categories;
drop policy if exists "Admin manage categories" on public.categories;
drop policy if exists "Public read products" on public.products;
drop policy if exists "Admin manage products" on public.products;
drop policy if exists "Public insert orders" on public.orders;
drop policy if exists "Admin read orders" on public.orders;
drop policy if exists "Admin update orders" on public.orders;
drop policy if exists "Public read site content" on public.site_content;
drop policy if exists "Admin manage site content" on public.site_content;

create policy "Public read categories" on public.categories for select using (true);
create policy "Public read products" on public.products for select using (true);
create policy "Public read site content" on public.site_content for select using (true);

create policy "Admin manage categories" on public.categories
  for all to authenticated using (public.is_shop_admin()) with check (public.is_shop_admin());
create policy "Admin manage products" on public.products
  for all to authenticated using (public.is_shop_admin()) with check (public.is_shop_admin());
create policy "Admin manage site content" on public.site_content
  for all to authenticated using (public.is_shop_admin()) with check (public.is_shop_admin());
create policy "Admin read orders" on public.orders
  for select to authenticated using (public.is_shop_admin());
create policy "Admin update orders" on public.orders
  for update to authenticated using (public.is_shop_admin()) with check (public.is_shop_admin());

-- Shoppers can no longer insert into orders directly (they could send any total).
-- Orders go through place_order() below, which prices them from the database.

-- ============================================================
-- PLACING ORDERS
-- ============================================================
-- p_items: [{"product_id": uuid, "quantity": int, "size": number|null}, ...]
-- Prices come from the products table, never from the browser. Stock is
-- checked and decremented in the same transaction, with the product rows
-- locked, so two shoppers can't both buy the last item.
create or replace function public.place_order(
  p_customer_name text,
  p_phone text,
  p_location text,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  prod public.products%rowtype;
  qty integer;
  size_value numeric;
  unit_price numeric(12,2);
  option_text text;
  lines jsonb := '[]'::jsonb;
  order_total numeric(12,2) := 0;
  new_id uuid;
begin
  if coalesce(trim(p_customer_name), '') = '' or length(p_customer_name) > 100 then
    raise exception 'Please enter your name (up to 100 characters).' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_phone), '') !~ '^[0-9+ ().-]{7,20}$' then
    raise exception 'Please enter a valid phone number.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Your cart is empty.' using errcode = 'P0001';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    qty := (item ->> 'quantity')::integer;
    if qty is null or qty < 1 or qty > 100 then
      raise exception 'Each quantity must be between 1 and 100.' using errcode = 'P0001';
    end if;

    select * into prod from public.products where id = (item ->> 'product_id')::uuid for update;
    if not found then
      raise exception 'An item in your cart is no longer sold. Please remove it and try again.' using errcode = 'P0001';
    end if;
    if not prod.in_stock or prod.stock_quantity = 0 then
      raise exception '% is sold out. Please remove it from your cart.', prod.name using errcode = 'P0001';
    end if;
    if prod.stock_quantity is not null and prod.stock_quantity < qty then
      raise exception 'Only % of % left. Please lower the quantity.', prod.stock_quantity, prod.name using errcode = 'P0001';
    end if;

    size_value := nullif(item ->> 'size', '')::numeric;
    option_text := null;
    unit_price := prod.price;
    if size_value is not null then
      select (s ->> 'price')::numeric into unit_price
        from jsonb_array_elements(coalesce(prod.decant_sizes, '[]'::jsonb)) s
        where (s ->> 'size_ml')::numeric = size_value
        limit 1;
      if unit_price is null then
        raise exception 'That option of % is no longer available.', prod.name using errcode = 'P0001';
      end if;
      option_text := case when size_value = trunc(size_value) then trunc(size_value)::text else size_value::text end;
    end if;

    if prod.stock_quantity is not null then
      update public.products set stock_quantity = stock_quantity - qty where id = prod.id;
    end if;

    order_total := order_total + unit_price * qty;
    lines := lines || jsonb_build_object(
      'product_id', prod.id, 'name', prod.name, 'size', option_text,
      'price', unit_price, 'quantity', qty);
  end loop;

  insert into public.orders (customer_name, phone, location, cart_items, total)
  values (trim(p_customer_name), trim(p_phone), coalesce(nullif(trim(p_location), ''), 'Not specified'), lines, order_total)
  returning id into new_id;

  return jsonb_build_object('id', new_id, 'total', order_total, 'items', lines);
end;
$$;

revoke all on function public.place_order(text, text, text, jsonb) from public;
grant execute on function public.place_order(text, text, text, jsonb) to anon, authenticated;

-- ============================================================
-- STORAGE (product photos and logo)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read product images" on storage.objects;
drop policy if exists "Admin upload product images" on storage.objects;
drop policy if exists "Admin update product images" on storage.objects;
drop policy if exists "Admin delete product images" on storage.objects;

create policy "Public read product images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "Admin upload product images" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_shop_admin());
create policy "Admin update product images" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_shop_admin());
create policy "Admin delete product images" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_shop_admin());
