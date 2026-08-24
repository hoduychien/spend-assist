import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { Budget, Category, Debt, Profile, Transaction } from "./types";
import { monthEndISO } from "./format";

// ------------------------------------------------------------------- profile

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Dòng profile được trigger tạo sẵn khi đăng ký → chỉ update, không upsert. */
export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      payday: number | null;
      monthly_income: number | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("profiles")
        .update({ payday: p.payday, monthly_income: p.monthly_income })
        .eq("id", userData.user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

/** Bật/tắt xác thực 2 bước qua email (lưu ngay khi gạt công tắc). */
export function useSetTwoFactor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("profiles")
        .update({ two_factor_enabled: enabled })
        .eq("id", userData.user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// ---------------------------------------------------------------- categories

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: {
      id?: string;
      name: string;
      icon: string;
      color: string;
    }) => {
      if (cat.id) {
        const { error } = await supabase
          .from("categories")
          .update({ name: cat.name, icon: cat.icon, color: cat.color })
          .eq("id", cat.id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from("categories").insert({
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          user_id: userData.user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

// -------------------------------------------------------------- transactions

export interface TxFilters {
  monthISO?: string; // yyyy-mm-01
  categoryId?: string | null;
}

export function useTransactions(filters: TxFilters = {}) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async (): Promise<Transaction[]> => {
      let q = supabase
        .from("transactions")
        .select("*")
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (filters.monthISO) {
        q = q.gte("occurred_on", filters.monthISO).lte(
          "occurred_on",
          monthEndISO(filters.monthISO)
        );
      }
      if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tx: {
      id?: string;
      amount: number;
      category_id: string | null;
      note: string;
      occurred_on: string;
    }) => {
      if (tx.id) {
        const { error } = await supabase
          .from("transactions")
          .update({
            amount: tx.amount,
            category_id: tx.category_id,
            note: tx.note || null,
            occurred_on: tx.occurred_on,
          })
          .eq("id", tx.id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from("transactions").insert({
          amount: tx.amount,
          category_id: tx.category_id,
          note: tx.note || null,
          occurred_on: tx.occurred_on,
          user_id: userData.user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    // Optimistic: gỡ khỏi mọi danh sách đang cache ngay lập tức
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["transactions"] });
      const snapshots = qc.getQueriesData<Transaction[]>({
        queryKey: ["transactions"],
      });
      for (const [key, list] of snapshots) {
        if (list) {
          qc.setQueryData(
            key,
            list.filter((t) => t.id !== id)
          );
        }
      }
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, list]) => qc.setQueryData(key, list));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

// ------------------------------------------------------------------- budgets

export function useBudgets(monthISO: string) {
  return useQuery({
    queryKey: ["budgets", monthISO],
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("month", monthISO);
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: {
      category_id: string | null;
      month: string;
      amount: number; // 0 = xóa
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      let del = supabase
        .from("budgets")
        .delete()
        .eq("month", b.month)
        .eq("user_id", uid!);
      del = b.category_id
        ? del.eq("category_id", b.category_id)
        : del.is("category_id", null);
      const { error: delError } = await del;
      if (delError) throw delError;
      if (b.amount > 0) {
        const { error } = await supabase.from("budgets").insert({
          category_id: b.category_id,
          month: b.month,
          amount: b.amount,
          user_id: uid,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

/** Ghi nhiều dòng ngân sách một lượt cho `month` (lập trước / sao chép tháng). */
export function useInsertBudgets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      month: string;
      rows: { category_id: string | null; amount: number }[];
    }) => {
      if (args.rows.length === 0) return;
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      const { error } = await supabase.from("budgets").insert(
        args.rows.map((r) => ({
          category_id: r.category_id,
          amount: r.amount,
          month: args.month,
          user_id: uid,
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

// --------------------------------------------------------------------- debts

export function useDebts() {
  return useQuery({
    queryKey: ["debts"],
    queryFn: async (): Promise<Debt[]> => {
      const { data, error } = await supabase
        .from("debts")
        .select("*")
        .order("due_date");
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: {
      id?: string;
      name: string;
      amount: number;
      due_date: string;
      note: string;
    }) => {
      if (d.id) {
        const { error } = await supabase
          .from("debts")
          .update({
            name: d.name,
            amount: d.amount,
            due_date: d.due_date,
            note: d.note || null,
          })
          .eq("id", d.id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from("debts").insert({
          name: d.name,
          amount: d.amount,
          due_date: d.due_date,
          note: d.note || null,
          user_id: userData.user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debts"] }),
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("debts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debts"] }),
  });
}

/** Đánh dấu đã trả / chưa trả; tùy chọn ghi luôn thành khoản chi hôm nay. */
export function useSetDebtPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      debt: Debt;
      paid: boolean;
      logTransaction?: boolean;
      categoryId?: string | null;
      /** Ngày ghi khoản chi (quy về tháng theo kỳ lương); bỏ trống = hôm nay */
      occurredOn?: string;
    }) => {
      const { error } = await supabase
        .from("debts")
        .update({ paid_at: args.paid ? new Date().toISOString() : null })
        .eq("id", args.debt.id);
      if (error) throw error;

      // Giao dịch trả nợ được đánh dấu external_id = "debt:<id>"
      // để hoàn tác tìm lại và xóa được đúng khoản chi đã ghi.
      const externalId = `debt:${args.debt.id}`;
      if (args.paid && args.logTransaction) {
        const { data: userData } = await supabase.auth.getUser();
        const { error: txError } = await supabase.from("transactions").insert({
          amount: args.debt.amount,
          category_id: args.categoryId ?? null,
          note: `Trả nợ: ${args.debt.name}`,
          user_id: userData.user?.id,
          external_id: externalId,
          ...(args.occurredOn ? { occurred_on: args.occurredOn } : {}),
        });
        if (txError) throw txError;
      }
      if (!args.paid) {
        const { error: delError } = await supabase
          .from("transactions")
          .delete()
          .eq("external_id", externalId);
        if (delError) throw delError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debts"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// --------------------------------------------------------------- sample data

export function useSeedSampleData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("seed_sample_data");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}
