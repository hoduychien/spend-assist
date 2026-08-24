# Spend Assist

Sổ chi tiêu cá nhân — ghi khoản chi hằng ngày, đặt ngân sách theo danh mục, và
biết mình còn bao nhiêu trước khi tháng kết thúc. Tiếng Việt, tiền VND, ưu tiên
màn hình điện thoại.

**Stack:** React (Vite) + TypeScript + Tailwind CSS v4 · Supabase (Postgres, Auth,
Row Level Security) · TanStack Query · React Router.

## Chạy dự án

1. **Tạo project Supabase** tại [supabase.com](https://supabase.com) (gói miễn phí là đủ).

2. **Chạy migration** — mở *SQL Editor* trong Supabase Dashboard, dán toàn bộ nội
   dung `supabase/migrations/0001_init.sql` và chạy. File này tạo:
   - 4 bảng: `profiles`, `categories`, `transactions`, `budgets`
   - RLS policies — mỗi user chỉ đọc/ghi dữ liệu của chính mình
   - Trigger tạo profile + 6 danh mục mặc định (Ăn uống, Di chuyển, Hóa đơn,
     Mua sắm, Giải trí, Khác) khi user đăng ký
   - Hàm `seed_sample_data()` — chèn dữ liệu mẫu tiếng Việt (bún bò 45.000 ₫,
     Grab 32.000 ₫, tiền điện 850.000 ₫…), đánh dấu `is_sample = true`

3. **Cấu hình môi trường:**

   ```bash
   cp .env.example .env
   # điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY
   # (Dashboard → Settings → API)
   ```

4. **Chạy:**

   ```bash
   npm install
   npm run dev
   ```

5. Đăng ký tài khoản trong app. Nếu project Supabase bật *Confirm email*
   (mặc định), kiểm tra hộp thư để xác nhận. Sau khi đăng nhập, bấm
   **"Dùng thử với dữ liệu mẫu"** trên trang Tổng quan nếu muốn xem app với dữ liệu.

## Cấu trúc

```
supabase/migrations/0001_init.sql   — schema + RLS + seed
src/lib/        — supabase client, auth context, query hooks, định dạng VND/ngày
src/components/ — khung app, sheet giao dịch, thanh ngân sách, biểu đồ danh mục
src/pages/      — Auth · Tổng quan · Giao dịch · Ngân sách · Danh mục
src/styles/     — tokens.css (design tokens) + index.css
```

## Dư nợ

Chạy `supabase/migrations/0003_debts.sql` để bật trang **Dư nợ**: theo dõi các
khoản phải trả (thẻ tín dụng, vay mượn…) kèm ngày tới hạn. Khoản quá hạn hiện đỏ,
còn ≤ 7 ngày hiện vàng và xuất hiện trong mục "Cần để ý" trên Tổng quan. Đánh dấu
"Đã trả" có thể ghi luôn thành khoản chi hôm nay (danh mục "Khác").

## Ghi chú thiết kế

- Số tiền lưu dạng `bigint` (đồng nguyên) — VND không có phần thập phân.
- Định dạng `1.250.000 ₫` qua `Intl.NumberFormat("vi-VN")`; mọi cột số dùng
  `tabular-nums` để thẳng hàng.
- Thanh ngân sách đổi trạng thái ở 80% (vàng) và khi vượt (đỏ).
- 6 màu danh mục mặc định đã được kiểm tra phân biệt được với người mù màu
  (CVD ΔE ≥ 8 giữa các cặp liền kề).
- Xóa giao dịch là optimistic + nút Hoàn tác; xóa danh mục (ảnh hưởng dữ liệu
  khác) mới hỏi xác nhận.
