-- Danh mục "Dư nợ" — nơi ghi các khoản chi trả nợ

-- Thêm cho mọi user hiện có (bỏ qua nếu đã tự tạo danh mục trùng tên)
insert into public.categories (user_id, name, icon, color, is_default)
select id, 'Dư nợ', 'hand-coins', '#475569', true
from auth.users
on conflict (user_id, name) do nothing;

-- User đăng ký mới cũng có sẵn "Dư nợ"
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
    (new.id, 'Dư nợ',     'hand-coins',  '#475569', true),
    (new.id, 'Khác',      'ellipsis',    '#A16207', true);

  return new;
end;
$$;
