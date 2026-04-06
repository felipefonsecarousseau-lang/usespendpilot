import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFixedExpenseOccurrences } from "@/hooks/useFixedExpenseOccurrences";
import AppLayout from "@/components/AppLayout";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, RotateCcw, FlaskConical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface SimItem {
  id: string;
  nome: string;
  valor: number;
  tipo: "gasto" | "entrada";
  recorrente: boolean;
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.01) return null;
  const positive = delta > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        positive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
      }`}
    >
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}
      {fmt(delta)}
    </span>
  );
}

export default function SimulacaoPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  // ─── base data ────────────────────────────────────────────────────────────
  const { data: baseData } = useQuery({
    queryKey: ["simulacao-base", monthStart],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [familyRes, variableRes, manualRes, receiptsRes, itemsRes] = await Promise.all([
        supabase.from("family_members").select("nome, renda_mensal").eq("user_id", user.id),
        supabase.from("variable_income").select("nome, valor, categoria").eq("user_id", user.id).gte("data", monthStart),
        supabase.from("manual_expenses").select("nome, valor, categoria").eq("user_id", user.id).gte("data", monthStart),
        supabase.from("receipts").select("id, valor_total").eq("user_id", user.id).gte("data_compra", monthStart),
        supabase.from("receipt_items").select("receipt_id, preco_total"),
      ]);

      return {
        family: familyRes.data ?? [],
        variableIncome: variableRes.data ?? [],
        manualExpenses: manualRes.data ?? [],
        receipts: receiptsRes.data ?? [],
        receiptItems: itemsRes.data ?? [],
      };
    },
  });

  const { occurrences: fixedOccurrences } = useFixedExpenseOccurrences(monthStart);

  // ─── derived base totals ──────────────────────────────────────────────────
  const baseIncome =
    (baseData?.family ?? []).reduce((s, m) => s + Number(m.renda_mensal), 0) +
    (baseData?.variableIncome ?? []).reduce((s, i) => s + Number(i.valor), 0);

  const receiptTotal = (baseData?.receipts ?? []).reduce((s, r) => s + Number(r.valor_total), 0);
  const manualTotal = (baseData?.manualExpenses ?? []).reduce((s, e) => s + Number(e.valor), 0);
  const fixedTotal = fixedOccurrences.reduce((s, o) => s + Number(o.valor), 0);
  const baseExpenses = manualTotal + receiptTotal + fixedTotal;

  // ─── simulation state ─────────────────────────────────────────────────────
  const [simItems, setSimItems] = useState<SimItem[]>([]);
  const [formNome, setFormNome] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formTipo, setFormTipo] = useState<"gasto" | "entrada">("gasto");
  const [formRecorrente, setFormRecorrente] = useState(true);

  const addItem = () => {
    const val = parseFloat(formValor.replace(",", "."));
    if (!formNome.trim() || isNaN(val) || val <= 0) {
      toast.error("Preencha nome e valor válido.");
      return;
    }
    setSimItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nome: formNome.trim(), valor: val, tipo: formTipo, recorrente: formRecorrente },
    ]);
    setFormNome("");
    setFormValor("");
    toast.success("Item adicionado à simulação.");
  };

  const removeItem = (id: string) => setSimItems((prev) => prev.filter((i) => i.id !== id));
  const reset = () => { setSimItems([]); toast.info("Simulação limpa."); };

  // ─── sim totals ───────────────────────────────────────────────────────────
  const simAddedIncome = simItems.filter((i) => i.tipo === "entrada").reduce((s, i) => s + i.valor, 0);
  const simAddedExpenses = simItems.filter((i) => i.tipo === "gasto").reduce((s, i) => s + i.valor, 0);

  const simIncome = baseIncome + simAddedIncome;
  const simExpenses = baseExpenses + simAddedExpenses;

  // Yearly: recorrente items × 12, one-time × 1. Base totals × 12 for income (fixed monthly) and expenses.
  const yearlyBaseIncome = baseData?.family.reduce((s, m) => s + Number(m.renda_mensal), 0) ?? 0;
  const yearlyBaseIncomeTotal = yearlyBaseIncome * 12 + (baseData?.variableIncome ?? []).reduce((s, i) => s + Number(i.valor), 0);
  const yearlyBaseExpenses = (manualTotal + receiptTotal + fixedTotal) * 12;

  const yearlySimAddedIncome = simItems
    .filter((i) => i.tipo === "entrada")
    .reduce((s, i) => s + i.valor * (i.recorrente ? 12 : 1), 0);
  const yearlySimAddedExpenses = simItems
    .filter((i) => i.tipo === "gasto")
    .reduce((s, i) => s + i.valor * (i.recorrente ? 12 : 1), 0);

  const yearlySimIncome = yearlyBaseIncomeTotal + yearlySimAddedIncome;
  const yearlySimExpenses = yearlyBaseExpenses + yearlySimAddedExpenses;

  const baseMonthlySaldo = baseIncome - baseExpenses;
  const simMonthlySaldo = simIncome - simExpenses;
  const baseYearlySaldo = yearlyBaseIncomeTotal - yearlyBaseExpenses;
  const simYearlySaldo = yearlySimIncome - yearlySimExpenses;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Simulação</h1>
              <p className="text-xs text-muted-foreground">
                Teste cenários sem alterar seus dados reais
              </p>
            </div>
          </div>
          {simItems.length > 0 && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar simulação
            </button>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Renda mensal"
            base={baseIncome}
            sim={simIncome}
            positive={true}
          />
          <SummaryCard
            label="Gastos mensais"
            base={baseExpenses}
            sim={simExpenses}
            positive={false}
          />
          <SummaryCard
            label="Saldo mensal"
            base={baseMonthlySaldo}
            sim={simMonthlySaldo}
            positive={true}
            highlight
          />
          <SummaryCard
            label="Saldo anual (projeção)"
            base={baseYearlySaldo}
            sim={simYearlySaldo}
            positive={true}
            highlight
          />
        </div>

        {/* Base data (read-only) */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Dados reais do mês atual
          </p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <ReadOnlyRow label="Renda fixa" value={baseData?.family.reduce((s, m) => s + Number(m.renda_mensal), 0) ?? 0} tipo="entrada" />
            <ReadOnlyRow label="Renda variável" value={baseData?.variableIncome.reduce((s, i) => s + Number(i.valor), 0) ?? 0} tipo="entrada" />
            <ReadOnlyRow label="Contas fixas" value={fixedTotal} tipo="gasto" />
            <ReadOnlyRow label="Gastos manuais" value={manualTotal} tipo="gasto" />
            <ReadOnlyRow label="Notas fiscais" value={receiptTotal} tipo="gasto" />
          </div>
        </div>

        {/* Sim items list */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Itens da simulação
          </p>

          {simItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nenhum item adicionado. Use o formulário abaixo.
            </p>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {simItems.map((item) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-between rounded-lg bg-surface px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          item.tipo === "entrada" ? "bg-green-400" : "bg-red-400"
                        }`}
                      />
                      <span className="text-sm text-foreground">{item.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.recorrente ? "mensal" : "único"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          item.tipo === "entrada" ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {item.tipo === "entrada" ? "+" : "-"}
                        {fmt(item.valor)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          {/* Add form */}
          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-xs text-muted-foreground font-medium">Adicionar item</p>

            {/* Tipo toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setFormTipo("gasto")}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  formTipo === "gasto"
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-surface text-muted-foreground border border-transparent"
                }`}
              >
                <TrendingDown className="inline h-3.5 w-3.5 mr-1" />
                Gasto
              </button>
              <button
                onClick={() => setFormTipo("entrada")}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  formTipo === "entrada"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-surface text-muted-foreground border border-transparent"
                }`}
              >
                <TrendingUp className="inline h-3.5 w-3.5 mr-1" />
                Entrada
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome (ex: Spotify)"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Valor"
                value={formValor}
                onChange={(e) => setFormValor(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                className="w-28 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formRecorrente}
                  onChange={(e) => setFormRecorrente(e.target.checked)}
                  className="accent-primary"
                />
                Recorrente (mensal)
              </label>
              <button
                onClick={addItem}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </button>
            </div>
          </div>
        </div>

        {/* Analysis */}
        {simItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              Análise da simulação
            </p>
            <AnalysisLine
              label="Impacto mensal no saldo"
              value={simMonthlySaldo - baseMonthlySaldo}
            />
            <AnalysisLine
              label="Impacto anual no saldo"
              value={simYearlySaldo - baseYearlySaldo}
            />
            {simMonthlySaldo < 0 && (
              <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                Atenção: com essa simulação seu saldo mensal fica negativo em{" "}
                <strong>{fmt(Math.abs(simMonthlySaldo))}</strong>.
              </p>
            )}
            {simMonthlySaldo >= 0 && simMonthlySaldo > baseMonthlySaldo && (
              <p className="text-xs text-green-400 bg-green-500/10 rounded-lg px-3 py-2">
                Seu saldo mensal melhora em{" "}
                <strong>{fmt(simMonthlySaldo - baseMonthlySaldo)}</strong> com essa simulação.
              </p>
            )}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}

// ─── sub-components ────────────────────────────────────────────────────────

function SummaryCard({
  label,
  base,
  sim,
  positive,
  highlight,
}: {
  label: string;
  base: number;
  sim: number;
  positive: boolean;
  highlight?: boolean;
}) {
  const delta = sim - base;
  const hasSim = Math.abs(delta) > 0.01;
  const saldoPositive = sim >= 0;

  return (
    <div
      className={`rounded-xl border p-3 space-y-1 ${
        highlight
          ? saldoPositive
            ? "border-green-500/20 bg-green-500/5"
            : "border-red-500/20 bg-red-500/5"
          : "border-border bg-card"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-base font-bold ${
          highlight ? (saldoPositive ? "text-green-400" : "text-red-400") : "text-foreground"
        }`}
      >
        {fmt(sim)}
      </p>
      {hasSim ? (
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground line-through">{fmt(base)}</span>
          <DeltaBadge delta={positive ? delta : -delta} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Base atual</p>
      )}
    </div>
  );
}

function ReadOnlyRow({ label, value, tipo }: { label: string; value: number; tipo: "gasto" | "entrada" }) {
  if (value === 0) return null;
  return (
    <div className="rounded-lg bg-surface px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${tipo === "entrada" ? "text-green-400" : "text-foreground"}`}>
        {fmt(value)}
      </p>
    </div>
  );
}

function AnalysisLine({ label, value }: { label: string; value: number }) {
  const pos = value >= 0;
  const Icon = pos ? TrendingUp : TrendingDown;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1 font-medium ${pos ? "text-green-400" : "text-red-400"}`}>
        <Icon className="h-3.5 w-3.5" />
        {pos ? "+" : ""}
        {fmt(value)}
      </span>
    </div>
  );
}
