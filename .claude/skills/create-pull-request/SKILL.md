---
name: create-pull-request
description: Commit thay đổi, push nhánh hiện tại lên GitHub và tạo Pull Request vào main. CHỈ dùng khi đang ở nhánh khác main — nếu đang ở main thì hướng dẫn dùng /deploy hoặc tạo nhánh mới. Dùng khi người dùng nói "tạo PR", "create pull request", "mở pull request".
---

# Create Pull Request

Đưa thay đổi ở nhánh tính năng lên GitHub dưới dạng Pull Request vào `main`
của repo `hoduychien/spend-assist`. (Merge PR vào `main` sẽ kích hoạt Vercel
deploy production.)

## Quy trình

1. **Kiểm tra nhánh (bắt buộc, làm đầu tiên):**
   ```
   git rev-parse --abbrev-ref HEAD
   ```
   - Nếu ĐANG ở `main` → **DỪNG**. Trả lời: *"Đang ở `main` — không tạo PR từ
     main. Nếu muốn deploy thay đổi hiện tại, dùng `/deploy`. Nếu muốn làm
     tính năng riêng, tạo nhánh trước: `git checkout -b <tên-nhánh>`."*

2. **Kiểm tra thay đổi:** `git status --short`
   - Có thay đổi chưa commit → chạy `npm run build` trước; build lỗi thì DỪNG
     và báo lỗi. Build pass → commit với message mô tả đúng thay đổi (kèm
     footer Co-Authored-By theo quy ước của phiên).
   - Không có commit nào khác `main` (`git log main..HEAD --oneline` rỗng)
     → báo "Nhánh chưa có commit nào so với main" và dừng.

3. **Push nhánh:** `git push -u origin <tên-nhánh>`

4. **Tạo PR:**
   - Nếu có `gh` CLI (`gh --version` chạy được): dùng
     `gh pr create --base main --title "..." --body "..."` — body tóm tắt
     thay đổi bằng bullet, kết thúc bằng footer "🤖 Generated with Claude Code"
     theo quy ước của phiên.
   - Nếu KHÔNG có `gh`: đưa cho người dùng link tạo PR thủ công:
     `https://github.com/hoduychien/spend-assist/compare/main...<tên-nhánh>?expand=1`
     kèm sẵn tiêu đề + mô tả đề xuất để họ dán vào.

5. **Báo kết quả:** link PR (hoặc link compare), tóm tắt các commit trong PR,
   và nhắc: merge PR xong thì Vercel tự deploy — hoặc quay về main kéo code
   mới rồi chạy `/deploy`.

## Không được làm

- Không tự merge PR.
- Không push thẳng lên `main`.
- Không `--force` trừ khi người dùng yêu cầu rõ ràng.
