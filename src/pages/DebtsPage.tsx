import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, Undo2, X } from "lucide-react";
import {
  useCategories,
  useDebts,
  useDeleteDebt,
  useDeleteRecurringItem,
  useProfile,
  useRecurringItems,
  useSaveDebt,
  useSaveRecurringItem,
  useSetDebtPaid,
  useSetRecurringPaid,
  useTransactions,
} from "../lib/queries";
import {
  daysUntil,
  formatAmountInput,
  formatMonth,
  formatShortDate,
  formatVND,
  monthEndISO,
  monthStartISO,
  parseVND,
  payCycleMonth,
  paydayOfMonth,
  todayISO,
} from "../lib/format";
import type { Category, Debt, RecurringItem } from "../lib/types";
import {
  AppAmountInput,
  AppCheckbox,
  AppDatePicker,
  AppSelect,
} from "../components/fields";
import { CategoryIcon } from "../components/CategoryIcon";

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
  const { data: profile } = useProfile();
  const payday = profile?.payday ?? null;
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
                      {payday
                        ? ` · tính vào ${formatMonth(payCycleMonth(d.due_date, payday))}`
                        : ""}
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

      {/* Khoản cố định hàng tháng */}
      <RecurringSection />

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
        bạn có thể ghi luôn thành một khoản chi để tính vào ngân sách
        {payday
          ? " — khoản chi được quy về tháng theo kỳ lương (đặt trong Cài đặt)"
          : ""}
        .
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

/**
 * Khoản cố định hàng tháng (tiền nhà, internet, subscription…).
 * "Đã trả tháng này" = tồn tại transaction external_id "recurring:<id>:<yyyy-mm>".
 */
