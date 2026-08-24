export interface Profile {
  id: string;
  full_name: string | null;
  payday: number | null; // ngày nhận lương hàng tháng (1-31)
  monthly_income: number | null; // đồng
  two_factor_enabled: boolean; // bật xác thực 2 bước qua email khi đăng nhập
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  note: string | null;
  occurred_on: string; // yyyy-mm-dd
  is_sample: boolean;
  source: string;
  // Nhãn liên kết (vd "debt:<id>" cho khoản chi trả nợ — dùng khi hoàn tác)
  external_id: string | null;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string; // yyyy-mm-dd
  note: string | null;
  paid_at: string | null; // null = chưa trả
}


export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null; // null = ngân sách tổng
  month: string; // yyyy-mm-01
  amount: number;
}
