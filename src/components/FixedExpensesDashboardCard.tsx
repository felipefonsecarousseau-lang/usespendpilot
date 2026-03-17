import { motion } from "framer-motion";
import { Receipt, CheckCircle2, Clock } from "lucide-react";

const formatCurrencySimple = (val: number) =>
  `R$ ${val.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

interface Props {
  total: number;
  paid: number;
  pending: number;
}

const FixedExpensesDashboardCard = ({ total, paid, pending }: Props) => {
  if (total === 0) return null;

  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Receipt className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium text-muted-foreground">Contas fixas do mês</h2>
      </div>

      <p className="text-2xl font-bold font-mono text-foreground mb-3">
        {formatCurrencySimple(total)}
      </p>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-muted mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${paidPct}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
          className="h-full rounded-full bg-primary"
        />
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">
            {formatCurrencySimple(paid)} <span className="text-xs">pagos</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-accent" />
          <span className="text-muted-foreground">
            {formatCurrencySimple(pending)} <span className="text-xs">pendentes</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default FixedExpensesDashboardCard;
