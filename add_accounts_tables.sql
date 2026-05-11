-- ══════════════════════════════════════
-- HappyWallet — Accounts & Transfers
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════

-- 1. Tabla de cuentas
create table if not exists accounts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  type         text not null check (type in ('efectivo', 'banco', 'ahorro')),
  currency     text not null default 'MXN',
  balance      numeric(14,2) not null default 0,
  has_been_set boolean not null default false,
  created_at   timestamptz default now()
);

-- Seguridad a nivel de fila
alter table accounts enable row level security;

create policy "Users can manage their own accounts"
  on accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Columna account_id en expenses (nullable para no romper datos existentes)
alter table expenses
  add column if not exists account_id uuid references accounts(id) on delete set null;

-- 3. Tabla de transferencias
create table if not exists transfers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  from_account_id uuid references accounts(id) on delete cascade,
  to_account_id   uuid references accounts(id) on delete cascade,
  amount          numeric(14,2) not null,
  currency        text not null default 'MXN',
  note            text,
  date            timestamptz default now(),
  created_at      timestamptz default now()
);

-- Seguridad a nivel de fila
alter table transfers enable row level security;

create policy "Users can manage their own transfers"
  on transfers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
