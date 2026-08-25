-- Khoản cố định có thời hạn: end_date = ngày đến hạn thanh toán cuối cùng.
-- NULL = vô thời hạn. Sau tháng chứa end_date, khoản không cần thanh toán nữa
-- (logic ở frontend). Chạy trong Supabase Dashboard → SQL Editor.

alter table public.recurring_items
  add column if not exists end_date date;
