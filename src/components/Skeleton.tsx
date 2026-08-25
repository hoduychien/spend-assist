/**
 * Khung chờ (skeleton) — hiệu ứng shimmer định nghĩa trong index.css (.skeleton),
 * dùng token nền của app nên tự hợp cả light lẫn dark mode.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

/** Danh sách chờ: icon tròn + hai dòng chữ + số tiền — khớp layout list của app */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Đang tải" className="divide-y divide-rule-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-3.5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Biểu đồ cột chờ — dàn cột cao thấp ngẫu nhiên cố định, khớp chiều cao chart thật */
const BAR_HEIGHTS = [35, 60, 45, 75, 55, 85, 50, 68, 40, 78, 58, 30];

export function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải"
      className="flex h-28 items-end gap-1.5 border-b border-rule"
    >
      {BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          aria-hidden
          className="skeleton flex-1 rounded-t-md rounded-b-none"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
