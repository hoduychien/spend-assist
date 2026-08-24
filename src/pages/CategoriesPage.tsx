import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useCategories, useDeleteCategory, useSaveCategory } from "../lib/queries";
import type { Category } from "../lib/types";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CategoryIcon,
  ICON_KEYS,
} from "../components/CategoryIcon";

export function CategoriesPage() {
  const { data: categories = [] } = useCategories();
  const del = useDeleteCategory();
  const [sheet, setSheet] = useState<{ open: boolean; editing: Category | null }>({
    open: false,
    editing: null,
  });
  const [confirming, setConfirming] = useState<Category | null>(null);

  return (
    <>
      <header className="page-head flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Danh mục</h1>
        <button
          onClick={() => setSheet({ open: true, editing: null })}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-accent-deep px-4 py-2.5 text-sm font-medium text-paper transition-colors duration-150 hover:bg-accent"
        >
          <Plus size={16} aria-hidden />
          Thêm
        </button>
      </header>

      <ul className="divide-y divide-rule-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-3">
            <CategoryIcon icon={c.icon} color={c.color} />
            <span className="min-w-0 flex-1 truncate">{c.name}</span>
            <button
              onClick={() => setSheet({ open: true, editing: c })}
              aria-label={`Sửa danh mục ${c.name}`}
              className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-paper-2 hover:text-ink"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => setConfirming(c)}
              aria-label={`Xóa danh mục ${c.name}`}
              className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Xóa danh mục sẽ không xóa giao dịch — chúng chuyển thành "Không có danh mục".
        Ngân sách gắn với danh mục đó sẽ bị gỡ.
      </p>

      {sheet.open && (
        <CategorySheet
          editing={sheet.editing}
          onClose={() => setSheet({ open: false, editing: null })}
        />
      )}

      {/* Xóa danh mục ảnh hưởng ngân sách + giao dịch → hỏi lại một lần */}
      {confirming && (
        <ConfirmDialog
          category={confirming}
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            del.mutate(confirming.id);
            setConfirming(null);
          }}
        />
      )}
    </>
  );
}

function CategorySheet({
  editing,
  onClose,
}: {
  editing: Category | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const save = useSaveCategory();
  const [name, setName] = useState(editing?.name ?? "");
  const [icon, setIcon] = useState(editing?.icon ?? ICON_KEYS[0]);
  const [color, setColor] = useState(editing?.color ?? CATEGORY_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nhập tên danh mục.");
      return;
    }
    try {
      await save.mutateAsync({ id: editing?.id, name: name.trim(), icon, color });
      onClose();
    } catch {
      setError("Không lưu được — có thể tên này đã tồn tại.");
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
            {editing ? "Sửa danh mục" : "Thêm danh mục"}
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

        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-ink-2">Tên</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cà phê, thú cưng…"
            className="w-full rounded-xl border border-rule bg-paper-2 px-3 py-2.5 focus-ring outline-none placeholder:text-muted"
          />
        </label>

        <fieldset className="mb-4">
          <legend className="mb-1.5 text-sm text-ink-2">Biểu tượng</legend>
          <div className="flex flex-wrap gap-1.5">
            {ICON_KEYS.map((key) => {
              const Icon = CATEGORY_ICONS[key];
              const active = icon === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  aria-label={key}
                  aria-pressed={active}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-150 ${
                    active
                      ? "border-accent bg-accent-soft text-accent-deep"
                      : "border-rule text-ink-2 hover:bg-paper-2"
                  }`}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mb-5">
          <legend className="mb-1.5 text-sm text-ink-2">Màu</legend>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_COLORS.map((c) => {
              const active = color === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Màu ${c}`}
                  aria-pressed={active}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-150"
                  style={{
                    borderColor: active ? c : "var(--color-rule)",
                    background: active
                      ? `color-mix(in oklab, ${c} 12%, transparent)`
                      : undefined,
                  }}
                >
                  <span
                    aria-hidden
                    className="h-5 w-5 rounded-full"
                    style={{ background: c }}
                  />
                </button>
              );
            })}
          </div>
        </fieldset>

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
          {save.isPending ? "Đang lưu…" : "Lưu"}
        </button>
      </form>
    </dialog>
  );
}

function ConfirmDialog({
  category,
  onCancel,
  onConfirm,
}: {
  category: Category;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      className="sheet-enter fixed left-1/2 top-1/2 m-0 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rule bg-paper p-5 text-ink backdrop:bg-ink/30"
    >
      <h2 className="mb-2 text-lg font-semibold">Xóa "{category.name}"?</h2>
      <p className="mb-4 text-sm leading-relaxed text-ink-2">
        Giao dịch thuộc danh mục này sẽ chuyển thành "Không có danh mục". Ngân sách
        của danh mục sẽ bị gỡ. Không hoàn tác được.
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="whitespace-nowrap rounded-xl border border-rule px-4 py-2 text-sm transition-colors duration-150 hover:bg-paper-2"
        >
          Giữ lại
        </button>
        <button
          onClick={onConfirm}
          className="whitespace-nowrap rounded-xl bg-danger px-4 py-2 text-sm font-medium text-paper transition-colors duration-150 hover:opacity-90"
        >
          Xóa danh mục
        </button>
      </div>
    </dialog>
  );
}
