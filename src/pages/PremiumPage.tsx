import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Check, Sparkles, Brain, TrendingUp, BarChart3, ShoppingCart, Lightbulb, LineChart, Percent, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { useSubscriptionDetails } from "@/hooks/usePremiumStatus";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const benefits = [
  { icon: Brain, label: "Consultor financeiro automático" },
  { icon: TrendingUp, label: "Previsões financeiras" },
  { icon: BarChart3, label: "Score de saúde financeira" },
  { icon: ShoppingCart, label: "Comparação de preços entre supermercados" },
  { icon: Lightbulb, label: "Lista inteligente de compras" },
  { icon: Percent, label: "Inflação pessoal" },
  { icon: LineChart, label: "Insights avançados de economia" },
];

type Cycle = "monthly" | "yearly";

const PremiumPage = () => {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { data: subscription, isLoading } = useSubscriptionDetails();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const isPremium = subscription?.subscribed ?? false;

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Assinatura realizada com sucesso! Bem-vindo ao Premium 🎉");
      queryClient.invalidateQueries({ queryKey: ["premium-status"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-details"] });
    }
    if (searchParams.get("cancelled") === "true") {
      toast.info("Checkout cancelado.");
    }
  }, [searchParams, queryClient]);

  const price = cycle === "monthly" ? "19,90" : "149,90";
  const period = cycle === "monthly" ? "mês" : "ano";
  const savings = cycle === "yearly" ? "Economize R$88,90/ano" : null;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { cycle },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast.error("Erro ao iniciar checkout. Tente novamente.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast.error("Erro ao abrir portal de gerenciamento.");
      console.error(e);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-8 space-y-8">
        {/* Header */}
        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex rounded-full bg-accent/10 p-4 mx-auto">
            <Crown className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Plano Premium</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Desbloqueie o poder da inteligência financeira e economize mais todo mês.
          </p>
        </motion.div>

        {/* Cycle toggle */}
        {!isPremium && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCycle("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                cycle === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setCycle("yearly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                cycle === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
            </button>
          </div>
        )}

        {/* Price card */}
        <motion.div
          className="rounded-2xl border border-accent/30 bg-card p-8 text-center space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          {isPremium ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-primary font-medium text-lg">
                <Check className="h-6 w-6" />
                Você é Premium!
              </div>
              {subscription?.subscription_end && (
                <p className="text-sm text-muted-foreground">
                  Próxima renovação: {new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}
                </p>
              )}
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                Gerenciar assinatura
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-4xl font-bold text-foreground">
                  R$ {price}
                  <span className="text-lg text-muted-foreground font-normal"> / {period}</span>
                </p>
                {savings && (
                  <p className="text-sm text-accent font-medium">{savings}</p>
                )}
              </div>
              <Button
                size="lg"
                className="w-full max-w-xs gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleSubscribe}
                disabled={loading || isLoading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Assinar Premium
              </Button>
            </>
          )}
        </motion.div>

        {/* Benefits */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground text-center">
            O que você ganha
          </h2>
          <div className="grid gap-3">
            {benefits.map((b, i) => (
              <motion.div
                key={b.label}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <div className="rounded-lg bg-accent/10 p-2">
                  <b.icon className="h-5 w-5 text-accent" />
                </div>
                <span className="text-sm font-medium text-foreground">{b.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PremiumPage;
