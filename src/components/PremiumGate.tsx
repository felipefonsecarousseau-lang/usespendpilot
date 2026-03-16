import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Crown, TrendingUp, Brain, ShoppingCart, BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const benefits = [
  { icon: Brain, label: "Consultor financeiro automático" },
  { icon: TrendingUp, label: "Previsões financeiras" },
  { icon: BarChart3, label: "Score de saúde financeira" },
  { icon: ShoppingCart, label: "Lista inteligente de compras" },
];

interface PremiumGateProps {
  children: ReactNode;
  /** If true, renders inline overlay instead of full-page */
  inline?: boolean;
}

export default function PremiumGate({ children, inline }: PremiumGateProps) {
  const { data: isPremium, isLoading } = usePremiumStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-muted-foreground text-sm">Verificando plano...</div>
      </div>
    );
  }

  if (isPremium) return <>{children}</>;

  return (
    <div className={`flex flex-col items-center justify-center gap-6 ${inline ? "py-10" : "min-h-[70vh]"}`}>
      <div className="rounded-full bg-accent/10 p-4">
        <Crown className="h-10 w-10 text-accent" />
      </div>

      <div className="text-center max-w-md space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          Desbloqueie inteligência financeira avançada
        </h2>
        <p className="text-muted-foreground text-sm">
          Economize ainda mais com ferramentas de análise inteligente e recomendações personalizadas.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md w-full">
        {benefits.map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <b.icon className="h-4 w-4 text-accent shrink-0" />
            <span className="text-sm text-foreground">{b.label}</span>
          </div>
        ))}
      </div>

      <Link to="/premium">
        <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
          <Sparkles className="h-4 w-4" />
          Assinar Premium
        </Button>
      </Link>
    </div>
  );
}
