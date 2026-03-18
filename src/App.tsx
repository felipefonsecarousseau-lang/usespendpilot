import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import InvoiceScanPage from "./pages/InvoiceScanPage";
import ManualExpensesPage from "./pages/ManualExpensesPage";
import FamilyPage from "./pages/FamilyPage";
import GoalDetailPage from "./pages/GoalDetailPage";
import EconomiaSuperPage from "./pages/EconomiaSuperPage";
import ListaInteligentePage from "./pages/ListaInteligentePage";
import PremiumPage from "./pages/PremiumPage";
import MinhaAssinaturaPage from "./pages/MinhaAssinaturaPage";
import GastosDetalhadosPage from "./pages/GastosDetalhadosPage";
import VisaoFinanceiraPage from "./pages/VisaoFinanceiraPage";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/dashboard" /> : <AuthPage />} />
      <Route path="/onboarding" element={session ? <OnboardingPage /> : <Navigate to="/" />} />
      <Route path="/dashboard" element={session ? <DashboardPage /> : <Navigate to="/" />} />
      <Route path="/scan" element={session ? <InvoiceScanPage /> : <Navigate to="/" />} />
      <Route path="/expenses" element={session ? <ManualExpensesPage /> : <Navigate to="/" />} />
      <Route path="/family" element={session ? <FamilyPage /> : <Navigate to="/" />} />
      <Route path="/goals/:id" element={session ? <GoalDetailPage /> : <Navigate to="/" />} />
      <Route path="/economia-supermercado" element={session ? <EconomiaSuperPage /> : <Navigate to="/" />} />
      <Route path="/lista-inteligente" element={session ? <ListaInteligentePage /> : <Navigate to="/" />} />
      <Route path="/premium" element={session ? <PremiumPage /> : <Navigate to="/" />} />
      <Route path="/minha-assinatura" element={session ? <MinhaAssinaturaPage /> : <Navigate to="/" />} />
      <Route path="/gastos-detalhados" element={session ? <GastosDetalhadosPage /> : <Navigate to="/" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
