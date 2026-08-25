-- Khoản cố định hàng tháng phải thanh toán (tiền nhà, internet, subscription…).
-- Trạng thái "đã trả tháng X" xác định qua transaction có
-- external_id = 'recurring:<id>:<yyyy-mm>' — không cần bảng phụ.
-- Chạy trong Supabase Dashboard → SQL Editor, hoặc `supabase db push`.

create table public.recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount bigint not null check (amount > 0),
  category_id uuid references public.categories (id) on delete set null,
  -- ngày đến hạn hàng tháng; tháng thiếu ngày dồn về cuối tháng (31 → 28/2)
  due_day int not null check (due_day between 1 and 31),
  note text,
  created_at timestamptz not null default now()
);

alter table public.recurring_items enable row level security;

create policy "recurring: own read" on public.recurring_items
  for select using (user_id = (select auth.uid()));
create policy "recurring: own insert" on public.recurring_items
  for insert with check (user_id = (select auth.uid()));
create policy "recurring: own update" on public.recurring_items
  for update using (user_id = (select auth.uid()));
create policy "recurring: own delete" on public.recurring_items
  for delete using (user_id = (select auth.uid()));
