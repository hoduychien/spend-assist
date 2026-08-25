import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Logo } from "../components/Logo";

type Mode = "login" | "signup";

export function AuthPage() {
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Xác thực 2 bước: sau khi mật khẩu đúng, nhập mã 6 số gửi qua email
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [otp, setOtp] = useState("");
  // Chặn điều hướng trong lúc phiên tạm (mật khẩu đúng nhưng chưa qua bước 2)
  const [gate, setGate] = useState(false);

  if (session && !gate) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      if (mode === "login") {
        setGate(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Mật khẩu đúng → xem tài khoản có bật xác thực 2 bước không
        const { data: prof } = await supabase
          .from("profiles")
          .select("two_factor_enabled")
          .maybeSingle();
        if (prof?.two_factor_enabled) {
          // Hủy phiên tạm, gửi mã OTP qua email — chỉ verify đúng mã mới có phiên
          await supabase.auth.signOut();
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false },
          });
          if (otpError) throw otpError;
          setStep("otp");
          setNotice(`Đã gửi mã 6 số tới ${email}. Nhập mã để hoàn tất đăng nhập.`);
        }
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
      setGate(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: "email",
      });
      if (error) throw error;
      // Phiên được tạo → <Navigate> phía trên tự chuyển vào app
    } catch {
      setError("Mã chưa đúng hoặc đã hết hạn. Kiểm tra lại hoặc gửi lại mã.");
    } finally {
      setPending(false);
    }
  }

  async function resendCode() {
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setNotice("Đã gửi lại mã. Kiểm tra hộp thư (kể cả mục spam).");
    } catch {
      setError("Chưa gửi lại được mã. Đợi một lát rồi thử lại.");
    } finally {
      setPending(false);
    }
  }

  // ---- Bước 2: nhập mã OTP từ email ----
  if (step === "otp") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
        <header className="mb-8">
          <p className="flex items-center gap-2.5 font-display text-2xl font-semibold">
            <Logo size={34} />
            Spend Assist
          </p>
          <h1 className="mt-4 text-lg font-semibold">Xác thực 2 bước</h1>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            Nhập mã 6 số vừa được gửi tới <span className="font-medium">{email}</span>.
          </p>
        </header>

        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <label>
            <span className="mb-1 block text-sm text-ink-2">Mã xác thực</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              minLength={6}
              maxLength={6}
              pattern="[0-9]{6}"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="tnum w-full rounded-xl border border-rule bg-paper-2 px-3 py-2.5 text-center text-2xl font-semibold tracking-[0.4em] focus-ring outline-none placeholder:text-muted"
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
            disabled={pending || otp.length < 6}
            className="mt-1 whitespace-nowrap rounded-xl bg-accent-deep py-3 font-medium text-paper transition-colors duration-150 hover:bg-accent disabled:opacity-60"
          >
            {pending ? "Đang kiểm tra…" : "Xác nhận"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            onClick={() => {
              setStep("credentials");
              setOtp("");
              setError(null);
              setNotice(null);
            }}
            className="text-muted transition-colors duration-150 hover:text-ink"
          >
            ← Quay lại đăng nhập
          </button>
          <button
            onClick={resendCode}
            disabled={pending}
            className="text-accent-deep transition-colors duration-150 hover:text-accent disabled:opacity-60"
          >
            Gửi lại mã
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      {/* Nhãn hiệu — wordmark + dấu chấm accent, không hero marketing */}
      <header className="mb-8">
        <p className="flex items-center gap-2.5 font-display text-2xl font-semibold">
          <Logo size={34} />
          Spend Assist
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
            placeholder="Nhập email của bạn"
            className="w-full rounded-xl border border-rule bg-paper-2 px-3 py-2.5 focus-ring outline-none placeholder:text-muted"
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
            placeholder="Ít nhất 6 ký tự"
            className="w-full rounded-xl border border-rule bg-paper-2 px-3 py-2.5 focus-ring outline-none placeholder:text-muted"
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
