import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./lib/auth";
import { Toaster } from "./lib/toast";
import { Logo } from "./components/Logo";
import { AppShell } from "./components/AppShell";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { BudgetsPage } from "./pages/BudgetsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { DebtsPage } from "./pages/DebtsPage";
import { SettingsPage } from "./pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function Protected() {
  const { session, loading } = useAuth();
  if (loading) {
    // Splash khởi động — logo nhịp thở + wordmark, thay cho dòng chữ trơ trọi
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper">
        <div className="animate-pulse">
          <Logo size={56} />
        </div>
        <p className="flex items-center gap-2 font-display text-xl font-semibold">
          Spend Assist
        </p>
        <p className="text-sm text-muted">Đang mở sổ chi tiêu của bạn…</p>
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;
  return <AppShell />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route element={<Protected />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/giao-dich" element={<TransactionsPage />} />
              <Route path="/ngan-sach" element={<BudgetsPage />} />
              <Route path="/du-no" element={<DebtsPage />} />
              <Route path="/danh-muc" element={<CategoriesPage />} />
              <Route path="/cai-dat" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
