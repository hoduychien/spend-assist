import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  useCategories,
  useDeleteTransaction,
  useSaveTransaction,
  useTransactions,
} from "../lib/queries";
import { formatDayHeading, formatVND, monthStartISO } from "../lib/format";
import type { Transaction } from "../lib/types";
import { CategoryIcon } from "../components/CategoryIcon";
import { MonthSwitcher } from "../components/MonthSwitcher";
import { TransactionSheet } from "../components/TransactionSheet";
import { AppSelect } from "../components/fields";

export function TransactionsPage() {
  const [month, setMonth] = useState(monthStartISO());
  const [categoryId, setCategoryId] = useState<string>("");
  const { data: categories = [] } = useCategories();
  const { data: transactions = [], isLoading } = useTransactions({
    monthISO: month,
    categoryId: categoryId || null,
  });
  const del = useDeleteTransaction();

  const [sheet, setSheet] = useState<{ open: boolean; editing: Transaction | null }>({
    open: false,
    editing: null,
  });
  const [undo, setUndo] = useState<Transaction | null>(null);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Nhóm theo ngày
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const list = map.get(t.occurred_on) ?? [];
      list.push(t);
      map.set(t.occurred_on, list);
    }
    return [...map.entries()];
  }, [transactions]);

  const monthTotal = transactions.reduce((s, t) => s + t.amount, 0);

  function remove(t: Transaction) {
    del.mutate(t.id);
    setUndo(t);
    window.setTimeout(() => setUndo((u) => (u?.id === t.id ? null : u)), 7000);
  }

  return (
    <>
      <header className="page-head flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Giao dịch</h1>
        <button
          onClick={() => setSheet({ open: true, editing: null })}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-accent-deep px-4 py-2.5 text-sm font-medium text-paper transition-colors duration-150 hover:bg-accent"
        >
          <Plus size={16} aria-hidden />
          Thêm
        </button>
      </header>

      {/* Bộ lọc — một hàng, phía trên danh sách */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <MonthSwitcher month={month} onChange={setMonth} />
        <div className="w-48">
          <AppSelect
            ariaLabel="Lọc theo danh mục"
            value={categoryId}
            onChange={setCategoryId}
            options={[
              { value: "", label: "Tất cả danh mục" },
              ...categories.map((c) => ({
                value: c.id,
                label: c.name,
                color: c.color,
              })),
            ]}
          />
        </div>
      </div>

      {transactions.length > 0 && (
        <p className="tnum mb-4 text-sm text-muted">
          Tổng: <span className="font-medium text-ink">{formatVND(monthTotal)}</span> ·{" "}
          {transactions.length} giao dịch
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted">Đang tải…</p>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-rule px-4 py-8 text-center">
          <p className="text-sm text-ink-2">Không có giao dịch nào trong khoảng này.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([day, list]) => (
            <section key={day} aria-label={formatDayHeading(day)}>
              <div className="mb-1 flex items-baseline justify-between">
                <h2 className="font-body text-sm font-medium text-ink-2">
                  {formatDayHeading(day)}
                </h2>
                <span className="tnum text-xs text-muted">
                  {formatVND(list.reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <ul className="divide-y divide-rule-2">
                {list.map((t) => {
                  const cat = t.category_id ? catById.get(t.category_id) : undefined;
                  return (
                    <li key={t.id} className="group flex items-center gap-3 py-2.5">
                      <CategoryIcon
                        icon={cat?.icon ?? "ellipsis"}
                        color={cat?.color ?? "#A16207"}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          {t.note || cat?.name || "Không có danh mục"}
                          {t.is_sample && (
                            <span className="ml-2 rounded bg-paper-3 px-1.5 py-0.5 text-[10px] text-muted">
                              mẫu
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted">
                          {cat?.name ?? "Không có danh mục"}
                        </p>
                      </div>
                      <span className="tnum shrink-0 text-sm font-medium">
                        {formatVND(t.amount)}
                      </span>
                      <span className="flex shrink-0 gap-0.5">
                        <button
                          onClick={() => setSheet({ open: true, editing: t })}
                          aria-label={`Sửa: ${t.note ?? formatVND(t.amount)}`}
                          className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-paper-2 hover:text-ink"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => remove(t)}
                          aria-label={`Xóa: ${t.note ?? formatVND(t.amount)}`}
                          className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 size={15} />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Undo sau khi xóa — cố định góc màn hình, không đẩy layout */}
      {undo && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-xl bg-ink px-4 py-2.5 text-sm text-paper shadow-lg lg:bottom-6"
        >
          Đã xóa giao dịch.
          <UndoButton tx={undo} onDone={() => setUndo(null)} />
        </div>
      )}

      {sheet.open && (
        <TransactionSheet
          categories={categories}
          editing={sheet.editing}
          onClose={() => setSheet({ open: false, editing: null })}
        />
      )}
    </>
  );
}

function UndoButton({ tx, onDone }: { tx: Transaction; onDone: () => void }) {
  const save = useSaveTransaction();
  return (
    <button
      onClick={async () => {
        await save.mutateAsync({
          amount: tx.amount,
          category_id: tx.category_id,
          note: tx.note ?? "",
          occurred_on: tx.occurred_on,
        });
        onDone();
      }}
      className="whitespace-nowrap font-medium text-accent underline underline-offset-2"
    >
      Hoàn tác
    </button>
  );
}
