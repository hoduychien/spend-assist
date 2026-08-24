import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Copy, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import {
  useBudgets,
  useCategories,
  useDebts,
  useInsertBudgets,
  useProfile,
  useSaveBudget,
  useTransactions,
} from "../lib/queries";
import {
  addMonths,
  formatAmountInput,
  formatMonth,
  formatShortDate,
  formatVND,
  monthEndISO,
  monthStartISO,
  parseVND,
  payCycleRange,
} from "../lib/format";
import type { Category } from "../lib/types";
import { BudgetBar } from "../components/BudgetBar";
import { CategoryIcon } from "../components/CategoryIcon";
import { MonthSwitcher } from "../components/MonthSwitcher";
import { AppSelect } from "../components/fields";

/** Mục tiêu đang thêm/sửa trong sheet. categoryId null = ngân sách cả tháng. */
interface SheetTarget {
  categoryId: string | null;
  amount: number; // 0 = chưa có (thêm mới)
}

/** Làm tròn lên bội 10.000 ₫ để hạn mức gợi ý gọn số */
function roundUp10k(amount: number): number {
  return Math.ceil(amount / 10_000) * 10_000;
}

export function BudgetsPage() {
  const [month, setMonth] = useState(monthStartISO());
  const { data: categories = [] } = useCategories();
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets(month);
  const { data: transactions = [] } = useTransactions({ monthISO: month });
  const [sheet, setSheet] = useState<SheetTarget | null>(null);

  const prevMonth = addMonths(month, -1);
  const { data: prevBudgets = [] } = useBudgets(prevMonth);
  const { data: prevTransactions = [] } = useTransactions({ monthISO: prevMonth });
  const { data: debts = [] } = useDebts();
  const { data: profile } = useProfile();
  const insertBudgets = useInsertBudgets();

  const isFuture = month > monthStartISO();

  const payday = profile?.payday ?? null;
  // Cửa sổ dư nợ của tháng đang xem: theo kỳ lương nếu đã đặt ngày lương,
  // chưa đặt thì theo tháng dương lịch.
  const debtWindow = useMemo(
    () =>
      payday
        ? payCycleRange(month, payday)
        : { start: month, end: monthEndISO(month) },
    [month, payday]
  );
  const debtCategoryId = categories.find((c) => c.name === "Dư nợ")?.id ?? null;

  // Dư nợ thuộc kỳ này ĐÃ THANH TOÁN nhưng chưa ghi thành khoản chi
  // (giao dịch đã ghi mang external_id "debt:<id>" nên không đếm trùng)
  // → vẫn tính vào chi tiêu của mục Dư nợ tháng này.
  const paidUnloggedSum = useMemo(
    () =>
      debts
        .filter(
          (d) =>
            d.paid_at &&
            d.due_date >= debtWindow.start &&
            d.due_date <= debtWindow.end &&
            !transactions.some((t) => t.external_id === `debt:${d.id}`)
        )
        .reduce((s, d) => s + d.amount, 0),
    [debts, debtWindow, transactions]
  );

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.category_id) map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount);
    }
    if (debtCategoryId && paidUnloggedSum > 0) {
      map.set(debtCategoryId, (map.get(debtCategoryId) ?? 0) + paidUnloggedSum);
    }
    return map;
  }, [transactions, debtCategoryId, paidUnloggedSum]);

  const budgetByCategory = new Map(
    budgets.filter((b) => b.category_id).map((b) => [b.category_id!, b.amount])
  );
  const totalBudget = budgets.find((b) => b.category_id === null)?.amount ?? 0;
  const totalSpent =
    transactions.reduce((s, t) => s + t.amount, 0) + paidUnloggedSum;

  const withBudget = categories.filter((c) => budgetByCategory.has(c.id));
  const withoutBudget = categories.filter((c) => !budgetByCategory.has(c.id));

  // --- Lập trước ngân sách: sao chép tháng trước / gợi ý theo chi tiêu thực tế ---
  const categoryIds = useMemo(() => new Set(categories.map((c) => c.id)), [categories]);

  const copyRows = useMemo(
    () =>
      prevBudgets
        .filter((b) => b.category_id === null || categoryIds.has(b.category_id))
        .map((b) => ({ category_id: b.category_id, amount: b.amount })),
    [prevBudgets, categoryIds]
  );

  // Dư nợ chưa trả tính vào tháng đang lập — khoản chi gần như chắc chắn
  const debtsDue = useMemo(
    () =>
      debts.filter(
        (d) =>
          !d.paid_at && d.due_date >= debtWindow.start && d.due_date <= debtWindow.end
      ),
    [debts, debtWindow]
  );
  const debtsDueSum = debtsDue.reduce((s, d) => s + d.amount, 0);

  const suggestRows = useMemo(() => {
    const spent = new Map<string, number>();
    let total = 0;
    for (const t of prevTransactions) {
      total += t.amount;
      if (t.category_id && categoryIds.has(t.category_id)) {
        spent.set(t.category_id, (spent.get(t.category_id) ?? 0) + t.amount);
      }
    }
    // Danh mục Dư nợ: tối thiểu bằng tổng dư nợ đến hạn trong tháng đang lập
    if (debtCategoryId && debtsDueSum > 0) {
      const prevDebtSpent = spent.get(debtCategoryId) ?? 0;
      if (debtsDueSum > prevDebtSpent) {
        total += debtsDueSum - prevDebtSpent;
        spent.set(debtCategoryId, debtsDueSum);
      }
    }
    const rows: { category_id: string | null; amount: number }[] = [...spent].map(
      ([category_id, sum]) => ({ category_id, amount: roundUp10k(sum) })
    );
    if (total > 0) rows.push({ category_id: null, amount: roundUp10k(total) });
    return rows;
  }, [prevTransactions, categoryIds, debtCategoryId, debtsDueSum]);

  const showPlanner =
    !budgetsLoading &&
    budgets.length === 0 &&
    (copyRows.length > 0 || suggestRows.length > 0);

  return (
    <>
      <header className="page-head flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Ngân sách</h1>
        <div className="flex items-center gap-2">
          <MonthSwitcher month={month} onChange={setMonth} allowFuture />
          {(withoutBudget.length > 0 || totalBudget === 0) && (
            <button
              onClick={() =>
                setSheet({ categoryId: withoutBudget[0]?.id ?? null, amount: 0 })
              }
              className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-accent-deep px-4 py-2.5 text-sm font-medium text-paper transition-colors duration-150 hover:bg-accent"
            >
              <Plus size={16} aria-hidden />
              Thêm
            </button>
          )}
        </div>
      </header>

      {isFuture && (
        <p className="mb-5 flex items-start gap-2 rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-accent-deep">
          <CalendarClock size={16} aria-hidden className="mt-0.5 shrink-0" />
          <span>
            Bạn đang lập trước ngân sách cho {formatMonth(month)}. Chi tiêu sẽ được
            theo dõi khi tháng bắt đầu.
          </span>
        </p>
      )}

      {showPlanner && (
        <section
          aria-label="Lập nhanh ngân sách"
          className="mb-7 rounded-xl border border-rule bg-paper-2 p-4"
        >
          <h2 className="mb-1 text-sm font-semibold">
            {formatMonth(month)} chưa có ngân sách
          </h2>
          <p className="mb-3 text-sm text-ink-2">
            Lập nhanh từ dữ liệu {formatMonth(prevMonth)}, sau đó chỉnh từng mục nếu cần.
          </p>
          {debtsDueSum > 0 && (
            <p className="mb-3 text-sm text-ink-2">
              Có {debtsDue.length} khoản dư nợ tính vào {formatMonth(month)}
              {payday
                ? ` (kỳ lương ${formatShortDate(debtWindow.start)} – ${formatShortDate(debtWindow.end)}, tổng `
                : " (tổng "}
              <span className="tnum font-medium text-ink">{formatVND(debtsDueSum)}</span>)
              — đã được tính vào gợi ý.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {copyRows.length > 0 && (
              <button
                onClick={() => insertBudgets.mutate({ month, rows: copyRows })}
                disabled={insertBudgets.isPending}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-accent-deep px-4 py-2.5 text-sm font-medium text-paper transition-colors duration-150 hover:bg-accent disabled:opacity-60"
              >
                <Copy size={15} aria-hidden />
                Sao chép ngân sách {formatMonth(prevMonth)}
              </button>
            )}
            {suggestRows.length > 0 && (
              <button
                onClick={() => insertBudgets.mutate({ month, rows: suggestRows })}
                disabled={insertBudgets.isPending}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-rule px-4 py-2.5 text-sm text-ink-2 transition-colors duration-150 hover:bg-paper disabled:opacity-60"
              >
                <Sparkles size={15} aria-hidden />
                Gợi ý theo chi tiêu {formatMonth(prevMonth)}
              </button>
            )}
          </div>
          {insertBudgets.isError && (
            <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              Không lưu được. Kiểm tra kết nối rồi thử lại.
            </p>
          )}
        </section>
      )}

      {/* Ngân sách cả tháng */}
      <section className="mb-7 border-b border-rule pb-5">
        <div className="mb-1.5 flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-sm font-semibold text-accent-deep"
          >
            Σ
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">Cả tháng</span>
          {totalBudget > 0 ? (
            <>
              <span className="tnum text-sm text-ink-2">
                {formatVND(totalSpent)} <span className="text-muted">/</span>{" "}
                <span className="font-medium text-ink">{formatVND(totalBudget)}</span>
              </span>
              <button
                onClick={() => setSheet({ categoryId: null, amount: totalBudget })}
                aria-label="Sửa ngân sách cả tháng"
                className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-paper-2 hover:text-ink"
              >
                <Pencil size={15} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSheet({ categoryId: null, amount: 0 })}
              className="whitespace-nowrap rounded-lg border border-rule px-3 py-1.5 text-sm text-ink-2 transition-colors duration-150 hover:bg-paper-2"
            >
              Đặt hạn mức
            </button>
          )}
        </div>
        {totalBudget > 0 && (
          <BudgetBar spent={totalSpent} budget={totalBudget} showStatusText />
        )}
      </section>

      {/* Danh mục đã có ngân sách */}
      {withBudget.length > 0 && (
        <section aria-label="Ngân sách theo danh mục" className="flex flex-col gap-5">
          {withBudget.map((c) => {
            const budget = budgetByCategory.get(c.id)!;
            const spent = spentByCategory.get(c.id) ?? 0;
            return (
              <div key={c.id}>
                <div className="mb-1.5 flex items-center gap-3">
                  <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {c.name}
                  </span>
                  <span className="tnum text-sm text-ink-2">
                    {formatVND(spent)} <span className="text-muted">/</span>{" "}
                    <span className="font-medium text-ink">{formatVND(budget)}</span>
                  </span>
                  <button
                    onClick={() => setSheet({ categoryId: c.id, amount: budget })}
                    aria-label={`Sửa ngân sách ${c.name}`}
                    className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-paper-2 hover:text-ink"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
                <BudgetBar spent={spent} budget={budget} showStatusText />
              </div>
            );
          })}
        </section>
      )}

      {/* Danh mục chưa có ngân sách */}
      {withoutBudget.length > 0 && (
        <section aria-label="Danh mục chưa đặt ngân sách" className="mt-8">
          <h2 className="mb-2 text-sm font-medium text-ink-2">Chưa đặt hạn mức</h2>
          <ul className="divide-y divide-rule-2">
            {withoutBudget.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                <span className="tnum text-sm text-muted">
                  {formatVND(spentByCategory.get(c.id) ?? 0)}
                </span>
                <button
                  onClick={() => setSheet({ categoryId: c.id, amount: 0 })}
                  className="whitespace-nowrap rounded-lg border border-rule px-3 py-1.5 text-sm text-ink-2 transition-colors duration-150 hover:bg-paper-2"
                >
                  Đặt hạn mức
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-xs leading-relaxed text-muted">
        Thanh tiến độ chuyển vàng khi chạm 80% và đỏ khi vượt hạn mức. Ngân sách đặt
        riêng cho từng tháng — chuyển tháng ở góc trên để xem hoặc đặt cho tháng khác.
      </p>

      {sheet && (
        <BudgetSheet
          target={sheet}
          month={month}
          categories={categories}
          takenCategoryIds={new Set(budgetByCategory.keys())}
          hasTotalBudget={totalBudget > 0}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

function BudgetSheet({
  target,
  month,
  categories,
  takenCategoryIds,
  hasTotalBudget,
  onClose,
}: {
  target: SheetTarget;
  month: string;
  categories: Category[];
  takenCategoryIds: Set<string>;
  hasTotalBudget: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const save = useSaveBudget();
  const isEditing = target.amount > 0;

  const [categoryId, setCategoryId] = useState<string>(target.categoryId ?? "");
  const [amountText, setAmountText] = useState(
    isEditing ? formatAmountInput(target.amount) : ""
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  // Khi thêm mới: chỉ cho chọn mục chưa có ngân sách (mục đã có thì sửa từ danh sách)
  const selectable = isEditing
    ? categories
    : categories.filter((c) => !takenCategoryIds.has(c.id));
  const showTotalOption = isEditing ? true : !hasTotalBudget;

  const amount = parseVND(amountText);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      setError("Nhập số tiền lớn hơn 0.");
      return;
    }
    setError(null);
    try {
      await save.mutateAsync({ category_id: categoryId || null, month, amount });
      onClose();
    } catch {
      setError("Không lưu được. Kiểm tra kết nối rồi thử lại.");
    }
  }

  async function removeBudget() {
    try {
      await save.mutateAsync({ category_id: target.categoryId, month, amount: 0 });
      onClose();
    } catch {
      setError("Không xóa được. Thử lại sau.");
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="sheet-enter fixed inset-x-0 bottom-0 m-0 w-full max-w-none rounded-t-2xl border-t border-rule bg-paper p-0 text-ink backdrop:bg-ink/30 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[26rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
    >
      <form onSubmit={submit} className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Sửa ngân sách" : "Thêm ngân sách"}{" "}
            <span className="text-sm font-normal text-muted">· {formatMonth(month)}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-paper-2 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-3">
          <span className="mb-1 block text-sm text-ink-2">Áp dụng cho</span>
          <AppSelect
            ariaLabel="Áp dụng cho"
            value={categoryId}
            onChange={setCategoryId}
            isDisabled={isEditing}
            options={[
              ...(showTotalOption ? [{ value: "", label: "Cả tháng (tổng chi)" }] : []),
              ...selectable.map((c) => ({
                value: c.id,
                label: c.name,
                color: c.color,
              })),
            ]}
          />
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-ink-2">Hạn mức</span>
          <div className="focus-ring flex items-center rounded-xl border border-rule bg-paper-2">
            <input
              inputMode="numeric"
              autoFocus
              value={amountText}
              onChange={(e) =>
                setAmountText(formatAmountInput(parseVND(e.target.value)))
              }
              placeholder="0"
              className="tnum w-full bg-transparent px-3 py-2.5 text-right text-xl font-semibold outline-none placeholder:text-muted"
            />
            <span className="pr-3 text-muted">₫</span>
          </div>
        </label>

        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={removeBudget}
              disabled={save.isPending}
              className="whitespace-nowrap rounded-xl border border-rule px-4 py-3 text-sm text-danger transition-colors duration-150 hover:bg-danger-soft disabled:opacity-60"
            >
              <Trash2 size={16} aria-hidden className="mr-1.5 inline-block align-[-3px]" />
              Bỏ hạn mức
            </button>
          )}
          <button
            type="submit"
            disabled={save.isPending}
            className="flex-1 whitespace-nowrap rounded-xl bg-accent-deep py-3 font-medium text-paper transition-colors duration-150 hover:bg-accent disabled:opacity-60"
          >
            {save.isPending ? "Đang lưu…" : isEditing ? "Lưu thay đổi" : "Thêm"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
