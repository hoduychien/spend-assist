import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, Undo2, X } from "lucide-react";
import {
  useCategories,
  useDebts,
  useDeleteDebt,
  useSaveDebt,
  useSetDebtPaid,
} from "../lib/queries";
import {
  daysUntil,
  formatAmountInput,
  formatShortDate,
  formatVND,
  parseVND,
  todayISO,
} from "../lib/format";
import type { Debt } from "../lib/types";
import { AppDatePicker } from "../components/fields";

type DueStatus = "over" | "soon" | "ok";

export function dueStatus(debt: Debt): DueStatus {
  const days = daysUntil(debt.due_date);
  if (days < 0) return "over";
  if (days <= 7) return "soon";
  return "ok";
}

export function dueLabel(debt: Debt): string {
  const days = daysUntil(debt.due_date);
  if (days < 0) return `Quá hạn ${-days} ngày`;
  if (days === 0) return "Đến hạn hôm nay";
  if (days <= 7) return `Còn ${days} ngày`;
  return `Đến hạn ${formatShortDate(debt.due_date)}`;
}

export function DebtsPage() {
  const { data: debts = [], isLoading } = useDebts();
  const del = useDeleteDebt();
  const [sheet, setSheet] = useState<{ open: boolean; editing: Debt | null }>({
    open: false,
    editing: null,
  });
  const [paying, setPaying] = useState<Debt | null>(null);

  const unpaid = debts.filter((d) => !d.paid_at);
  const paid = debts
    .filter((d) => d.paid_at)
    .sort((a, b) => (b.paid_at! < a.paid_at! ? -1 : 1));
  const totalUnpaid = unpaid.reduce((s, d) => s + d.amount, 0);

  return (
    <>
      <header className="page-head flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dư nợ</h1>
        <button
          onClick={() => setSheet({ open: true, editing: null })}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-accent-deep px-4 py-2.5 text-sm font-medium text-paper transition-colors duration-150 hover:bg-accent"
        >
          <Plus size={16} aria-hidden />
          Thêm
        </button>
      </header>

      {/* Tổng dư nợ chưa trả */}
      <section className="mb-7 border-b border-rule pb-5">
        <p className="text-sm text-muted">Còn phải trả</p>
        <p className="tnum font-display text-4xl font-semibold tracking-tight">
          {formatVND(totalUnpaid)}
        </p>
        {unpaid.length > 0 && (
          <p className="mt-1 text-sm text-muted">
            {unpaid.length} khoản · gần nhất:{" "}
            {formatShortDate(unpaid[0].due_date)}
          </p>
        )}
      </section>

      {isLoading ? (
        <p className="text-sm text-muted">Đang tải…</p>
      ) : unpaid.length === 0 ? (
        <div className="rounded-xl border border-dashed border-rule px-4 py-8 text-center">
          <p className="text-sm text-ink-2">
            Không có khoản nợ nào đang chờ trả. Nhẹ cả người.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {unpaid.map((d) => {
            const status = dueStatus(d);
            return (
              <li
                key={d.id}
                className={`rounded-xl border px-4 py-3 ${
                  status === "over"
                    ? "border-danger/40 bg-danger-soft"
                    : status === "soon"
                      ? "border-warn/50 bg-warn-soft"
                      : "border-rule"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p
                      className="text-xs"
                      style={{
                        color:
                          status === "over"
                            ? "var(--color-danger)"
                            : status === "soon"
                              ? "var(--color-warn-deep)"
                              : "var(--color-muted)",
                      }}
                    >
                      {dueLabel(d)}
                      {d.note ? ` · ${d.note}` : ""}
                    </p>
                  </div>
                  <span className="tnum shrink-0 text-sm font-semibold">
                    {formatVND(d.amount)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setPaying(d)}
                    className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-accent-deep px-3 py-1.5 text-xs font-medium text-paper transition-colors duration-150 hover:bg-accent"
                  >
                    <Check size={13} aria-hidden />
                    Đã trả
                  </button>
                  <button
                    onClick={() => setSheet({ open: true, editing: d })}
                    aria-label={`Sửa khoản nợ ${d.name}`}
                    className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-paper-2 hover:text-ink"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => del.mutate(d.id)}
                    aria-label={`Xóa khoản nợ ${d.name}`}
                    className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Đã trả */}
      {paid.length > 0 && (
        <section aria-label="Đã trả" className="mt-8">
          <h2 className="mb-2 text-sm font-medium text-ink-2">Đã trả</h2>
          <ul className="divide-y divide-rule-2">
            {paid.map((d) => (
              <PaidRow key={d.id} debt={d} />
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 max-w-prose text-xs leading-relaxed text-muted">
        Khoản quá hạn hiện đỏ, còn 7 ngày trở xuống hiện vàng. Khi đánh dấu "Đã trả"
        bạn có thể ghi luôn thành một khoản chi hôm nay để tính vào ngân sách.
      </p>

      {sheet.open && (
        <DebtSheet
          editing={sheet.editing}
          onClose={() => setSheet({ open: false, editing: null })}
        />
      )}
      {paying && <PayDialog debt={paying} onClose={() => setPaying(null)} />}
    </>
  );
}

function PaidRow({ debt }: { debt: Debt }) {
  const setPaid = useSetDebtPaid();
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Check size={15} aria-hidden className="shrink-0 text-accent-deep" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink-2">{debt.name}</p>
        <p className="text-xs text-muted">
          Hạn {formatShortDate(debt.due_date)}
        </p>
      </div>
      <span className="tnum shrink-0 text-sm text-muted">
        {formatVND(debt.amount)}
      </span>
      <button
        onClick={() => setPaid.mutate({ debt, paid: false })}
        aria-label={`Đánh dấu chưa trả: ${debt.name}`}
        title="Đánh dấu chưa trả"
        className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-paper-2 hover:text-ink"
      >
        <Undo2 size={14} />
      </button>
    </li>
  );
}

function PayDialog({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const setPaid = useSetDebtPaid();
  const { data: categories = [] } = useCategories();
  // Ưu tiên danh mục "Dư nợ" (migration 0004); chưa có thì rơi về "Khác"
  const debtCat =
    categories.find((c) => c.name === "Dư nợ") ??
    categories.find((c) => c.name === "Khác");
  const debtCatId = debtCat?.id ?? null;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  async function confirm(logTransaction: boolean) {
    await setPaid.mutateAsync({
      debt,
      paid: true,
      logTransaction,
      categoryId: debtCatId,
    });
    onClose();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="sheet-enter fixed left-1/2 top-1/2 m-0 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rule bg-paper p-5 text-ink backdrop:bg-ink/30"
    >
      <h2 className="mb-1 text-lg font-semibold">Đã trả "{debt.name}"</h2>
      <p className="tnum mb-4 text-sm text-ink-2">
        {formatVND(debt.amount)} — có ghi thành khoản chi hôm nay không? Khoản chi sẽ
        vào danh mục "{debtCat?.name ?? "Dư nợ"}" và tính vào ngân sách tháng này.
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => confirm(true)}
          disabled={setPaid.isPending}
          className="whitespace-nowrap rounded-xl bg-accent-deep py-2.5 text-sm font-medium text-paper transition-colors duration-150 hover:bg-accent disabled:opacity-60"
        >
          Đánh dấu + ghi khoản chi
        </button>
        <button
          onClick={() => confirm(false)}
          disabled={setPaid.isPending}
          className="whitespace-nowrap rounded-xl border border-rule py-2.5 text-sm transition-colors duration-150 hover:bg-paper-2 disabled:opacity-60"
        >
          Chỉ đánh dấu đã trả
        </button>
      </div>
    </dialog>
  );
}

function DebtSheet({
  editing,
  onClose,
}: {
  editing: Debt | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const save = useSaveDebt();
  const [name, setName] = useState(editing?.name ?? "");
  const [amountText, setAmountText] = useState(
    editing ? formatAmountInput(editing.amount) : ""
  );
  const [dueDate, setDueDate] = useState(editing?.due_date ?? todayISO());
  const [note, setNote] = useState(editing?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const amount = parseVND(amountText);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nhập tên khoản nợ.");
      return;
    }
    if (amount <= 0) {
      setError("Nhập số tiền lớn hơn 0.");
      return;
    }
    setError(null);
    try {
      await save.mutateAsync({
        id: editing?.id,
        name: name.trim(),
        amount,
        due_date: dueDate,
        note: note.trim(),
      });
      onClose();
    } catch {
      setError("Không lưu được. Kiểm tra kết nối rồi thử lại.");
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
            {editing ? "Sửa khoản nợ" : "Thêm khoản nợ"}
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

        <label className="mb-3 block">
          <span className="mb-1 block text-sm text-ink-2">Tên khoản nợ</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Thẻ tín dụng VCB, vay bạn…"
            className="focus-ring w-full rounded-xl border border-rule bg-paper-2 px-3 py-2.5 outline-none placeholder:text-muted"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm text-ink-2">Số tiền</span>
          <div className="focus-ring flex items-center rounded-xl border border-rule bg-paper-2">
            <input
              inputMode="numeric"
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

        <div className="mb-3">
          <span className="mb-1 block text-sm text-ink-2">Ngày tới hạn</span>
          <AppDatePicker value={dueDate} onChange={setDueDate} allowFuture />
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-ink-2">
            Ghi chú <span className="text-muted">(không bắt buộc)</span>
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Kỳ sao kê tháng 8…"
            className="focus-ring w-full rounded-xl border border-rule bg-paper-2 px-3 py-2.5 outline-none placeholder:text-muted"
          />
        </label>

        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={save.isPending}
          className="w-full whitespace-nowrap rounded-xl bg-accent-deep py-3 font-medium text-paper transition-colors duration-150 hover:bg-accent disabled:opacity-60"
        >
          {save.isPending ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Thêm"}
        </button>
      </form>
    </dialog>
  );
}
