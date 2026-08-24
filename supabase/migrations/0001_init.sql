-- Spend Assist — schema, RLS, default categories, sample data
-- Chạy trong Supabase Dashboard → SQL Editor, hoặc `supabase db push`.

-- ---------------------------------------------------------------------------
-- 1 · Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default 'ellipsis',
  color text not null default '#A16207',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  -- VND không có phần thập phân — lưu số nguyên đồng
  amount bigint not null check (amount > 0),
  note text,
  occurred_on date not null default current_date,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_category_idx on public.transactions (category_id);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- category_id NULL = ngân sách tổng của tháng
  category_id uuid references public.categories (id) on delete cascade,
  month date not null check (date_trunc('month', month) = month),
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now()
);

create unique index budgets_user_cat_month_idx
  on public.budgets (user_id, category_id, month) where category_id is not null;
create unique index budgets_user_total_month_idx
  on public.budgets (user_id, month) where category_id is null;

-- ---------------------------------------------------------------------------
-- 2 · Row Level Security — mỗi user chỉ thấy dữ liệu của mình
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

create policy "profiles: own read" on public.profiles
  for select using (id = (select auth.uid()));
create policy "profiles: own update" on public.profiles
  for update using (id = (select auth.uid()));

create policy "categories: own read" on public.categories
  for select using (user_id = (select auth.uid()));
create policy "categories: own insert" on public.categories
  for insert with check (user_id = (select auth.uid()));
create policy "categories: own update" on public.categories
  for update using (user_id = (select auth.uid()));
create policy "categories: own delete" on public.categories
  for delete using (user_id = (select auth.uid()));

create policy "transactions: own read" on public.transactions
  for select using (user_id = (select auth.uid()));
create policy "transactions: own insert" on public.transactions
  for insert with check (user_id = (select auth.uid()));
create policy "transactions: own update" on public.transactions
  for update using (user_id = (select auth.uid()));
create policy "transactions: own delete" on public.transactions
  for delete using (user_id = (select auth.uid()));

create policy "budgets: own read" on public.budgets
  for select using (user_id = (select auth.uid()));
create policy "budgets: own insert" on public.budgets
  for insert with check (user_id = (select auth.uid()));
create policy "budgets: own update" on public.budgets
  for update using (user_id = (select auth.uid()));
create policy "budgets: own delete" on public.budgets
  for delete using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 3 · Khi user đăng ký: tạo profile + 6 danh mục mặc định
--     (màu đã kiểm tra phân biệt được với người mù màu)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');

  insert into public.categories (user_id, name, icon, color, is_default) values
    (new.id, 'Ăn uống',   'utensils',    '#B45309', true),
    (new.id, 'Di chuyển', 'car',         '#2563EB', true),
    (new.id, 'Hóa đơn',   'receipt',     '#0D9488', true),
    (new.id, 'Mua sắm',   'shopping-bag','#7C3AED', true),
    (new.id, 'Giải trí',  'gamepad',     '#DB2777', true),
    (new.id, 'Khác',      'ellipsis',    '#A16207', true);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4 · Dữ liệu mẫu — gọi từ app: supabase.rpc('seed_sample_data')
--     Chèn giao dịch is_sample = true cho chính user đang đăng nhập.
--     Chạy lại sẽ xóa dữ liệu mẫu cũ trước.
-- ---------------------------------------------------------------------------

create or replace function public.seed_sample_data()
returns void
language plpgsql
security invoker set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m date := date_trunc('month', current_date)::date;
  c_an uuid; c_dichuyen uuid; c_hoadon uuid; c_muasam uuid; c_giaitri uuid; c_khac uuid;
begin
  if uid is null then
    raise exception 'Chưa đăng nhập';
  end if;

  select id into c_an       from categories where user_id = uid and name = 'Ăn uống';
  select id into c_dichuyen from categories where user_id = uid and name = 'Di chuyển';
  select id into c_hoadon   from categories where user_id = uid and name = 'Hóa đơn';
  select id into c_muasam   from categories where user_id = uid and name = 'Mua sắm';
  select id into c_giaitri  from categories where user_id = uid and name = 'Giải trí';
  select id into c_khac     from categories where user_id = uid and name = 'Khác';

  delete from transactions where user_id = uid and is_sample = true;

  insert into transactions (user_id, category_id, amount, note, occurred_on, is_sample) values
    -- Tháng này
    (uid, c_an,       45000,  'Bún bò Huế',                m + 1,               true),
    (uid, c_an,       29000,  'Cà phê sữa đá',             m + 1,               true),
    (uid, c_dichuyen, 32000,  'Grab đi làm',               m + 2,               true),
    (uid, c_an,       120000, 'Đi chợ cuối tuần',          m + 3,               true),
    (uid, c_hoadon,   850000, 'Tiền điện tháng này',       m + 4,               true),
    (uid, c_hoadon,   120000, 'Tiền nước',                 m + 4,               true),
    (uid, c_muasam,   250000, 'Áo thun Uniqlo',            m + 5,               true),
    (uid, c_an,       65000,  'Cơm tấm sườn bì',           m + 6,               true),
    (uid, c_giaitri,  180000, 'Vé xem phim CGV',           m + 7,               true),
    (uid, c_dichuyen, 50000,  'Đổ xăng',                   m + 8,               true),
    (uid, c_hoadon,   300000, 'Internet FPT',              m + 9,               true),
    (uid, c_an,       40000,  'Phở bò tái',                m + 10,              true),
    (uid, c_khac,     100000, 'Mừng sinh nhật đồng nghiệp', m + 10,             true),
    -- Tháng trước
    (uid, c_an,       55000,  'Bánh mì + trà sữa',         m - 20,              true),
    (uid, c_dichuyen, 28000,  'Grab về nhà',               m - 18,              true),
    (uid, c_hoadon,   780000, 'Tiền điện',                 m - 15,              true),
    (uid, c_muasam,   450000, 'Giày chạy bộ',              m - 12,              true),
    (uid, c_giaitri,  99000,  'Spotify + YouTube Premium', m - 10,              true),
    (uid, c_an,       35000,  'Hủ tiếu Nam Vang',          m - 5,               true);

  -- Ngân sách mẫu cho tháng này (bỏ qua nếu đã có)
  insert into budgets (user_id, category_id, month, amount)
  values
    (uid, c_an,       m, 3000000),
    (uid, c_dichuyen, m, 1000000),
    (uid, c_hoadon,   m, 1500000),
    (uid, c_muasam,   m, 1000000),
    (uid, c_giaitri,  m, 500000),
    (uid, null,       m, 8000000)
  on conflict do nothing;
end;
$$;
