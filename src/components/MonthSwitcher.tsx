import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, formatMonth, monthStartISO } from "../lib/format";

export function MonthSwitcher({
  month,
  onChange,
  allowFuture = false,
}: {
  month: string;
  onChange: (m: string) => void;
  /** Cho phép chuyển sang tháng tương lai (vd. lập trước ngân sách) */
  allowFuture?: boolean;
}) {
  const isCurrent = month === monthStartISO();
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(addMonths(month, -1))}
        aria-label="Tháng trước"
        className="rounded-lg p-1.5 text-ink-2 transition-colors duration-150 hover:bg-paper-2"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="tnum min-w-[7.5rem] text-center text-sm font-medium">
        {formatMonth(month)}
      </span>
      <button
        onClick={() => onChange(addMonths(month, 1))}
        aria-label="Tháng sau"
        disabled={!allowFuture && isCurrent}
        className="rounded-lg p-1.5 text-ink-2 transition-colors duration-150 hover:bg-paper-2 disabled:opacity-30"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