function RecurringSection() {
  const monthISO = monthStartISO();
  const monthKey = monthISO.slice(0, 7);
  const { data: items = [] } = useRecurringItems();
  const { data: monthTx = [] } = useTransactions({ monthISO });
  const { data: categories = [] } = useCategories();
  const del = useDeleteRecurringItem();
  const setPaid = useSetRecurringPaid();
  const [sheet, setSheet] = useState<{ open: boolean; editing: RecurringItem | null }>({
    open: false,
    editing: null,
  });

  const paidIds = useMemo(() => {
    const suffix = `:${monthKey}`;
    return new Set(
      monthTx
        .map((t) => t.external_id)
        .filter((x): x is string => !!x && x.startsWith("recurring:") && x.endsWith(suffix))
        .map((x) => x.split(":")[1])
    );
  }, [monthTx, monthKey]);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Khoản có thời hạn: hết hiệu lực sau tháng chứa end_date
  const active = items.filter((r) => !r.end_date || monthKey <= r.end_date.slice(0, 7));
  const expired = items.filter((r) => r.end_date && monthKey > r.end_date.slice(0, 7));
  const totalMonthly = active.reduce((s, r) => s + r.amount, 0);

  return (
    <section aria-label="Cố định hàng tháng" className="mt-8">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-ink-2">
          Cố định hàng tháng
          {active.length > 0 && (
            <span className="tnum ml-2 font-normal text-muted">
              {formatVND(totalMonthly)}/tháng
            </span>
          )}
        </h2>
        <button
          onClick={() => setSheet({ open: true, editing: null })}
          className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-rule px-3 py-1.5 text-sm text-ink-2 transition-colors duration-150 hover:bg-paper-2"
        >
          <Plus size={14} aria-hidden />
          Thêm
        </button>
      </div>

      {active.length === 0 ? (
        <div className="rounded-xl border border-dashed border-rule px-4 py-5 text-center">
          <p className="text-sm text-ink-2">
            {expired.length > 0
              ? "Các khoản cố định đều đã hết thời hạn — không còn gì phải trả hàng tháng."
              : 'Chưa có khoản cố định nào — thêm tiền nhà, internet, subscription… để mỗi tháng chỉ cần bấm "Đã thanh toán".'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-rule-2">
          {active.map((r) => {
            const cat = r.category_id ? catById.get(r.category_id) : undefined;
            const dueISO = paydayOfMonth(monthISO, r.due_day);
            const isPaid = paidIds.has(r.id);
            const days = daysUntil(dueISO);
            const endText = r.end_date
              ? ` · đến hết ${formatShortDate(r.end_date)}`
              : "";
            const statusText =
              (isPaid
                ? "Đã trả tháng này"
                : days < 0
                  ? `Quá hạn ${-days} ngày (ngày ${r.due_day})`
                  : days === 0
                    ? "Đến hạn hôm nay"
                    : `Ngày ${r.due_day} hàng tháng · còn ${days} ngày`) + endText;
            const statusColor = isPaid
              ? "var(--color-accent-deep)"
              : days < 0
                ? "var(--color-danger)"
                : days <= 7
                  ? "var(--color-warn-deep)"
                  : "var(--color-muted)";
            return (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <CategoryIcon
                  icon={cat?.icon ?? "ellipsis"}
                  color={cat?.color ?? "#A16207"}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="truncate text-xs" style={{ color: statusColor }}>
                    {statusText}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <span className="tnum shrink-0 text-sm font-medium">
                  {formatVND(r.amount)}
                </span>
                {isPaid ? (
                  <button
                    onClick={() => setPaid.mutate({ item: r, monthKey, paid: false })}
                    disabled={setPaid.isPending}
                    aria-label={`Hoàn tác thanh toán: ${r.name}`}
                    title="Hoàn tác thanh toán tháng này"
                    className="rounded-lg p-1.5 text-accent-deep transition-colors duration-150 hover:bg-paper-2 disabled:opacity-60"
                  >
                    <Undo2 size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => setPaid.mutate({ item: r, monthKey, paid: true })}
                    disabled={setPaid.isPending}
                    className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-accent-deep px-3 py-1.5 text-xs font-medium text-paper transition-colors duration-150 hover:bg-accent disabled:opacity-60"
                  >
                    <Check size={13} aria-hidden />
                    Đã thanh toán
                  </button>
                )}
                <button
                  onClick={() => setSheet({ open: true, editing: r })}
                  aria-label={`Sửa khoản cố định ${r.name}`}
                  className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-paper-2 hover:text-ink"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => del.mutate(r.id)}
                  aria-label={`Xóa khoản cố định ${r.name}`}
                  className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Khoản đã hết thời hạn — giữ lại để xem/xóa, không còn phải trả */}
      {expired.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1 text-xs font-medium text-muted">Đã hết thời hạn</h3>
          <ul className="divide-y divide-rule-2">
            {expired.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2 opacity-70">
                <CategoryIcon
                  icon={catById.get(r.category_id ?? "")?.icon ?? "ellipsis"}
                  color={catById.get(r.category_id ?? "")?.color ?? "#A16207"}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-2">{r.name}</p>
                  <p className="text-xs text-muted">
                    Kỳ cuối: {formatShortDate(r.end_date!)}
                  </p>
                </div>
                <span className="tnum shrink-0 text-sm text-muted">
                  {formatVND(r.amount)}
                </span>
                <button
                  onClick={() => setSheet({ open: true, editing: r })}
                  aria-label={`Sửa khoản cố định ${r.name}`}
                  className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-paper-2 hover:text-ink"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => del.mutate(r.id)}
                  aria-label={`Xóa khoản cố định ${r.name}`}
                  className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {active.length > 0 && (
        <p className="mt-3 max-w-prose text-xs leading-relaxed text-muted">
          Bấm "Đã thanh toán" sẽ ghi ngay thành khoản chi của tháng này và trừ vào
          hạn mức ngân sách của danh mục tương ứng. Hoàn tác sẽ xóa khoản chi đó.
        </p>
      )}

      {sheet.open && (
        <RecurringSheet
          editing={sheet.editing}
          categories={categories}
          onClose={() => setSheet({ open: false, editing: null })}
        />
      )}
    </section>
  );
}

function RecurringSheet({
  editing,
  categories,
  onClose,
}: {
  editing: RecurringItem | null;
  categories: Category[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const save = useSaveRecurringItem();
  const [name, setName] = useState(editing?.name ?? "");
  const [amountText, setAmountText] = useState(
    editing ? formatAmountInput(editing.amount) : ""
  );
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? "");
  const [dueDay, setDueDay] = useState(String(editing?.due_day ?? 1));
  const [hasEnd, setHasEnd] = useState(!!editing?.end_date);
  const [endDate, setEndDate] = useState(editing?.end_date ?? todayISO());
  const [note, setNote] = useState(editing?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const amount = parseVND(amountText);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nhập tên khoản cố định.");
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
        category_id: categoryId || null,
        due_day: Number(dueDay),
        end_date: hasEnd ? endDate : null,
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
            {editing ? "Sửa khoản cố định" : "Thêm khoản cố định"}
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
          <span className="mb-1 block text-sm text-ink-2">Tên khoản</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tiền nhà, Internet, Netflix…"
            className="focus-ring w-full rounded-xl border border-rule bg-paper-2 px-3 py-2.5 outline-none placeholder:text-muted"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm text-ink-2">Số tiền mỗi tháng</span>
          <AppAmountInput value={amountText} onChange={setAmountText} />
        </label>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <span className="mb-1 block text-sm text-ink-2">Ngày đến hạn</span>
            <AppSelect
              ariaLabel="Ngày đến hạn hàng tháng"
              value={dueDay}
              onChange={setDueDay}
              options={Array.from({ length: 31 }, (_, i) => ({
                value: String(i + 1),
                label: `Ngày ${i + 1}`,
              }))}
            />
          </div>
          <div>
            <span className="mb-1 block text-sm text-ink-2">Danh mục</span>
            <AppSelect
              ariaLabel="Danh mục"
              value={categoryId}
              onChange={setCategoryId}
              options={[
                { value: "", label: "Không có" },
                ...categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  color: c.color,
                })),
              ]}
            />
          </div>
        </div>
        <p className="-mt-1 mb-3 text-xs text-muted">
          Khi thanh toán, khoản chi sẽ trừ vào hạn mức của danh mục đã chọn.
        </p>

        {/* Có thời hạn: sau tháng chứa ngày cuối, khoản không cần thanh toán nữa */}
        <div className="mb-3">
          <AppCheckbox
            checked={hasEnd}
            onChange={setHasEnd}
            label={
              <>
                Có thời hạn <span className="text-muted">(trả góp, hợp đồng…)</span>
              </>
            }
          />
        </div>
        {hasEnd && (
          <div className="mb-3">
            <span className="mb-1 block text-sm text-ink-2">
              Ngày đến hạn thanh toán cuối cùng
            </span>
            <AppDatePicker value={endDate} onChange={setEndDate} allowFuture />
            <p className="mt-1 text-xs text-muted">
              Từ sau tháng {Number(endDate.slice(5, 7))}/{endDate.slice(0, 4)}, khoản
              này sẽ không còn phải thanh toán.
            </p>
          </div>
        )}

        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-ink-2">
            Ghi chú <span className="text-muted">(không bắt buộc)</span>
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Gói cước, số hợp đồng…"
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
  const { data: profile } = useProfile();
  const payday = profile?.payday ?? null;
  // Ưu tiên danh mục "Dư nợ" (migration 0004); chưa có thì rơi về "Khác"
  const debtCat =
    categories.find((c) => c.name === "Dư nợ") ??
    categories.find((c) => c.name === "Khác");
  const debtCatId = debtCat?.id ?? null;

  // Có ngày lương: khoản chi ghi vào tháng của kỳ lương chứa ngày tới hạn —
  // hôm nay nếu đang trong tháng đó, ngoài ra kẹp về đầu/cuối tháng đó.
  // Chưa đặt ngày lương: ghi hôm nay như cũ.
  const cycleMonth = payday ? payCycleMonth(debt.due_date, payday) : null;
  let occurredOn: string | undefined;
  if (cycleMonth) {
    const today = todayISO();
    const end = monthEndISO(cycleMonth);
    occurredOn = today < cycleMonth ? cycleMonth : today > end ? end : today;
  }

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  async function confirm(logTransaction: boolean) {
    await setPaid.mutateAsync({
      debt,
      paid: true,
      logTransaction,
      categoryId: debtCatId,
      occurredOn,
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
        {formatVND(debt.amount)} — có ghi thành khoản chi không? Khoản chi sẽ vào
        danh mục "{debtCat?.name ?? "Dư nợ"}" và tính vào ngân sách{" "}
        {cycleMonth ? formatMonth(cycleMonth).toLowerCase() : "tháng này"}.
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
