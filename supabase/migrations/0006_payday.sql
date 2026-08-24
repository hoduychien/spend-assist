-- Cài đặt: ngày nhận lương hàng tháng + thu nhập (lưu trên profiles).
-- Dư nợ đến hạn từ ngày lương tháng này đến trước ngày lương tháng sau
-- được tính vào thu chi của tháng này (logic ở frontend).
-- Chạy trong Supabase Dashboard → SQL Editor, hoặc `supabase db push`.

alter table public.profiles
  add column if not exists payday int check (payday between 1 and 31),
  add column if not exists monthly_income bigint check (monthly_income >= 0);
