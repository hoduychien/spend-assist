import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { useAuth } from "../lib/auth";

type Mode = "login" | "signup";

export function AuthPage() {
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (session) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setNotice("Đã gửi email xác nhận. Mở hộp thư và bấm vào liên kết để hoàn tất.");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.includes("Invalid login credentials")
          ? "Email hoặc mật khẩu chưa đúng."
          : msg.includes("at least 6")
            ? "Mật khẩu cần ít nhất 6 ký tự."
            : "Không thực hiện được. Thử lại sau ít phút."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      {/* Nhãn hiệu — wordmark + dấu chấm accent, không hero marketing */}
      <header className="mb-8">
        <p className="flex items-baseline gap-1.5 font-display text-2xl font-semibold">
          Spend Assist
          <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Cuốn sổ chi tiêu của bạn — ghi lại từng khoản, biết mình còn bao nhiêu
          trước khi tháng kết thúc.
        </p>
      </header>

      <div className="mb-5 flex gap-4 border-b border-rule text-sm">
        {(["login", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
              setNotice(null);
            }}
            className={`-mb-px whitespace-nowrap border-b-2 pb-2 transition-colors duration-150 ${
              mode === m
                ? "border-accent font-medium text-ink"
                : "border-transparent text-muted hover:text-ink-2"
            }`}
          >
            {m === "login" ? "Đăng nhập" : "Đăng ký"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label>
          <span className="mb-1 block text-sm text-ink-2">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-rule bg-paper-2 px-3 py-2.5 focus-ring outline-none"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm text-ink-2">Mật khẩu</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-rule bg-paper-2 px-3 py-2.5 focus-ring outline-none"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-deep">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 whitespace-nowrap rounded-xl bg-accent-deep py-3 font-medium text-paper transition-colors duration-150 hover:bg-accent disabled:opacity-60"
        >
          {pending ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </button>
      </form>

      {!supabaseConfigured && (
        <p className="mt-6 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn-deep">
          Chưa cấu hình Supabase — sao chép <code>.env.example</code> thành{" "}
          <code>.env</code> rồi điền URL và anon key.
        </p>
      )}
    </main>
  );
}
