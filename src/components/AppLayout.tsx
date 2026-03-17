import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ScanLine, FileText, Users, LogOut, TrendingDown, ShoppingCart, Crown, CreditCard, PieChart, Plus, Zap, RotateCcw, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QuickAddExpenseModal from "@/components/QuickAddExpenseModal";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/scan", label: "Escanear Nota", icon: ScanLine },
  { to: "/expenses", label: "Contas Fixas", icon: FileText },
  { to: "/family", label: "Família", icon: Users },
  { to: "/economia-supermercado", label: "Economia", icon: TrendingDown },
  { to: "/lista-inteligente", label: "Lista", icon: ShoppingCart },
  { to: "/gastos-detalhados", label: "Gastos", icon: PieChart },
  { to: "/premium", label: "Premium", icon: Crown },
  { to: "/minha-assinatura", label: "Assinatura", icon: CreditCard },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado.");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-surface p-4">
        <div className="mb-8">
          <h2 className="text-xl font-bold tracking-tight text-foreground">EconomizaAI</h2>
          <p className="text-xs text-muted-foreground">Gestão Financeira</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>

      {/* Mobile nav — horizontally scrollable */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border">
        <div className="flex overflow-x-auto scrollbar-hide py-2 px-1 gap-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 min-w-[4rem] px-2 py-1 text-[10px] transition-colors shrink-0 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* FAB — floating add button */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* FAB menu */}
        {fabMenuOpen && (
          <div className="flex flex-col gap-2 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <Link
              to="/scan"
              onClick={() => setFabMenuOpen(false)}
              className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground shadow-lg hover:bg-surface-hover transition-colors"
            >
              <ScanLine className="h-4 w-4 text-primary" />
              Escanear nota
            </Link>
            <button
              onClick={() => { setQuickAddOpen(true); setFabMenuOpen(false); }}
              className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground shadow-lg hover:bg-surface-hover transition-colors"
            >
              <Zap className="h-4 w-4 text-accent" />
              Gasto rápido
            </button>
            <Link
              to="/expenses"
              onClick={() => setFabMenuOpen(false)}
              className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground shadow-lg hover:bg-surface-hover transition-colors"
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              Conta fixa
            </Link>
          </div>
        )}
        <button
          onClick={() => setFabMenuOpen(!fabMenuOpen)}
          className={`h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform ${
            fabMenuOpen ? "rotate-45" : ""
          }`}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Quick add modal */}
      <QuickAddExpenseModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />

      {/* Main */}
      <main className="flex-1 p-6 pb-24 md:pb-6 overflow-auto">
        {/* Mobile header with home button */}
        {location.pathname !== "/dashboard" && (
          <div className="md:hidden flex items-center gap-2 mb-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              Início
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
