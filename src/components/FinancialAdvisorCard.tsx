import { motion } from "framer-motion";
import { Lightbulb, TrendingDown, ShoppingCart, TrendingUp, Star, PiggyBank } from "lucide-react";
import { type Recommendation, type RecommendationType } from "@/lib/financial-advisor";

const ICONS: Record<RecommendationType, typeof Lightbulb> = {
  economia_categoria: TrendingDown,
  economia_supermercado: ShoppingCart,
  tendencia_aumento: TrendingUp,
  melhoria_score: Star,
  economia_mensal: PiggyBank,
};

const formatCurrency = (val: number) =>
  `R$ ${val.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

interface Props {
  recommendations: Recommendation[];
}

const FinancialAdvisorCard = ({ recommendations }: Props) => {
  if (recommendations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium text-muted-foreground">Consultor Financeiro</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {recommendations.map((rec, i) => {
          const Icon = ICONS[rec.tipo] || Lightbulb;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.08 }}
              className="glass-card-inner p-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{rec.titulo}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{rec.mensagem}</p>
              {rec.impacto_estimado > 0 && (
                <div className="mt-auto pt-2 border-t border-border/50">
                  <span className="text-xs text-primary font-mono font-medium">
                    Impacto: {formatCurrency(rec.impacto_estimado)}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default FinancialAdvisorCard;
