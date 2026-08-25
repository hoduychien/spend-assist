import { useEffect, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";

interface ToastAction {
  label: string; // vd. "Hoàn tác"
  onClick: () => void;
}

interface ToastItem {
  id: number;
  kind: "success" | "error";
  message: string;
  action?: ToastAction;
}

// Kênh sự kiện tối giản: gọi toast.* từ bất kỳ đâu (kể cả ngoài component),
// <Toaster/> mount một lần ở App lắng nghe và hiển thị.
let listener: ((t: ToastItem) => void) | null = null;
let nextId = 1;

function emit(kind: ToastItem["kind"], message: string, action?: ToastAction) {
  listener?.({ id: nextId++, kind, message, action });
}

export const toast = {
  success: (message: string, action?: ToastAction) => emit("success", message, action),
  error: (message: string, action?: ToastAction) => emit("error", message, action),
};

/**
 * Thông báo nổi dưới đáy màn hình — pill nền tối (bg-ink) thống nhất một kiểu
 * cho mọi thao tác dữ liệu. Xếp chồng dọc nên không bao giờ đè lên nhau;
 * toast có nút hành động (vd. Hoàn tác) hiển thị lâu hơn.
 */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    listener = (t) => {
      setItems((xs) => [...xs, t].slice(-3)); // tối đa 3 toast cùng lúc
      setTimeout(
        () => setItems((xs) => xs.filter((x) => x.id !== t.id)),
        t.action ? 7000 : 3200
      );
    };
    return () => {
      listener = null;
    };
  }, []);

  if (items.length === 0) return null;

  const dismiss = (id: number) => setItems((xs) => xs.filter((x) => x.id !== id));

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="toast-enter pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-sm text-paper shadow-lg"
        >
          {t.kind === "success" ? (
            <Check size={16} aria-hidden className="shrink-0 text-accent" />
          ) : (
            <TriangleAlert size={16} aria-hidden className="shrink-0 text-warn" />
          )}
          <span className="min-w-0">{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
              className="whitespace-nowrap font-medium text-accent underline underline-offset-2"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
