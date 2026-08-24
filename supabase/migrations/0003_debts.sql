-- Dư nợ — các khoản phải trả kèm ngày tới hạn

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount bigint not null check (amount > 0),
  due_date date not null,
  note text,
  paid_at timestamptz, -- null = chưa trả
  created_at timestamptz not null default now()
);

create index debts_user_due_idx on public.debts (user_id, due_date);

alter table public.debts enable row level security;

create policy "debts: own read" on public.debts
  for select using (user_id = (select auth.uid()));
create policy "debts: own insert" on public.debts
  for insert with check (user_id = (select auth.uid()));
create policy "debts: own update" on public.debts
  for update using (user_id = (select auth.uid()));
create policy "debts: own delete" on public.debts
  for delete using (user_id = (select auth.uid()));
