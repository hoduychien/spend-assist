import { formatVND } from "../lib/format";

export interface CategorySlice {
  id: string;
  name: string;
  color: string;
  total: number;
}

/**
 * Chi theo danh mục — dạng thanh ngang (đọc tốt nhất trên màn hình hẹp).
 * Màu theo danh mục (màu đi theo thực thể, không theo thứ hạng);
 * nhãn trực tiếp bên cạnh mỗi thanh, số dùng tabular-nums.
 */
export function CategoryChart({ slices }: { slices: CategorySlice[] }) {
  const sorted = [...slices].filter((s) => s.total > 0).sort((a, b) => b.total - a.total);
  if (sorted.length === 0) return null;
  const max = sorted[0].total;

  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((s) => (
        <li key={s.id}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-sm text-ink-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <span className="truncate">{s.name}</span>
            </span>
            <span className="tnum shrink-0 text-sm font-medium text-ink">
              {formatVND(s.total)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-paper-3">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((s.total / max) * 100, 2)}%`,
                background: s.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
