-- ══════════════════════════════════════
-- HappyWallet — Gastos Recurrentes y Suscripciones
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════

create table if not exists recurring_expenses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade not null,

  -- 'recurring' = el usuario confirma manualmente cada pago
  -- 'subscription' = el gasto se registra automáticamente
  entry_type        text not null check (entry_type in ('recurring', 'subscription')),

  amount            numeric(14,2) not null,
  currency          text not null default 'MXN',
  category          text not null,
  color             text,
  account_id        uuid references accounts(id) on delete set null,
  description       text,
  location          text,

  -- Frecuencia: 'weekly' | 'monthly' | 'yearly'
  frequency         text not null check (frequency in ('weekly', 'monthly', 'yearly')),

  -- Para 'weekly': array de días (0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb)
  days_of_week      integer[],

  -- Para 'monthly': día del mes 1-31
  -- Si el mes no tiene ese día se usa el último día del mes
  day_of_month      integer check (day_of_month between 1 and 31),

  -- Para 'yearly': día y mes específico
  yearly_day        integer check (yearly_day between 1 and 31),
  yearly_month      integer check (yearly_month between 1 and 12),

  is_active         boolean not null default true,
  next_due_date     date,
  last_triggered_at timestamptz,

  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table recurring_expenses enable row level security;

create policy "Users can manage their own recurring expenses"
  on recurring_expenses for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Columnas de notificación para recurrentes en notification_settings
-- (se agregan solo si la tabla ya existe)
alter table notification_settings
  add column if not exists recurring_reminder        boolean not null default true,
  add column if not exists subscription_before_3days boolean not null default true,
  add column if not exists subscription_before_1day  boolean not null default true,
  add column if not exists subscription_charged      boolean not null default true,
  add column if not exists subscription_annual_milestone boolean not null default true,
  add column if not exists subscription_annual_expiry    boolean not null default true;
