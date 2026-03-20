import { Crown, Clock, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useFullPlanStatus } from "@/hooks/usePremiumStatus";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

const TRIAL_TOTAL_DAYS = 15;

export default function TrialBanner() {
  const { data: plan, isLoading } = useFullPlanStatus();

  if (isLoading || !plan?.isTrial) return null;

  const days = plan.trialDaysLeft ?? 0;
  const urgent = days <= 3;
  const expired = days <= 0;
  const progressPct = Math.max(0, Math.min(100, ((TRIAL_TOTAL_DAYS - days) / TRIAL_TOTAL_DAYS) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`relative overflow-hidden rounded-xl border p-4 ${
        expired
          ? "border-destructive/50 bg-destructive/10"
          : urgent
            ? "border-[hsl(38,92%,50%)]/40 bg-[hsl(38,92%,50%)]/5"
            : "border-primary/30 bg-primary/5"
      }`}
    >
      {/* Subtle glow */}
      <div
        className={`absolute -top-10 -right-10 h-24 w-24 rounded-full blur-3xl opacity-20 ${
          expired
            ? "bg-destructive"
            : urgent
              ? "bg-accent"
              : "bg-primary"
        }`}
      />

      <div className="relative flex flex-col gap-3">
        {/* Top row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                expired
                  ? "bg-destructive/20"
                  : urgent
                    ? "bg-accent/20"
                    : "bg-primary/20"
              }`}
            >
              {expired ? (
                <Clock className="h-4 w-4 text-destructive" />
              ) : urgent ? (
                <Zap className="h-4 w-4 text-accent" />
              ) : (
                <Crown className="h-4 w-4 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {expired
                  ? "Teste Premium expirado"
                  : "Teste Premium ativo"}
              </p>
              <p className="text-xs text-muted-foreground">
                {expired
                  ? "Assine para continuar usando os recursos avançados"
                  : days === 1
                    ? "Último dia — aproveite ao máximo!"
                    : `${days} dias restantes de ${TRIAL_TOTAL_DAYS}`}
              </p>
            </div>
          </div>

          <Link
            to="/premium"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              expired
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : urgent
                  ? "bg-accent text-accent-foreground hover:bg-accent/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            {expired ? "Assinar agora" : "Ver planos"}
          </Link>
        </div>

        {/* Progress bar */}
        {!expired && (
          <div className="flex items-center gap-3">
            <Progress
              value={progressPct}
              className={`h-1.5 flex-1 ${
                urgent ? "bg-accent/10" : "bg-primary/10"
              }`}
              style={{
                // Override indicator color
                ["--progress-color" as string]: urgent
                  ? "hsl(var(--accent))"
                  : "hsl(var(--primary))",
              }}
            />
            <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
              {Math.round(progressPct)}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
