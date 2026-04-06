import { useState, useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const InvoiceScanPage = lazy(() => import("./pages/InvoiceScanPage"));
const ManualExpensesPage = lazy(() => import("./pages/ManualExpensesPage"));
const SaidasPage = lazy(() => import("./pages/SaidasPage"));
const FamilyPage = lazy(() => import("./pages/FamilyPage"));
const GoalDetailPage = lazy(() => import("./pages/GoalDetailPage"));
const EconomiaSuperPage = lazy(() => import("./pages/EconomiaSuperPage"));
const ListaInteligentePage = lazy(() => import("./pages/ListaInteligentePage"));
const PremiumPage = lazy(() => import("./pages/PremiumPage"));
const MinhaAssinaturaPage = lazy(() => import("./pages/MinhaAssinaturaPage"));
const GastosDetalhadosPage = lazy(() => import("./pages/GastosDetalhadosPage"));
const VisaoFinanceiraPage = lazy(() => import("./pages/VisaoFinanceiraPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const SimulacaoPage = lazy(() => import("./pages/SimulacaoPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

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

  const fallback = (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-muted-foreground text-sm">Carregando...</div>
    </div>
  );

  return (
    <Suspense fallback={fallback}>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" /> : <LandingPage />} />
        <Route path="/auth" element={session ? <Navigate to="/dashboard" /> : <AuthPage />} />
        <Route path="/onboarding" element={session ? <OnboardingPage /> : <Navigate to="/" />} />
        <Route path="/dashboard" element={session ? <DashboardPage /> : <Navigate to="/" />} />
        <Route path="/saidas" element={session ? <SaidasPage /> : <Navigate to="/" />} />
        <Route path="/scan" element={session ? <Navigate to="/saidas" /> : <Navigate to="/" />} />
        <Route path="/expenses" element={session ? <Navigate to="/saidas" /> : <Navigate to="/" />} />
        <Route path="/family" element={session ? <FamilyPage /> : <Navigate to="/" />} />
        <Route path="/goals/:id" element={session ? <GoalDetailPage /> : <Navigate to="/" />} />
        <Route path="/economia-supermercado" element={session ? <EconomiaSuperPage /> : <Navigate to="/" />} />
        <Route path="/lista-inteligente" element={session ? <ListaInteligentePage /> : <Navigate to="/" />} />
        <Route path="/premium" element={session ? <PremiumPage /> : <Navigate to="/" />} />
        <Route path="/minha-assinatura" element={session ? <MinhaAssinaturaPage /> : <Navigate to="/" />} />
        <Route path="/gastos-detalhados" element={session ? <GastosDetalhadosPage /> : <Navigate to="/" />} />
        <Route path="/visao-financeira" element={session ? <VisaoFinanceiraPage /> : <Navigate to="/" />} />
        <Route path="/faq" element={session ? <FaqPage /> : <Navigate to="/" />} />
        <Route path="/simulacao" element={session ? <SimulacaoPage /> : <Navigate to="/" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
