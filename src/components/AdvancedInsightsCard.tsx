import { motion } from "framer-motion";
import { Zap, TrendingUp, TrendingDown, ShoppingCart, Target, BarChart3, Award, AlertTriangle, Lightbulb } from "lucide-react";
import { type AdvancedInsight, type InsightType } from "@/lib/advanced-insights-engine";

const ICONS: Record<InsightType, typeof Zap> = {
  produto_acima_media: TrendingUp,
  melhor_supermercado_produto: ShoppingCart,
  economia_potencial_acumulada: TrendingDown,
  tendencia_aumento: BarChart3,
  estouro_meta: Target,
  projecao_mensal: BarChart3,
  ranking_supermercados: Award,
  perda_financeira: AlertTriangle,
  dados_insuficientes: Lightbulb,
};

const LEVEL_STYLES = {
  alto: "border-destructive/30 bg-destructive/5",
  medio: "border-accent/30 bg-accent/5",
  baixo: "border-border bg-card",
};

const LEVEL_ICON_STYLES = {
  alto: "text-destructive",
  medio: "text-accent",
  baixo: "text-primary",
};

interface Props {
  insights: AdvancedInsight[];
}

export default function AdvancedInsightsCard({ insights }: Props) {
  if (insights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium text-muted-foreground">Inteligência Financeira</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((ins, i) => {
          const Icon = ICONS[ins.tipo] || Zap;
          return (
            <motion.div
              key={ins.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className={`rounded-lg border p-4 flex flex-col gap-2 ${LEVEL_STYLES[ins.nivel]}`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 shrink-0 ${LEVEL_ICON_STYLES[ins.nivel]}`} />
                <span className="text-sm font-medium text-foreground">{ins.titulo}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{ins.descricao}</p>
              {ins.acao_sugerida && (
                <p className="text-xs text-primary leading-relaxed">💡 {ins.acao_sugerida}</p>
              )}
              {ins.impacto_valor > 0 && (
                <div className="mt-auto pt-2 border-t border-border/50">
                  <span className="text-xs font-mono font-medium text-foreground">
                    Impacto: R$ {ins.impacto_valor.toFixed(2).replace(".", ",")}
                    {ins.impacto_percentual ? ` (${ins.impacto_percentual}%)` : ""}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
