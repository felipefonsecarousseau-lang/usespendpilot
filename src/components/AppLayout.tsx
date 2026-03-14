import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ScanLine, FileText, Users, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/scan", label: "Escanear Nota", icon: ScanLine },
  { to: "/expenses", label: "Contas Fixas", icon: FileText },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado.");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-surface p-4">
        <div className="mb-8">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Lúmen</h2>
          <p className="text-xs text-muted-foreground">Gestão Financeira</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(item => {
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

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border flex justify-around py-2">
        {navItems.map(item => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Main */}
      <main className="flex-1 p-6 pb-20 md:pb-6 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
