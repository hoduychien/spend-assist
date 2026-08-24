import { useMemo } from "react";
import type { Transaction } from "../lib/types";
import { formatMonth, formatVND, monthEndISO, todayISO } from "../lib/format";

/** Nhãn tiền rút gọn: 3.250.000 → "3,3tr", 850.000 → "850k" */
function shortVND(v: number): string {
  if (v >= 1_000_000)
    return `${(Math.round(v / 100_000) / 10).toLocaleString("vi-VN")}tr`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

/** Tooltip cho cột — hiện khi hover cả cột (vùng chạm lớn hơn vạch) */
function BarTip({ label, value }: { label: string; value: number }) {
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-rule bg-paper px-2 py-1 text-xs text-ink shadow-md group-hover:block">
      {label} · <span className="tnum font-medium">{formatVND(value)}</span>
    </span>
  );
}

/**
 * Chi tiêu theo từng ngày trong tháng — cột đơn sắc (một chuỗi, không cần
 * chú giải), hôm nay tô đậm, tooltip hover trên cả cột, nhãn trục thưa.
 */
export function DailySpendChart({
  transactions,
  month,
}: {
  transactions: Transaction[];
  month: string; // yyyy-mm-01
}) {
  const [y, m] = month.split("-").map(Number);
  const lastDay = Number(monthEndISO(month).slice(8, 10));
  const today = todayISO();

  const totals = useMemo(() => {
    const arr = new Array<number>(lastDay).fill(0);
    for (const t of transactions) {
      const d = Number(t.occurred_on.slice(8, 10));
      if (t.occurred_on.slice(0, 7) === month.slice(0, 7) && d >= 1 && d <= lastDay) {
        arr[d - 1] += t.amount;
      }
    }
    return arr;
  }, [transactions, month, lastDay]);

  const max = Math.max(...totals);
  if (max === 0) {
    return <p className="text-sm text-muted">Tháng này chưa có dữ liệu chi tiêu.</p>;
  }

  // Nhãn trục X thưa để không chen chúc trên màn hình hẹp
  const labelDays = new Set([1, 8, 15, 22, 29].filter((d) => d <= lastDay));

  return (
    <div role="img" aria-label={`Chi tiêu theo ngày, ${formatMonth(month)}`}>
      <div className="flex h-28 items-end gap-px border-b border-rule sm:gap-0.5">
        {totals.map((total, i) => {
          const day = i + 1;
          const iso = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = iso === today;
          return (
            <div
              key={day}
              className="group relative flex h-full flex-1 items-end justify-center"
              aria-label={`Ngày ${day}: ${formatVND(total)}`}
            >
              <BarTip label={`${day}/${m}`} value={total} />
              {total > 0 && (
                <div
                  className={`w-[70%] rounded-t-[3px] transition-colors duration-150 ${
                    isToday ? "bg-accent-deep" : "bg-accent group-hover:bg-accent-deep"
                  }`}
                  style={{ height: `${Math.max((total / max) * 100, 3)}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-px sm:gap-0.5">
        {totals.map((_, i) => (
          <span key={i} className="flex-1 text-center text-[10px] text-muted">
            {labelDays.has(i + 1) ? i + 1 : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Biểu đồ đường lũy kế chi tiêu trong tháng — đường 2px màu nhấn với nền
 * area mờ, vạch ngân sách nét đứt (nếu có), crosshair + tooltip theo ngày,
 * điểm cuối có nhãn trực tiếp. Đường dừng ở hôm nay với tháng hiện tại.
 */
export function CumulativeSpendChart({
  transactions,
  month,
  budget = 0,
}: {
  transactions: Transaction[];
  month: string; // yyyy-mm-01
  budget?: number; // 0 = không vẽ vạch ngân sách
}) {
  const [, m] = month.split("-").map(Number);
  const lastDay = Number(monthEndISO(month).slice(8, 10));
  const today = todayISO();
  const isCurrentMonth = today.slice(0, 7) === month.slice(0, 7);
  const uptoDay = isCurrentMonth ? Number(today.slice(8, 10)) : lastDay;

  const cum = useMemo(() => {
    const daily = new Array<number>(lastDay).fill(0);
    for (const t of transactions) {
      const d = Number(t.occurred_on.slice(8, 10));
      if (t.occurred_on.slice(0, 7) === month.slice(0, 7) && d >= 1 && d <= lastDay) {
        daily[d - 1] += t.amount;
      }
    }
    const acc: number[] = [];
    let run = 0;
    for (const v of daily) {
      run += v;
      acc.push(run);
    }
    return acc;
  }, [transactions, month, lastDay]);

  const total = cum[uptoDay - 1] ?? 0;
  if (total === 0) {
    return <p className="text-sm text-muted">Tháng này chưa có dữ liệu chi tiêu.</p>;
  }

  const maxY = Math.max(total, budget);
  // Tọa độ % trong viewBox 100×100 (y đảo chiều: 0 trên cùng)
  const xAt = (day: number) => ((day - 0.5) / lastDay) * 100;
  const yAt = (v: number) => 100 - (v / maxY) * 96; // chừa 4% mép trên
  const points = cum
    .slice(0, uptoDay)
    .map((v, i) => `${xAt(i + 1)},${yAt(v)}`)
    .join(" ");
  const areaPoints = `${xAt(1)},100 ${points} ${xAt(uptoDay)},100`;
  const budgetY = budget > 0 ? yAt(Math.min(budget, maxY)) : 0;

  const labelDays = new Set([1, 8, 15, 22, 29].filter((d) => d <= lastDay));

  return (
    <div role="img" aria-label={`Lũy kế chi tiêu, ${formatMonth(month)}`}>
      <div className="relative h-28 border-b border-rule">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
          className="absolute inset-0 h-full w-full"
        >
          {budget > 0 && (
            <line
              x1="0"
              x2="100"
              y1={budgetY}
              y2={budgetY}
              stroke="var(--color-muted)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <polygon points={areaPoints} fill="var(--color-accent)" opacity="0.12" />
          <polyline
            points={points}
            fill="none"
            stroke="var(--color-accent-deep)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Lớp hover: crosshair + điểm + tooltip theo từng ngày */}
        <div className="absolute inset-0 flex">
          {cum.map((v, i) => {
            const day = i + 1;
            if (day > uptoDay) return <div key={day} className="flex-1" />;
            return (
              <div key={day} className="group relative flex-1">
                <BarTip label={`${day}/${m} · lũy kế`} value={v} />
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-1/2 hidden w-px bg-rule group-hover:block"
                />
                <span
                  aria-hidden
                  className="absolute left-1/2 hidden h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-accent-deep ring-2 ring-paper group-hover:block"
                  style={{ bottom: `${100 - yAt(v)}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Nhãn trực tiếp ở điểm cuối */}
        <span
          className="tnum pointer-events-none absolute -translate-y-full text-xs font-medium text-ink"
          style={{
            left: `${Math.min(xAt(uptoDay), 88)}%`,
            bottom: `${100 - yAt(total)}%`,
          }}
        >
          {shortVND(total)}
        </span>
      </div>

      <div className="mt-1 flex">
        {cum.map((_, i) => (
          <span key={i} className="flex-1 text-center text-[10px] text-muted">
            {labelDays.has(i + 1) ? i + 1 : ""}
          </span>
        ))}
      </div>

      {budget > 0 && (
        <p className="mt-2 flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-0.5 w-4 rounded bg-accent-deep" />
            Lũy kế chi
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block w-4 border-t border-dashed border-muted"
            />
            Ngân sách {shortVND(budget)}
          </span>
        </p>
      )}
    </div>
  );
}
