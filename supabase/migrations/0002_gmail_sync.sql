-- Đồng bộ giao dịch từ email thông báo ngân hàng (Gmail → Apps Script → Supabase)

-- Token bí mật để script bên ngoài nhập giao dịch thay user (không cần mật khẩu)
alter table public.profiles
  add column import_token uuid not null default gen_random_uuid();

-- Nguồn giao dịch + id chống trùng (id email Gmail)
alter table public.transactions
  add column source text not null default 'manual',
  add column external_id text;

create unique index transactions_user_external_idx
  on public.transactions (user_id, external_id)
  where external_id is not null;

-- Gọi từ Apps Script qua REST: POST /rest/v1/rpc/import_bank_transaction
-- Xác thực bằng import_token (không phải session), nên dùng security definer.
create or replace function public.import_bank_transaction(
  p_token uuid,
  p_external_id text,
  p_amount bigint,
  p_note text,
  p_occurred_on date
) returns text
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid;
  cat uuid;
begin
  select id into uid from profiles where import_token = p_token;
  if uid is null then
    raise exception 'Token không hợp lệ';
  end if;
  if p_amount is null or p_amount <= 0 then
    return 'skipped';
  end if;

  -- Giao dịch nhập tự động rơi vào "Khác"; user phân loại lại trong app
  select id into cat from categories where user_id = uid and name = 'Khác';

  insert into transactions (user_id, category_id, amount, note, occurred_on, source, external_id)
  values (
    uid, cat, p_amount,
    coalesce(nullif(trim(p_note), ''), 'Chuyển khoản ngân hàng'),
    coalesce(p_occurred_on, current_date),
    'gmail', p_external_id
  )
  on conflict (user_id, external_id) where external_id is not null do nothing;

  if found then
    return 'inserted';
  end if;
  return 'duplicate';
end;
$$;

-- Cho phép user đổi token (thu hồi script cũ)
create or replace function public.rotate_import_token()
returns uuid
language plpgsql
security invoker set search_path = public
as $$
declare
  new_token uuid := gen_random_uuid();
begin
  update profiles set import_token = new_token where id = auth.uid();
  return new_token;
end;
$$;
