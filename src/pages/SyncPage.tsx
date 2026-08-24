import { useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { useProfile, useRotateImportToken } from "../lib/queries";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function buildScript(token: string): string {
  return `// Spend Assist — đồng bộ email biến động số dư VCB vào app
// Dán vào script.google.com, lưu, chạy syncVcb() một lần để cấp quyền,
// rồi đặt trigger chạy mỗi 5 phút (xem hướng dẫn bên dưới).

const SUPABASE_URL = "${SUPABASE_URL}";
const ANON_KEY = "${ANON_KEY}";
const IMPORT_TOKEN = "${token}";
const BANK_SENDER = "VCBDigibank@info.vietcombank.com.vn";

function syncVcb() {
  const threads = GmailApp.search("from:" + BANK_SENDER + " newer_than:2d");
  for (const thread of threads) {
    for (const msg of thread.getMessages()) {
      const parsed = parseVcb(msg.getPlainBody());
      if (!parsed) continue; // không phải mail trừ tiền, hoặc format lạ
      const res = UrlFetchApp.fetch(
        SUPABASE_URL + "/rest/v1/rpc/import_bank_transaction",
        {
          method: "post",
          contentType: "application/json",
          headers: { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY },
          payload: JSON.stringify({
            p_token: IMPORT_TOKEN,
            p_external_id: msg.getId(), // chống nhập trùng
            p_amount: parsed.amount,
            p_note: parsed.note,
            p_occurred_on: Utilities.formatDate(
              msg.getDate(), "GMT+7", "yyyy-MM-dd"
            ),
          }),
          muteHttpExceptions: true,
        }
      );
      Logger.log(msg.getId() + " -> " + res.getContentText());
    }
  }
}

// Bóc số tiền bị TRỪ (chi tiêu) + nội dung từ mail VCB.
// Mail cộng tiền (+...VND) được bỏ qua vì app chỉ theo dõi chi.
function parseVcb(body) {
  const amountMatch = body.match(/[-–]\\s?([\\d.,]+)\\s?VND/);
  if (!amountMatch) return null;
  const amount = parseInt(amountMatch[1].replace(/[^\\d]/g, ""), 10);
  if (!amount) return null;
  const noteMatch = body.match(/(?:Nội dung|ND|Ref|Mô tả)\\s*[:.]?\\s*(.+)/i);
  const note = noteMatch ? noteMatch[1].trim().slice(0, 120) : "Chuyển khoản VCB";
  return { amount: amount, note: note };
}
`;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-rule px-3 py-1.5 text-sm text-ink-2 transition-colors duration-150 hover:bg-paper-2"
    >
      {copied ? (
        <Check size={14} aria-hidden className="text-accent-deep" />
      ) : (
        <Copy size={14} aria-hidden />
      )}
      {copied ? "Đã chép" : label}
    </button>
  );
}

export function SyncPage() {
  const { data: profile } = useProfile();
  const rotate = useRotateImportToken();
  const token = profile?.import_token ?? "";
  const script = token ? buildScript(token) : "";

  return (
    <>
      <header className="page-head">
        <h1 className="text-2xl font-semibold">Đồng bộ Gmail</h1>
      </header>

      <p className="mb-6 max-w-prose text-sm leading-relaxed text-ink-2">
        Khi Vietcombank gửi email biến động số dư, một đoạn Google Apps Script chạy
        trong chính tài khoản Google của bạn sẽ đọc mail, bóc số tiền bị trừ và nội
        dung, rồi ghi vào sổ chi tiêu — tự xếp vào danh mục "Khác" để bạn phân loại
        lại. Email không rời khỏi tài khoản Google của bạn; chỉ số tiền và nội dung
        được gửi đi. Script chạy 5 phút một lần, có chống nhập trùng.
      </p>

      {/* Các bước cài đặt — nội dung tuần tự thật nên đánh số */}
      <ol className="mb-8 flex max-w-prose flex-col gap-5 text-sm leading-relaxed">
        <li>
          <p className="font-medium">1. Bật email biến động số dư trong VCB Digibank</p>
          <p className="mt-1 text-ink-2">
            App VCB Digibank → Cài đặt → Đăng ký nhận thông báo qua email. Mail sẽ
            đến từ <code className="text-xs">VCBDigibank@info.vietcombank.com.vn</code>.
          </p>
        </li>
        <li>
          <p className="font-medium">2. Chạy migration mới trong Supabase</p>
          <p className="mt-1 text-ink-2">
            Mở SQL Editor, dán nội dung{" "}
            <code className="text-xs">supabase/migrations/0002_gmail_sync.sql</code>{" "}
            và chạy (một lần duy nhất).
          </p>
        </li>
        <li>
          <p className="font-medium">3. Tạo Apps Script</p>
          <p className="mt-1 text-ink-2">
            Vào{" "}
            <a
              href="https://script.google.com"
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap text-accent-deep underline underline-offset-2"
            >
              script.google.com
            </a>{" "}
            (đăng nhập đúng tài khoản Gmail nhận mail VCB) → New project → xóa nội
            dung mặc định, dán đoạn script bên dưới → Lưu. Bấm{" "}
            <span className="font-medium">Run</span> một lần và cấp quyền khi được hỏi.
          </p>
        </li>
        <li>
          <p className="font-medium">4. Đặt lịch chạy tự động</p>
          <p className="mt-1 text-ink-2">
            Trong Apps Script: biểu tượng đồng hồ (Triggers) → Add Trigger → hàm{" "}
            <code className="text-xs">syncVcb</code> · Time-driven · Minutes timer ·
            Every 5 minutes → Save.
          </p>
        </li>
      </ol>

      {/* Script — khung typographic, không giả chrome cửa sổ */}
      <section aria-label="Đoạn script" className="mb-8">
        <div className="mb-2 flex items-center justify-between border-t border-rule pt-3">
          <p className="text-sm font-medium">
            Script của bạn <span className="font-normal text-muted">(đã điền sẵn thông số)</span>
          </p>
          {script && <CopyButton text={script} label="Chép script" />}
        </div>
        {script ? (
          <pre className="overflow-x-auto rounded-xl bg-paper-2 p-4 text-xs leading-relaxed text-ink-2">
            {script}
          </pre>
        ) : (
          <p className="text-sm text-muted">
            Đang tải… (cần chạy migration 0002 trước thì token mới tồn tại)
          </p>
        )}
        <p className="mt-2 border-b border-rule pb-3 text-xs leading-relaxed text-muted">
          Script chứa mã bí mật của riêng bạn — đừng chia sẻ. Nếu lỡ lộ, bấm "Đổi mã"
          bên dưới rồi cập nhật lại script.
        </p>
      </section>

      {/* Token */}
      <section aria-label="Mã nhập liệu" className="max-w-prose">
        <p className="mb-2 text-sm font-medium">Mã nhập liệu (import token)</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="tnum rounded-lg bg-paper-2 px-3 py-1.5 text-xs">
            {token || "—"}
          </code>
          {token && <CopyButton text={token} label="Chép" />}
          <button
            onClick={() => rotate.mutate()}
            disabled={rotate.isPending}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-rule px-3 py-1.5 text-sm text-ink-2 transition-colors duration-150 hover:bg-paper-2 disabled:opacity-60"
          >
            <RefreshCw size={14} aria-hidden />
            {rotate.isPending ? "Đang đổi…" : "Đổi mã"}
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Mã này chỉ cho phép <em>thêm giao dịch</em> vào tài khoản của bạn — không đọc
          được dữ liệu, không sửa, không xóa. Đổi mã sẽ vô hiệu script cũ ngay lập tức.
        </p>
      </section>
    </>
  );
}
