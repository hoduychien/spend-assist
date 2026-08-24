---
name: deploy
description: Tự động commit, push code lên GitHub và deploy lên Vercel (production). CHỈ chạy khi đang ở nhánh main — nếu đang ở nhánh khác thì từ chối và hướng dẫn dùng /create-pull-request. Dùng khi người dùng nói "deploy", "đưa lên production", "push và deploy".
---

# Deploy

Đưa code hiện tại lên production. Vercel được nối với repo GitHub
`hoduychien/spend-assist`, nên **push lên `main` = deploy production** —
không cần gọi Vercel CLI.

## Quy trình — làm đúng thứ tự, dừng ngay khi một bước chặn

1. **Kiểm tra nhánh (bắt buộc, làm đầu tiên):**
   ```
   git rev-parse --abbrev-ref HEAD
   ```
   - Nếu KHÔNG phải `main` → **DỪNG**. Không commit, không push, không checkout
     sang main hộ người dùng. Trả lời: *"Đang ở nhánh `<tên>` — skill deploy chỉ
     chạy trên `main`. Dùng `/create-pull-request` để tạo PR, merge xong rồi
     deploy."*

2. **Kiểm tra thay đổi:** `git status --short`
   - Có thay đổi chưa commit → build kiểm tra trước: `npm run build`.
     Build lỗi → **DỪNG**, báo lỗi cụ thể, không push code hỏng lên production.
     Build pass → commit với message mô tả đúng nội dung thay đổi (tiếng Anh,
     ngắn gọn, kèm footer Co-Authored-By theo quy ước của phiên).
   - Không có thay đổi và `main` không ahead so với `origin/main` → báo
     *"Không có gì mới để deploy"* và dừng.

3. **Push:** `git push origin main`

4. **Báo kết quả:** xác nhận đã push (kèm hash commit), nhắc rằng Vercel sẽ tự
   build và deploy trong ~1 phút, theo dõi tại tab Deployments trên vercel.com.
   Nếu push bị rejected (remote có commit mới hơn) → `git pull --rebase` rồi
   push lại; conflict thì dừng và báo người dùng.

## Không được làm

- Không `git push --force`.
- Không tự chuyển nhánh hay merge hộ.
- Không bỏ qua bước build khi có thay đổi chưa commit.
