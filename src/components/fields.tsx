import Select from "react-select";
import DatePicker, { registerLocale } from "react-datepicker";
import { vi } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("vi", vi);

// ---------------------------------------------------------------- AppSelect

export interface SelectOption {
  value: string;
  label: string;
  color?: string; // chấm màu danh mục (nếu có)
}

/**
 * Select dùng chung — react-select ở chế độ unstyled, khoác token của app.
 * Menu render ngay trong cây DOM nên hoạt động bình thường bên trong <dialog>.
 */
export function AppSelect({
  options,
  value,
  onChange,
  isDisabled,
  ariaLabel,
  autoFocus,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  ariaLabel?: string;
  autoFocus?: boolean;
}) {
  const selected = options.find((o) => o.value === value) ?? null;
  return (
    <Select<SelectOption, false>
      unstyled
      isSearchable={false}
      options={options}
      value={selected}
      onChange={(o) => {
        if (o) onChange(o.value);
      }}
      isDisabled={isDisabled}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      menuPlacement="auto"
      menuShouldScrollIntoView={false}
      formatOptionLabel={(o) => (
        <span className="flex items-center gap-2">
          {o.color && (
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: o.color }}
            />
          )}
          <span className="truncate">{o.label}</span>
        </span>
      )}
      classNames={{
        container: () => "min-w-0",
        control: ({ isFocused, isDisabled: dis }) =>
          [
            "rounded-xl border bg-paper-2 px-3 py-2.5 text-sm transition-colors duration-150",
            dis
              ? "cursor-not-allowed border-rule opacity-55"
              : isFocused
                ? "cursor-pointer border-focus shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent)_20%,transparent)]"
                : "cursor-pointer border-rule hover:border-rule",
          ].join(" "),
        valueContainer: () => "gap-2",
        singleValue: () => "text-ink",
        placeholder: () => "text-muted",
        dropdownIndicator: ({ selectProps }) =>
          `pl-2 text-muted transition-transform duration-150 ${
            selectProps.menuIsOpen ? "rotate-180" : ""
          }`,
        menu: () =>
          "z-50 mt-1.5 overflow-hidden rounded-xl border border-rule bg-paper py-1 shadow-lg",
        menuList: () => "max-h-60",
        option: ({ isFocused, isSelected }) =>
          [
            "cursor-pointer px-3 py-2 text-sm",
            isSelected
              ? "bg-accent-soft font-medium text-accent-deep"
              : isFocused
                ? "bg-paper-2 text-ink"
                : "text-ink",
          ].join(" "),
        noOptionsMessage: () => "px-3 py-2 text-sm text-muted",
      }}
      noOptionsMessage={() => "Không có lựa chọn"}
    />
  );
}

// ------------------------------------------------------------- AppDatePicker

function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Ô chọn ngày — react-datepicker, tiếng Việt, tuần bắt đầu thứ Hai.
 * Giá trị vào/ra là chuỗi yyyy-mm-dd (khớp cột `occurred_on`).
 * Skin của lịch nằm trong index.css (khối "react-datepicker").
 */
export function AppDatePicker({
  value,
  onChange,
  allowFuture = false,
}: {
  value: string;
  onChange: (iso: string) => void;
  /** true = cho chọn ngày tương lai (ví dụ: ngày tới hạn trả nợ) */
  allowFuture?: boolean;
}) {
  return (
    <DatePicker
      selected={isoToDate(value)}
      onChange={(date: Date | null) => {
        if (date) onChange(dateToISO(date));
      }}
      locale="vi"
      dateFormat="EEEE, dd/MM/yyyy"
      maxDate={allowFuture ? undefined : new Date()}
      calendarStartDay={1}
      popperPlacement="top-start"
      showPopperArrow={false}
      wrapperClassName="w-full"
      className="focus-ring w-full cursor-pointer rounded-xl border border-rule bg-paper-2 px-3 py-2.5 text-sm capitalize outline-none transition-colors duration-150"
    />
  );
}
