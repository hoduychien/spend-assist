import {
  Utensils,
  Car,
  ReceiptText,
  ShoppingBag,
  Gamepad2,
  Ellipsis,
  Coffee,
  HeartPulse,
  GraduationCap,
  PawPrint,
  Plane,
  Gift,
  HandCoins,
  type LucideIcon,
} from "lucide-react";

/* Một bộ icon duy nhất (Lucide) cho toàn app. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  receipt: ReceiptText,
  "shopping-bag": ShoppingBag,
  gamepad: Gamepad2,
  "hand-coins": HandCoins,
  ellipsis: Ellipsis,
  coffee: Coffee,
  health: HeartPulse,
  education: GraduationCap,
  pet: PawPrint,
  travel: Plane,
  gift: Gift,
};

export const ICON_KEYS = Object.keys(CATEGORY_ICONS);

/* Màu danh mục — 6 màu mặc định đã kiểm tra CVD-safe + 2 màu bổ sung */
export const CATEGORY_COLORS = [
  "#B45309",
  "#2563EB",
  "#0D9488",
  "#7C3AED",
  "#DB2777",
  "#A16207",
  "#16A34A",
  "#475569",
];

export function CategoryIcon({
  icon,
  color,
  size = "md",
}: {
  icon: string;
  color: string;
  size?: "sm" | "md";
}) {
  const Icon = CATEGORY_ICONS[icon] ?? Ellipsis;
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const glyph = size === "sm" ? 16 : 18;
  return (
    <span
      aria-hidden
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-full`}
      style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
    >
      <Icon size={glyph} strokeWidth={2} />
    </span>
  );
}
