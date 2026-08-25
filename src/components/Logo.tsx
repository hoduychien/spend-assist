/**
 * Logo Spend Assist — badge xanh lá với 3 cột chi tiêu đi lên và chấm accent
 * (cùng nguồn với public/logo.svg dùng làm favicon; inline để render sắc nét
 * và không phụ thuộc đường dẫn asset).
 */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      className="shrink-0"
    >
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22C55E" />
          <stop offset="1" stopColor="#15803D" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#logo-bg)" />
      <rect x="14" y="36" width="9" height="14" rx="4.5" fill="#FFFFFF" opacity="0.85" />
      <rect x="27.5" y="28" width="9" height="22" rx="4.5" fill="#FFFFFF" opacity="0.92" />
      <rect x="41" y="20" width="9" height="30" rx="4.5" fill="#FFFFFF" />
      <circle cx="45.5" cy="13" r="3.6" fill="#BBF7D0" />
    </svg>
  );
}
