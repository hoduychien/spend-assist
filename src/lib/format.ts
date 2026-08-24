const nf = new Intl.NumberFormat("vi-VN");

/** 1250000 → "1.250.000 ₫" */
export function formatVND(amount: number): string {
  return `${nf.format(amount)} ₫`;
}

/** Chuỗi người dùng gõ → số đồng ("1.250.000" → 1250000) */
export function parseVND(input: string): number {
  const digits = input.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

/** Hiển thị trong ô nhập: nhóm nghìn bằng dấu chấm */
export function formatAmountInput(value: number): string {
  return value > 0 ? nf.format(value) : "";
}

/** yyyy-mm-dd của hôm nay theo giờ địa phương */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ngày đầu tháng chứa `date`, dạng yyyy-mm-01 */
export function monthStartISO(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Cộng `delta` tháng vào chuỗi yyyy-mm-01 */
export function addMonths(monthISO: string, delta: number): string {
  const [y, m] = monthISO.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthStartISO(d);
}

/** "2026-08-01" → "Tháng 8/2026" */
export function formatMonth(monthISO: string): string {
  const [y, m] = monthISO.split("-").map(Number);
  return `Tháng ${m}/${y}`;
}

/** Ngày cuối tháng của yyyy-mm-01 → yyyy-mm-dd */
export function monthEndISO(monthISO: string): string {
  const [y, m] = monthISO.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/** Số ngày từ hôm nay đến dateISO (âm = đã qua) */
export function daysUntil(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  const today = new Date();
  return Math.round(
    (new Date(y, m - 1, d).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86400000
  );
}

/** "2026-08-30" → "30/8/2026" */
export function formatShortDate(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return `${d}/${m}/${y}`;
}

/** "2026-08-24" → "Thứ Hai, 24/8" (hoặc "Hôm nay" / "Hôm qua") */
export function formatDayHeading(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const diff = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      date.getTime()) /
      86400000
  );
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  const weekday = new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(date);
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${cap}, ${d}/${m}`;
}
