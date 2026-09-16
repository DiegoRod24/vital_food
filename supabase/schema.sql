create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'operator',
  created_at timestamptz not null default now()
);

create table if not exists public.catalog (
  id text primary key,
  name text not null,
  unit text not null default 'UND',
  category text not null,
  type text not null check (type in ('market','protein')),
  aliases text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  quantity numeric not null default 0,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_type text not null check (order_type in ('market','protein')),
  status text not null default 'draft',
  order_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  stock numeric not null default 0,
  quantity numeric not null default 0
);

create table if not exists public.wastes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product text not null,
  quantity numeric not null,
  unit text not null,
  reason text not null,
  action text not null,
  responsible text,
  photo_url text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.inventory_entries enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wastes enable row level security;

create policy "profiles own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "inventory own" on public.inventory_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "orders own" on public.orders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "order items own" on public.order_items for all using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())) with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "wastes own" on public.wastes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
