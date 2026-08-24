-- Xác thực 2 bước qua email: bật/tắt trong Cài đặt.
-- Khi bật, sau khi nhập đúng mật khẩu app sẽ gửi mã OTP 6 số qua email
-- (supabase.auth.signInWithOtp) và chỉ verifyOtp thành công mới có phiên.
-- Lưu ý: template email "Magic Link" trong Supabase cần chứa {{ .Token }}
-- để email hiện mã 6 số thay vì chỉ có liên kết.
-- Chạy trong Supabase Dashboard → SQL Editor, hoặc `supabase db push`.

alter table public.profiles
  add column if not exists two_factor_enabled boolean not null default false;
