import { formatVND } from "../lib/format";

export type BudgetStatus = "ok" | "warn" | "over";

export function budgetStatus(spent: number, budget: number): BudgetStatus {
  if (budget <= 0) return "ok";
  const ratio = spent / budget;
  if (ratio >= 1) return "over";
  if (ratio >= 0.8) return "warn";
  return "ok";
}

const FILL: Record<BudgetStatus, string> = {
  ok: "var(--color-accent)",
  warn: "var(--color-warn)",
  over: "var(--color-danger)",
};

const LABEL: Record<BudgetStatus, string> = {
  ok: "Trong hạn mức",
  warn: "Sắp chạm hạn mức",
  over: "Đã vượt hạn mức",
};

/** Thanh tiến độ ngân sách — đổi trạng thái ở 80% và khi vượt. */
export function BudgetBar({
  spent,
  budget,
  showStatusText = false,
}: {
  spent: number;
  budget: number;
  showStatusText?: boolean;
}) {
  const status = budgetStatus(spent, budget);
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Đã chi ${formatVND(spent)} trên ${formatVND(budget)} — ${LABEL[status]}`}
        className="h-2 w-full overflow-hidden rounded-full bg-paper-3"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: FILL[status] }}
        />
      </div>
      {showStatusText && (
        <p
          className="mt-1 text-xs"
          style={{
            color:
              status === "over"
                ? "var(--color-danger)"
                : status === "warn"
                  ? "var(--color-warn-deep)"
                  : "var(--color-muted)",
          }}
        >
          {LABEL[status]}
          {budget > 0 && status !== "over"
            ? ` — còn ${formatVND(budget - spent)}`
            : budget > 0 && status === "over"
              ? ` ${formatVND(spent - budget)}`
              : ""}
        </p>
      )}
    </div>
  );
}
