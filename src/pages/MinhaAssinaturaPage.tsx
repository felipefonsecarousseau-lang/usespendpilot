import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Crown, Clock, Calendar, CreditCard, TrendingDown, Sparkles, Loader2, Settings, AlertTriangle, PiggyBank, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { useFullPlanStatus, useSubscriptionDetails } from "@/hooks/usePremiumStatus";
import { supabase } from "@/integrations/supabase/client";
import { calculateUserSavings, type UserSavings } from "@/lib/savings-calculator";

const formatCurrency = (val: number) =>
  `R$ ${val.toFixed(2).replace(".", ",")}`;

const MinhaAssinaturaPage = () => {
  const { data: plan, isLoading } = useFullPlanStatus();
  const { data: subscription } = useSubscriptionDetails();
  const [checkoutLoading, setCheckoutLoading] = useState<"monthly" | "yearly" | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: savings } = useQuery<UserSavings>({
    queryKey: ["user-savings"],
    queryFn: calculateUserSavings,
    staleTime: 5 * 60_000,
  });

  const statusLabel = useMemo(() => {
    if (!plan) return "Carregando...";
    if (plan.isTrial) return "Trial Premium";
    if (plan.isPremium) return "Premium Ativo";
    if (plan.status === "cancelled") return "Cancelado";
    if (plan.status === "expired") return "Expirado";
    return "Gratuito";
  }, [plan]);

  const statusColor = useMemo(() => {
    if (!plan) return "text-muted-foreground";
    if (plan.isPremium || plan.isTrial) return "text-primary";
    if (plan.status === "cancelled") return "text-accent";
    return "text-muted-foreground";
  }, [plan]);

  const handleSubscribe = async (cycle: "monthly" | "yearly") => {
    setCheckoutLoading(cycle);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { cycle } });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast.error("Erro ao iniciar checkout.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      // Supabase wraps edge function HTTP errors in `error`
      if (error) throw new Error(error.message ?? String(error));

      // Edge function returned a 200 but with an error payload
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("URL do portal não retornada.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes("No Stripe customer found")) {
        toast.error("Nenhuma assinatura Stripe encontrada para este e-mail. Entre em contato com o suporte.");
      } else if (msg.includes("STRIPE_SECRET_KEY")) {
        toast.error("Configuração de pagamento indisponível. Entre em contato com o suporte.");
      } else {
        toast.error(`Erro ao abrir portal: ${msg}`);
      }
    } finally {
      setPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <div className="inline-flex rounded-full bg-accent/10 p-4 mx-auto">
            <Crown className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Minha Assinatura</h1>
        </motion.div>

        {/* Status Card */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status do plano</p>
              <p className={`text-xl font-bold ${statusColor}`}>{statusLabel}</p>
            </div>
            <Crown className={`h-8 w-8 ${plan?.isPremium ? "text-accent" : "text-muted-foreground/30"}`} />
          </div>

          {/* Trial banner */}
          {plan?.isTrial && plan.trialDaysLeft !== null && (
            <div className="flex items-center gap-3 rounded-lg bg-accent/10 border border-accent/20 p-4">
              <Clock className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Seu período de teste termina em {plan.trialDaysLeft} dia{plan.trialDaysLeft !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Assine para continuar com acesso premium após o trial.
                </p>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plan?.startedAt && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Início:</span>
                <span className="text-foreground">{new Date(plan.startedAt).toLocaleDateString("pt-BR")}</span>
              </div>
            )}
            {plan?.isTrial && plan.trialExpiresAt && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-accent" />
                <span className="text-muted-foreground">Trial até:</span>
                <span className="text-foreground">{new Date(plan.trialExpiresAt).toLocaleDateString("pt-BR")}</span>
              </div>
            )}
            {plan?.isPremium && !plan.isTrial && plan.subscriptionEnd && (
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Próxima cobrança:</span>
                <span className="text-foreground">{new Date(plan.subscriptionEnd).toLocaleDateString("pt-BR")}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Savings Card */}
        {savings && (savings.economia_total > 0 || plan?.isPremium) && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Sua economia com o app</h2>
            </div>
            {savings.economia_total > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card-inner p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total economizado</p>
                  <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(savings.economia_total)}</p>
                </div>
                <div className="glass-card-inner p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Economia mensal estimada</p>
                  <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(savings.economia_mensal_estimada)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Escaneie notas fiscais de diferentes supermercados para começar a ver sua economia.
              </p>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="space-y-4">
          {/* Premium user: manage */}
          {plan?.isPremium && !plan.isTrial && (
            <div className="glass-card p-6 text-center space-y-4">
              <p className="text-sm text-muted-foreground">Gerencie sua assinatura, altere forma de pagamento ou cancele.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button variant="outline" className="gap-2" onClick={handleManageSubscription} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                  Gerenciar assinatura
                </Button>
                {subscription?.interval === "month" && (
                  <Button
                    className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => handleSubscribe("yearly")}
                    disabled={!!checkoutLoading}
                  >
                    {checkoutLoading === "yearly" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
                    Mudar para anual — Economize R$118,90
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Free or trial user: subscribe options */}
          {(!plan?.isPremium || plan.isTrial) && (
            <div className="glass-card p-6 space-y-4">
              {!plan?.isPremium && (
                <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/10 p-4 mb-2">
                  <TrendingDown className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-sm text-foreground">
                    Usuários Premium economizam em média <strong>R$ 64</strong> por mês com comparação de preços e insights inteligentes.
                  </p>
                </div>
              )}

              <h3 className="text-lg font-semibold text-foreground text-center">
                {plan?.isTrial ? "Assine para continuar após o trial" : "Desbloqueie o Premium"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card-inner p-5 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">Mensal</p>
                  <p className="text-3xl font-bold text-foreground">R$ 19,90<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                  <Button className="w-full gap-2" onClick={() => handleSubscribe("monthly")} disabled={!!checkoutLoading}>
                    {checkoutLoading === "monthly" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Assinar mensal
                  </Button>
                </div>
                <div className="glass-card-inner p-5 text-center space-y-3 border-2 border-accent/30 relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-0.5 rounded-full">
                    Mais popular
                  </span>
                  <p className="text-sm text-muted-foreground">Anual</p>
                  <p className="text-3xl font-bold text-foreground">R$ 119,90<span className="text-sm font-normal text-muted-foreground">/ano</span></p>
                  <p className="text-xs text-accent font-medium">Economize R$ 118,90</p>
                  <Button className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleSubscribe("yearly")} disabled={!!checkoutLoading}>
                    {checkoutLoading === "yearly" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Assinar anual
                  </Button>
                </div>
              </div>

              {!plan?.isPremium && !plan?.isTrial && (
                <p className="text-center text-xs text-muted-foreground">
                  Ou <button className="text-primary underline" onClick={() => toast.info("O trial de 15 dias é concedido automaticamente ao criar uma nova conta.")}>teste grátis por 15 dias</button>
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default MinhaAssinaturaPage;
