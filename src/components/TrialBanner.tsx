import { Crown, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useFullPlanStatus } from "@/hooks/usePremiumStatus";

export default function TrialBanner() {
  const { data: plan, isLoading } = useFullPlanStatus();

  if (isLoading || !plan?.isTrial) return null;

  const days = plan.trialDaysLeft ?? 0;
  const urgent = days <= 3;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
        urgent
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-accent/40 bg-accent/10 text-accent-foreground"
      }`}
    >
      {urgent ? (
        <Clock className="h-4 w-4 shrink-0" />
      ) : (
        <Crown className="h-4 w-4 shrink-0" />
      )}
      <span className="flex-1">
        {days <= 0
          ? "Seu período de teste expirou."
          : days === 1
            ? "Último dia do seu teste Premium gratuito!"
            : `Você tem ${days} dias restantes do teste Premium gratuito.`}
      </span>
      <Link
        to="/premium"
        className="shrink-0 font-medium underline underline-offset-2 hover:opacity-80"
      >
        {days <= 0 ? "Assinar agora" : "Ver planos"}
      </Link>
    </div>
  );
}
