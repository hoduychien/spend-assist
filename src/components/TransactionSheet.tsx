import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Category, Transaction } from "../lib/types";
import {
  formatAmountInput,
  parseVND,
  todayISO,
} from "../lib/format";
import { useSaveTransaction } from "../lib/queries";
import { AppDatePicker, AppSelect } from "./fields";

/**
 * Thêm / sửa giao dịch — bottom sheet trên mobile, panel giữa màn hình trên desktop.
 * Dùng <dialog> để có focus-trap và Esc-để-đóng miễn phí.
 */
export function TransactionSheet({
  categories,
  editing,
  onClose,
}: {
  categories: Category[];
  editing: Transaction | null; // null = thêm mới
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const save = useSaveTransaction();

  const [amountText, setAmountText] = useState(
    editing ? formatAmountInput(editing.amount) : ""
  );
  const [categoryId, setCategoryId] = useState<string>(
    editing?.category_id ?? categories[0]?.id ?? ""
  );
  const [date, setDate] = useState(editing?.occurred_on ?? todayISO());
  const [note, setNote] = useState(editing?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const amount = parseVND(amountText);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      setError("Nhập số tiền lớn hơn 0.");
      return;
    }
    setError(null);
    try {
      await save.mutateAsync({
        id: editing?.id,
        amount,
        category_id: categoryId || null,
        note: note.trim(),
        occurred_on: date,
      });
      onClose(); // thành công thì đóng — không cần toast
    } catch {
      setError("Không lưu được. Kiểm tra kết nối rồi thử lại.");
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // bấm nền để đóng
      }}
      className="sheet-enter fixed inset-x-0 bottom-0 m-0 w-full max-w-none rounded-t-2xl border-t border-rule bg-paper p-0 text-ink backdrop:bg-ink/30 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[26rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
    >
      <form onSubmit={submit} className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editing ? "Sửa giao dịch" : "Thêm giao dịch"}
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
          <span className="mb-1 block text-sm text-ink-2">Số tiền</span>
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

        <div className="mb-3">
          <span className="mb-1 block text-sm text-ink-2">Danh mục</span>
          <AppSelect
            ariaLabel="Danh mục"
            value={categoryId}
            onChange={setCategoryId}
            options={categories.map((c) => ({
              value: c.id,
              label: c.name,
              color: c.color,
            }))}
          />
        </div>

        <div className="mb-3">
          <span className="mb-1 block text-sm text-ink-2">Ngày</span>
          <AppDatePicker value={date} onChange={setDate} />
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-ink-2">
            Ghi chú <span className="text-muted">(không bắt buộc)</span>
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Bún bò, tiền điện…"
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
