import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  ChevronRight,
  Database,
  LogOut,
  ShieldCheck,
  Tags,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import {
  useProfile,
  useSaveProfile,
  useSeedSampleData,
  useSetTwoFactor,
} from "../lib/queries";
import {
  daysUntilPayday,
  formatAmountInput,
  formatMonth,
  formatShortDate,
  formatVND,
  monthStartISO,
  parseVND,
  payCycleRange,
} from "../lib/format";
import { AppAmountInput, AppSelect } from "../components/fields";

const PAYDAY_OPTIONS = [
  { value: "", label: "Chưa đặt" },
  ...Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: `Ngày ${i + 1}`,
  })),
];

export function SettingsPage() {
  const { session } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const save = useSaveProfile();
  const seed = useSeedSampleData();
  const setTwoFactor = useSetTwoFactor();
  const twoFA = profile?.two_factor_enabled ?? false;

  const [payday, setPayday] = useState("");
  const [incomeText, setIncomeText] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Đổ dữ liệu profile vào form khi tải xong
  useEffect(() => {
    if (profile) {
      setPayday(profile.payday ? String(profile.payday) : "");
      setIncomeText(profile.monthly_income ? formatAmountInput(profile.monthly_income) : "");
    }
  }, [profile]);

  const income = parseVND(incomeText);
  const paydayNum = payday ? Number(payday) : null;

  const dirty =
    !isLoading &&
    (paydayNum !== (profile?.payday ?? null) ||
      income !== (profile?.monthly_income ?? 0));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await save.mutateAsync({
        payday: paydayNum,
        monthly_income: income > 0 ? income : null,
      });
      setSaved(true);
    } catch {
      setError("Không lưu được. Kiểm tra kết nối rồi thử lại.");
    }
  }

  const savedPayday = profile?.payday ?? null;
  const daysLeft = savedPayday ? daysUntilPayday(savedPayday) : null;
  // Minh họa quy ước dư nợ theo kỳ lương của tháng hiện tại
  const thisMonth = monthStartISO();
  const thisCycle = savedPayday ? payCycleRange(thisMonth, savedPayday) : null;

  return (
    <>
      <header className="page-head">
        <h1 className="text-2xl font-semibold">Cài đặt</h1>
      </header>

      {/* Tài khoản */}
      <section aria-label="Tài khoản" className="mb-7 border-b border-rule pb-6">
        <h2 className="mb-3 text-sm font-medium text-ink-2">Tài khoản</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{session?.user.email}</p>
            <p className="text-xs text-muted">Đăng nhập bằng email</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-rule px-4 py-2.5 text-sm text-ink-2 transition-colors duration-150 hover:bg-paper-2"
          >
            <LogOut size={16} aria-hidden />
            Đăng xuất
          </button>
        </div>
      </section>

      {/* Bảo mật */}
      <section aria-label="Bảo mật" className="mb-7 border-b border-rule pb-6">
        <h2 className="mb-3 text-sm font-medium text-ink-2">Bảo mật</h2>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <ShieldCheck size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-2" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Xác thực 2 bước qua email</p>
              <p className="text-xs leading-relaxed text-muted">
                Mỗi lần đăng nhập, ngoài mật khẩu bạn cần nhập thêm mã 6 số được
                gửi tới email {session?.user.email}.
              </p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={twoFA}
            aria-label="Xác thực 2 bước qua email"
            disabled={isLoading || setTwoFactor.isPending}
            onClick={() => setTwoFactor.mutate(!twoFA)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${
              twoFA ? "bg-accent-deep" : "bg-rule"
            }`}
          >
            <span
              aria-hidden
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-paper shadow transition-transform duration-200 ${
                twoFA ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
        {setTwoFactor.isError && (
          <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            Không lưu được. Kiểm tra kết nối rồi thử lại.
          </p>
        )}
      </section>

      {/* Danh mục — mobile không còn tab riêng, vào từ đây (desktop có sidebar) */}
      <section aria-label="Danh mục" className="mb-7 border-b border-rule pb-6 lg:hidden">
        <Link
          to="/danh-muc"
          className="flex items-center gap-3 rounded-xl border border-rule px-4 py-3 transition-colors duration-150 hover:bg-paper-2"
        >
          <Tags size={18} aria-hidden className="shrink-0 text-ink-2" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Danh mục</span>
            <span className="block text-xs text-muted">
              Thêm, sửa, xóa danh mục chi tiêu
            </span>
          </span>
          <ChevronRight size={16} aria-hidden className="shrink-0 text-muted" />
        </Link>
      </section>

      {/* Thu nhập & ngày lương */}
      <section aria-label="Thu nhập và ngày lương" className="mb-7 border-b border-rule pb-6">
        <h2 className="mb-3 text-sm font-medium text-ink-2">Thu nhập &amp; ngày lương</h2>

        {savedPayday !== null && daysLeft !== null && (
          <p className="mb-4 flex items-start gap-2 rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-accent-deep">
            <CalendarClock size={16} aria-hidden className="mt-0.5 shrink-0" />
            <span>
              {daysLeft === 0
                ? `Hôm nay là ngày lương (ngày ${savedPayday}).`
                : `Còn ${daysLeft} ngày tới kỳ lương (ngày ${savedPayday} hàng tháng).`}
              {profile?.monthly_income
                ? ` Thu nhập: ${formatVND(profile.monthly_income)}/tháng.`
                : ""}
            </span>
          </p>
        )}

        <form onSubmit={submit} className="max-w-md">
          <div className="mb-3">
            <span className="mb-1 block text-sm text-ink-2">Ngày nhận lương hàng tháng</span>
            <AppSelect
              ariaLabel="Ngày nhận lương hàng tháng"
              value={payday}
              onChange={(v) => {
                setPayday(v);
                setSaved(false);
              }}
              options={PAYDAY_OPTIONS}
            />
            <p className="mt-1 text-xs text-muted">
              Tháng thiếu ngày sẽ tính vào ngày cuối tháng (vd. ngày 31 → 28/2).
            </p>
          </div>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm text-ink-2">Thu nhập hàng tháng</span>
            <AppAmountInput
              ariaLabel="Thu nhập hàng tháng"
              value={incomeText}
              onChange={(t) => {
                setIncomeText(t);
                setSaved(false);
              }}
            />
          </label>

          {error && (
            <p role="alert" className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={save.isPending || !dirty}
              className="whitespace-nowrap rounded-xl bg-accent-deep px-5 py-2.5 text-sm font-medium text-paper transition-colors duration-150 hover:bg-accent disabled:opacity-60"
            >
              {save.isPending ? "Đang lưu…" : "Lưu cài đặt"}
            </button>
            {saved && !dirty && <span className="text-sm text-ink-2">Đã lưu.</span>}
          </div>
        </form>

        {thisCycle && (
          <p className="mt-4 max-w-prose text-xs leading-relaxed text-muted">
            Dư nợ được quy về tháng theo kỳ lương: khoản đến hạn từ{" "}
            {formatShortDate(thisCycle.start)} đến {formatShortDate(thisCycle.end)} do
            tiền lương nhận ngày {formatShortDate(thisCycle.start)} chi trả, nên tính
            vào thu chi {formatMonth(thisMonth)}.
          </p>
        )}
      </section>

      {/* Dữ liệu */}
      <section aria-label="Dữ liệu">
        <h2 className="mb-3 text-sm font-medium text-ink-2">Dữ liệu</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Dữ liệu mẫu</p>
            <p className="text-xs text-muted">
              Tạo giao dịch và ngân sách mẫu để khám phá app. Chạy lại sẽ thay dữ
              liệu mẫu cũ; dữ liệu bạn tự nhập không bị ảnh hưởng.
            </p>
          </div>
          <button
            onClick={() => seed.mutate()}
            disabled={seed.isPending}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-rule px-4 py-2.5 text-sm text-ink-2 transition-colors duration-150 hover:bg-paper-2 disabled:opacity-60"
          >
            <Database size={16} aria-hidden />
            {seed.isPending ? "Đang tạo…" : seed.isSuccess ? "Đã tạo lại" : "Tạo dữ liệu mẫu"}
          </button>
        </div>
        {seed.isError && (
          <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            Không tạo được dữ liệu mẫu. Thử lại sau.
          </p>
        )}
      </section>
    </>
  );
}
