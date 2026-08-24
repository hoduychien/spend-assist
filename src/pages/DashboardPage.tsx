import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, TriangleAlert } from "lucide-react";
import {
  useBudgets,
  useCategories,
  useDebts,
  useSeedSampleData,
  useTransactions,
} from "../lib/queries";
import { dueLabel, dueStatus } from "./DebtsPage";
import { formatMonth, formatVND, monthStartISO } from "../lib/format";
import { BudgetBar, budgetStatus } from "../components/BudgetBar";
import { CategoryChart } from "../components/CategoryChart";
import { CategoryIcon } from "../components/CategoryIcon";
import { TransactionSheet } from "../components/TransactionSheet";

export function DashboardPage() {
  const month = monthStartISO();
  const { data: categories = [] } = useCategories();
  const { data: transactions = [], isLoading } = useTransactions({ monthISO: month });
  const { data: budgets = [] } = useBudgets(month);
  const { data: debts = [] } = useDebts();
  const seed = useSeedSampleData();
  const [adding, setAdding] = useState(false);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
  const totalBudget =
    budgets.find((b) => b.category_id === null)?.amount ??
    budgets.reduce((s, b) => s + (b.category_id ? b.amount : 0), 0);

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      const key = t.category_id ?? "none";
      map.set(key, (map.get(key) ?? 0) + t.amount);
    }
    return map;
  }, [transactions]);

  const slices = [...spentByCategory.entries()].map(([id, total]) => {
    const cat = catById.get(id);
    return {
      id,
      name: cat?.name ?? "Không có danh mục",
      color: cat?.color ?? "#A16207",
      total,
    };
  });

  // Danh mục sắp vượt (≥80%) hoặc đã vượt ngân sách
  const alerts = budgets
    .filter((b) => b.category_id !== null)
    .map((b) => {
      const spent = spentByCategory.get(b.category_id!) ?? 0;
      return { budget: b, spent, status: budgetStatus(spent, b.amount) };
    })
    .filter((a) => a.status !== "ok");

  // Khoản nợ quá hạn hoặc còn ≤ 7 ngày
  const debtAlerts = debts.filter((d) => !d.paid_at && dueStatus(d) !== "ok");

  const recent = transactions.slice(0, 5);
  const hasSample = transactions.some((t) => t.is_sample);

  return (
    <>
      <header className="page-head flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{formatMonth(month)}</p>
          <h1 className="text-2xl font-semibold">Tổng quan</h1>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-accent-deep px-4 py-2.5 text-sm font-medium text-paper transition-colors duration-150 hover:bg-accent"
        >
          <Plus size={16} aria-hidden />
          Thêm khoản chi
        </button>
      </header>

      {/* Tổng chi so với ngân sách */}
      <section aria-labelledby="tong-chi" className="mb-8 border-b border-rule pb-6">
        <h2 id="tong-chi" className="sr-only">
          Tổng chi tháng này
        </h2>
        <p className="tnum font-display text-4xl font-semibold tracking-tight">
          {formatVND(totalSpent)}
        </p>
        {totalBudget > 0 ? (
          <div className="mt-3 max-w-md">
            <BudgetBar spent={totalSpent} budget={totalBudget} showStatusText />
            <p className="tnum mt-1 text-sm text-muted">
              Ngân sách tháng: {formatVND(totalBudget)}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Chưa đặt ngân sách —{" "}
            <Link to="/ngan-sach" className="text-accent-deep underline underline-offset-2">
              đặt ngay
            </Link>{" "}
            để biết mình còn tiêu được bao nhiêu.
          </p>
        )}
      </section>

      {/* Cảnh báo ngân sách + dư nợ */}
      {(alerts.length > 0 || debtAlerts.length > 0) && (
        <section aria-labelledby="canh-bao" className="mb-8">
          <h2 id="canh-bao" className="mb-3 text-base font-semibold">
            Cần để ý
          </h2>
          <ul className="flex flex-col gap-2">
            {debtAlerts.map((d) => {
              const over = dueStatus(d) === "over";
              return (
                <li
                  key={d.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                    over ? "bg-danger-soft" : "bg-warn-soft"
                  }`}
                >
                  <TriangleAlert
                    size={18}
                    aria-hidden
                    className={over ? "text-danger" : "text-warn-deep"}
                  />
                  <p className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{d.name}</span>{" "}
                    <span className="tnum">{formatVND(d.amount)}</span> —{" "}
                    {dueLabel(d).toLowerCase()}
                  </p>
                  <Link
                    to="/du-no"
                    className="shrink-0 whitespace-nowrap text-sm text-accent-deep underline-offset-2 hover:underline"
                  >
                    Xem
                  </Link>
                </li>
              );
            })}
            {alerts.map(({ budget, spent, status }) => {
              const cat = catById.get(budget.category_id!);
              if (!cat) return null;
              const over = status === "over";
              return (
                <li
                  key={budget.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                    over ? "bg-danger-soft" : "bg-warn-soft"
                  }`}
                >
                  <TriangleAlert
                    size={18}
                    aria-hidden
                    className={over ? "text-danger" : "text-warn-deep"}
                  />
                  <p className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{cat.name}</span>{" "}
                    {over ? (
                      <>đã vượt ngân sách <span className="tnum">{formatVND(spent - budget.amount)}</span></>
                    ) : (
                      <>đã dùng <span className="tnum">{Math.round((spent / budget.amount) * 100)}%</span> ngân sách</>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Chi theo danh mục */}
      <section aria-labelledby="theo-danh-muc" className="mb-8">
        <h2 id="theo-danh-muc" className="mb-3 text-base font-semibold">
          Chi theo danh mục
        </h2>
        {slices.length > 0 ? (
          <CategoryChart slices={slices} />
        ) : isLoading ? (
          <p className="text-sm text-muted">Đang tải…</p>
        ) : (
          <div className="rounded-xl border border-dashed border-rule px-4 py-6 text-center">
            <p className="text-sm text-ink-2">Tháng này chưa có khoản chi nào.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setAdding(true)}
                className="whitespace-nowrap rounded-lg bg-accent-deep px-3 py-2 text-sm font-medium text-paper transition-colors duration-150 hover:bg-accent"
              >
                Ghi khoản đầu tiên
              </button>
              <button
                onClick={() => seed.mutate()}
                disabled={seed.isPending}
                className="whitespace-nowrap rounded-lg border border-rule px-3 py-2 text-sm text-ink-2 transition-colors duration-150 hover:bg-paper-2 disabled:opacity-60"
              >
                {seed.isPending ? "Đang tạo…" : "Dùng thử với dữ liệu mẫu"}
              </button>
            </div>
          </div>
        )}
        {hasSample && (
          <p className="mt-3 text-xs text-muted">
            Một số giao dịch là dữ liệu mẫu để bạn xem thử — cứ xóa khi không cần nữa.
          </p>
        )}
      </section>

      {/* 5 giao dịch gần nhất */}
      {recent.length > 0 && (
        <section aria-labelledby="gan-nhat">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="gan-nhat" className="text-base font-semibold">
              Giao dịch gần nhất
            </h2>
            <Link
              to="/giao-dich"
              className="whitespace-nowrap text-sm text-accent-deep underline-offset-2 hover:underline"
            >
              Xem tất cả
            </Link>
          </div>
          <ul className="divide-y divide-rule-2">
            {recent.map((t) => {
              const cat = t.category_id ? catById.get(t.category_id) : undefined;
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <CategoryIcon
                    icon={cat?.icon ?? "ellipsis"}
                    color={cat?.color ?? "#A16207"}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {t.note || cat?.name || "Không có danh mục"}
                    </p>
                    <p className="text-xs text-muted">{cat?.name ?? "Không có danh mục"}</p>
                  </div>
                  <span className="tnum shrink-0 text-sm font-medium">
                    {formatVND(t.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {adding && (
        <TransactionSheet
          categories={categories}
          editing={null}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  );
}
