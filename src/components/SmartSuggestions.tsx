import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Plus, X, Clock, Package, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type PurchaseRecord,
  type ProductRecurrence,
  type SuggestionPriority,
  analyzeRecurrence,
  getSuggestions,
} from "@/lib/purchase-recurrence";

interface SmartSuggestionsProps {
  /** All receipt items with date info */
  purchaseRecords: PurchaseRecord[];
  /** Names already in the user's manual list (lowercase) */
  existingItemNames: Set<string>;
  /** Called when user accepts a suggestion */
  onAccept: (nome: string, suggestedQty: number) => void;
  /** Called when user dismisses a suggestion */
  onDismiss: (nome: string) => void;
  /** Names the user dismissed this session */
  dismissedNames: Set<string>;
}

const priorityConfig: Record<SuggestionPriority, { label: string; icon: typeof AlertTriangle; colorClass: string }> = {
  alta: { label: "Provavelmente acabou", icon: AlertTriangle, colorClass: "text-destructive" },
  media: { label: "Próximo de acabar", icon: TrendingUp, colorClass: "text-amber-500" },
  baixa: { label: "Monitoramento", icon: CheckCircle, colorClass: "text-muted-foreground" },
};

export default function SmartSuggestions({
  purchaseRecords,
  existingItemNames,
  onAccept,
  onDismiss,
  dismissedNames,
}: SmartSuggestionsProps) {
  const suggestions = useMemo(() => {
    if (!purchaseRecords.length) return [];
    const recurrences = analyzeRecurrence(purchaseRecords);
    const all = getSuggestions(recurrences);
    // Filter out items already in the list or dismissed
    return all.filter(
      (s) =>
        !existingItemNames.has(s.nome.toLowerCase()) &&
        !dismissedNames.has(s.nome.toLowerCase())
    );
  }, [purchaseRecords, existingItemNames, dismissedNames]);

  if (!suggestions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-full bg-accent/10 p-2.5">
          <Brain className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Sugestões Automáticas</h2>
          <p className="text-xs text-muted-foreground">
            Baseado no seu padrão de compras
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {suggestions.map((s) => (
            <SuggestionRow
              key={s.nome}
              suggestion={s}
              onAccept={() => onAccept(s.nome, s.averageQuantity)}
              onDismiss={() => onDismiss(s.nome)}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SuggestionRow({
  suggestion: s,
  onAccept,
  onDismiss,
}: {
  suggestion: ProductRecurrence;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const config = priorityConfig[s.priority];
  const PriorityIcon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary/80 transition-colors"
    >
      {/* Priority indicator */}
      <PriorityIcon className={`h-4 w-4 shrink-0 ${config.colorClass}`} />

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{s.nome}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Compra {s.frequencyLabel}
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            ~{s.averageQuantity} un
          </span>
          <span>há {s.daysSinceLastPurchase} dias</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDismiss}
          title="Ignorar sugestão"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          className="h-7 gap-1 text-xs px-2"
          onClick={onAccept}
          title="Adicionar à lista"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>
    </motion.div>
  );
}
