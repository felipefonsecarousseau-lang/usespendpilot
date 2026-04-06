import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFixedExpenseOccurrences } from "@/hooks/useFixedExpenseOccurrences";
import AppLayout from "@/components/AppLayout";
import {
  Plus, Trash2, TrendingUp, TrendingDown, RotateCcw,
  FlaskConical, Pencil, Check, EyeOff, Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ─── types ──────────────────────────────────────────────────────────────────

interface SimItem {
  id: string;
  nome: string;
  valor: number;
  tipo: "gasto" | "entrada";
  recorrente: boolean;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseVal(s: string): number {
  return parseFloat(s.replace(",", ".")) || 0;
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function SimulacaoPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  // ── base data ──────────────────────────────────────────────────────────────
  const { data: baseData } = useQuery({
    queryKey: ["simulacao-base", monthStart],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [familyRes, variableRes, manualRes, receiptsRes] = await Promise.all([
        supabase.from("family_members").select("id, nome, renda_mensal").eq("user_id", user.id),
        supabase.from("variable_income").select("id, nome, valor").eq("user_id", user.id).gte("data", monthStart),
        supabase.from("manual_expenses").select("id, nome, valor, categoria").eq("user_id", user.id).gte("data", monthStart),
        supabase.from("receipts").select("id, valor_total, data_compra").eq("user_id", user.id).gte("data_compra", monthStart),
      ]);

      return {
        family: familyRes.data ?? [],
        variableIncome: variableRes.data ?? [],
        manualExpenses: manualRes.data ?? [],
        receipts: receiptsRes.data ?? [],
      };
    },
  });

  const { occurrences: fixedOccurrences } = useFixedExpenseOccurrences(monthStart);

  // ── simulation state ───────────────────────────────────────────────────────

  // IDs of real items removed from the simulation
  const [removedFixedIds, setRemovedFixedIds] = useState<Set<string>>(new Set());
  const [removedManualIds, setRemovedManualIds] = useState<Set<string>>(new Set());
  const [removedReceiptIds, setRemovedReceiptIds] = useState<Set<string>>(new Set());
  const [removedFamilyIds, setRemovedFamilyIds] = useState<Set<string>>(new Set());
  const [removedVariableIds, setRemovedVariableIds] = useState<Set<string>>(new Set());

  // Override values for income sources (id → string, so we can bind to inputs)
  const [familyOverrides, setFamilyOverrides] = useState<Record<string, string>>({});
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);

  // Added items (new entries, purely virtual)
  const [simItems, setSimItems] = useState<SimItem[]>([]);
  const [formNome, setFormNome] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formTipo, setFormTipo] = useState<"gasto" | "entrada">("gasto");
  const [formRecorrente, setFormRecorrente] = useState(true);

  // ── toggle helpers ─────────────────────────────────────────────────────────

  function toggleSet(
    set: Set<string>,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
  ) {
    setter((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── derived sim totals ─────────────────────────────────────────────────────

  const simFixedTotal = fixedOccurrences
    .filter((o) => !removedFixedIds.has(o.id))
    .reduce((s, o) => s + Number(o.valor), 0);

  const simManualTotal = (baseData?.manualExpenses ?? [])
    .filter((e) => !removedManualIds.has(e.id))
    .reduce((s, e) => s + Number(e.valor), 0);

  const simReceiptTotal = (baseData?.receipts ?? [])
    .filter((r) => !removedReceiptIds.has(r.id))
    .reduce((s, r) => s + Number(r.valor_total), 0);

  const simFamilyIncome = (baseData?.family ?? [])
    .filter((m) => !removedFamilyIds.has(m.id))
    .reduce((s, m) => {
      const override = familyOverrides[m.id];
      return s + (override !== undefined ? parseVal(override) : Number(m.renda_mensal));
    }, 0);

  const simVariableIncome = (baseData?.variableIncome ?? [])
    .filter((i) => !removedVariableIds.has(i.id))
    .reduce((s, i) => s + Number(i.valor), 0);

  const simAddedIncome = simItems
    .filter((i) => i.tipo === "entrada")
    .reduce((s, i) => s + i.valor, 0);
  const simAddedExpenses = simItems
    .filter((i) => i.tipo === "gasto")
    .reduce((s, i) => s + i.valor, 0);

  // base totals (unchanged real data)
  const baseFamilyIncome = (baseData?.family ?? []).reduce((s, m) => s + Number(m.renda_mensal), 0);
  const baseVariableIncome = (baseData?.variableIncome ?? []).reduce((s, i) => s + Number(i.valor), 0);
  const baseIncome = baseFamilyIncome + baseVariableIncome;
  const baseFixedTotal = fixedOccurrences.reduce((s, o) => s + Number(o.valor), 0);
  const baseManualTotal = (baseData?.manualExpenses ?? []).reduce((s, e) => s + Number(e.valor), 0);
  const baseReceiptTotal = (baseData?.receipts ?? []).reduce((s, r) => s + Number(r.valor_total), 0);
  const baseExpenses = baseFixedTotal + baseManualTotal + baseReceiptTotal;

  const simIncome = simFamilyIncome + simVariableIncome + simAddedIncome;
  const simExpenses = simFixedTotal + simManualTotal + simReceiptTotal + simAddedExpenses;

  // yearly (recurring × 12, one-time × 1)
  const yearlyBaseIncome = baseFamilyIncome * 12 + baseVariableIncome;
  const yearlyBaseExpenses = baseExpenses * 12;
  const yearlySimIncome =
    simFamilyIncome * 12 +
    simVariableIncome +
    simItems.filter((i) => i.tipo === "entrada").reduce((s, i) => s + i.valor * (i.recorrente ? 12 : 1), 0);
  const yearlySimExpenses =
    (simFixedTotal + simManualTotal + simReceiptTotal) * 12 +
    simItems.filter((i) => i.tipo === "gasto").reduce((s, i) => s + i.valor * (i.recorrente ? 12 : 1), 0);

  const baseMonthlySaldo = baseIncome - baseExpenses;
  const simMonthlySaldo = simIncome - simExpenses;
  const baseYearlySaldo = yearlyBaseIncome - yearlyBaseExpenses;
  const simYearlySaldo = yearlySimIncome - yearlySimExpenses;

  const hasChanges =
    removedFixedIds.size > 0 ||
    removedManualIds.size > 0 ||
    removedReceiptIds.size > 0 ||
    removedFamilyIds.size > 0 ||
    removedVariableIds.size > 0 ||
    Object.keys(familyOverrides).length > 0 ||
    simItems.length > 0;

  // ── add item ───────────────────────────────────────────────────────────────

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

  const removeSimItem = (id: string) => setSimItems((prev) => prev.filter((i) => i.id !== id));

  const reset = () => {
    setRemovedFixedIds(new Set());
    setRemovedManualIds(new Set());
    setRemovedReceiptIds(new Set());
    setRemovedFamilyIds(new Set());
    setRemovedVariableIds(new Set());
    setFamilyOverrides({});
    setEditingFamilyId(null);
    setSimItems([]);
    toast.info("Simulação limpa.");
  };

  // ─────────────────────────────────────────────────────────────────────────
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
          {hasChanges && (
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
          <SummaryCard label="Renda mensal"        base={baseIncome}       sim={simIncome}       positiveIsGood />
          <SummaryCard label="Gastos mensais"       base={baseExpenses}     sim={simExpenses}     positiveIsGood={false} />
          <SummaryCard label="Saldo mensal"         base={baseMonthlySaldo} sim={simMonthlySaldo} positiveIsGood highlight />
          <SummaryCard label="Saldo anual (projeção)" base={baseYearlySaldo} sim={simYearlySaldo} positiveIsGood highlight />
        </div>

        {/* ── ENTRADAS reais ─────────────────────────────────────── */}
        <Section title="Entradas reais">
          {/* Renda fixa — family members */}
          {(baseData?.family ?? []).length > 0 && (
            <SubSection label="Renda fixa">
              {(baseData?.family ?? []).map((m) => {
                const removed = removedFamilyIds.has(m.id);
                const isEditing = editingFamilyId === m.id;
                const overrideVal = familyOverrides[m.id];
                const displayVal = overrideVal !== undefined ? parseVal(overrideVal) : Number(m.renda_mensal);
                const changed = overrideVal !== undefined && parseVal(overrideVal) !== Number(m.renda_mensal);

                return (
                  <RealItem
                    key={m.id}
                    label={m.nome}
                    valor={displayVal}
                    originalValor={Number(m.renda_mensal)}
                    removed={removed}
                    changed={changed}
                    tipo="entrada"
                    onToggleRemove={() => {
                      if (isEditing) setEditingFamilyId(null);
                      toggleSet(removedFamilyIds, setRemovedFamilyIds, m.id);
                    }}
                    editNode={
                      !removed && (
                        isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="text"
                              value={overrideVal ?? String(m.renda_mensal)}
                              onChange={(e) =>
                                setFamilyOverrides((prev) => ({ ...prev, [m.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "Escape") setEditingFamilyId(null);
                              }}
                              onBlur={() => setEditingFamilyId(null)}
                              className="w-24 rounded border border-border bg-surface px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button onClick={() => setEditingFamilyId(null)} className="text-green-400">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingFamilyId(m.id)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )
                      )
                    }
                  />
                );
              })}
            </SubSection>
          )}

          {/* Renda variável */}
          {(baseData?.variableIncome ?? []).length > 0 && (
            <SubSection label="Renda variável">
              {(baseData?.variableIncome ?? []).map((i) => (
                <RealItem
                  key={i.id}
                  label={i.nome}
                  valor={Number(i.valor)}
                  removed={removedVariableIds.has(i.id)}
                  tipo="entrada"
                  onToggleRemove={() => toggleSet(removedVariableIds, setRemovedVariableIds, i.id)}
                />
              ))}
            </SubSection>
          )}

          {(baseData?.family ?? []).length === 0 && (baseData?.variableIncome ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground py-1">Nenhuma entrada registrada este mês.</p>
          )}
        </Section>

        {/* ── GASTOS reais ───────────────────────────────────────── */}
        <Section title="Gastos reais">
          {/* Contas fixas */}
          {fixedOccurrences.length > 0 && (
            <SubSection label="Contas fixas">
              {fixedOccurrences.map((o) => (
                <RealItem
                  key={o.id}
                  label={o.nome ?? "Conta"}
                  valor={Number(o.valor)}
                  removed={removedFixedIds.has(o.id)}
                  tipo="gasto"
                  onToggleRemove={() => toggleSet(removedFixedIds, setRemovedFixedIds, o.id)}
                />
              ))}
            </SubSection>
          )}

          {/* Gastos manuais */}
          {(baseData?.manualExpenses ?? []).length > 0 && (
            <SubSection label="Gastos manuais">
              {(baseData?.manualExpenses ?? []).map((e) => (
                <RealItem
                  key={e.id}
                  label={e.nome}
                  valor={Number(e.valor)}
                  removed={removedManualIds.has(e.id)}
                  tipo="gasto"
                  onToggleRemove={() => toggleSet(removedManualIds, setRemovedManualIds, e.id)}
                />
              ))}
            </SubSection>
          )}

          {/* Notas fiscais */}
          {(baseData?.receipts ?? []).length > 0 && (
            <SubSection label="Notas fiscais">
              {(baseData?.receipts ?? []).map((r) => (
                <RealItem
                  key={r.id}
                  label={`Nota – ${new Date(r.data_compra + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`}
                  valor={Number(r.valor_total)}
                  removed={removedReceiptIds.has(r.id)}
                  tipo="gasto"
                  onToggleRemove={() => toggleSet(removedReceiptIds, setRemovedReceiptIds, r.id)}
                />
              ))}
            </SubSection>
          )}

          {fixedOccurrences.length === 0 &&
            (baseData?.manualExpenses ?? []).length === 0 &&
            (baseData?.receipts ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground py-1">Nenhum gasto registrado este mês.</p>
            )}
        </Section>

        {/* ── Adicionar novos itens ──────────────────────────────── */}
        <Section title="Adicionar à simulação">
          <p className="text-xs text-muted-foreground -mt-1 mb-2">
            Inclua gastos ou entradas que ainda não existem nos seus dados.
          </p>

          <AnimatePresence initial={false}>
            {simItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between rounded-lg bg-surface px-3 py-2.5 mb-2"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${item.tipo === "entrada" ? "bg-green-400" : "bg-red-400"}`} />
                  <span className="text-sm text-foreground">{item.nome}</span>
                  <span className="text-xs text-muted-foreground">{item.recorrente ? "mensal" : "único"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${item.tipo === "entrada" ? "text-green-400" : "text-red-400"}`}>
                    {item.tipo === "entrada" ? "+" : "-"}{fmt(item.valor)}
                  </span>
                  <button onClick={() => removeSimItem(item.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* form */}
          <div className="space-y-3 pt-1">
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
        </Section>

        {/* ── Analysis ──────────────────────────────────────────── */}
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              Análise da simulação
            </p>
            <AnalysisLine label="Impacto mensal no saldo" value={simMonthlySaldo - baseMonthlySaldo} />
            <AnalysisLine label="Impacto anual no saldo"  value={simYearlySaldo - baseYearlySaldo} />
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

// ─── sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

function SubSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground font-medium pl-1">{label}</p>
      {children}
    </div>
  );
}

function RealItem({
  label,
  valor,
  originalValor,
  removed,
  changed,
  tipo,
  onToggleRemove,
  editNode,
}: {
  label: string;
  valor: number;
  originalValor?: number;
  removed: boolean;
  changed?: boolean;
  tipo: "gasto" | "entrada";
  onToggleRemove: () => void;
  editNode?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
        removed ? "bg-surface/40 opacity-50" : "bg-surface"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`h-2 w-2 rounded-full shrink-0 ${
            removed ? "bg-muted-foreground" : tipo === "entrada" ? "bg-green-400" : "bg-red-400/70"
          }`}
        />
        <span className={`text-sm truncate ${removed ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {changed && originalValor !== undefined && !removed && (
          <span className="text-xs text-muted-foreground line-through">{fmt(originalValor)}</span>
        )}
        <span className={`text-sm font-medium ${removed ? "text-muted-foreground line-through" : tipo === "entrada" ? "text-green-400" : "text-foreground"}`}>
          {fmt(valor)}
        </span>
        {editNode}
        <button
          onClick={onToggleRemove}
          className={`transition-colors ${
            removed
              ? "text-primary hover:text-foreground"
              : "text-muted-foreground hover:text-red-400"
          }`}
          title={removed ? "Restaurar" : "Remover da simulação"}
        >
          {removed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function SummaryCard({
  label, base, sim, positiveIsGood, highlight,
}: {
  label: string; base: number; sim: number; positiveIsGood: boolean; highlight?: boolean;
}) {
  const delta = sim - base;
  const hasSim = Math.abs(delta) > 0.01;
  const isGoodDelta = positiveIsGood ? delta >= 0 : delta <= 0;
  const saldoColor = sim >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div
      className={`rounded-xl border p-3 space-y-1 ${
        highlight
          ? sim >= 0
            ? "border-green-500/20 bg-green-500/5"
            : "border-red-500/20 bg-red-500/5"
          : "border-border bg-card"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base font-bold ${highlight ? saldoColor : "text-foreground"}`}>
        {fmt(sim)}
      </p>
      {hasSim ? (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-muted-foreground line-through">{fmt(base)}</span>
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
              isGoodDelta ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            }`}
          >
            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta > 0 ? "+" : ""}{fmt(delta)}
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Base atual</p>
      )}
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
        {pos ? "+" : ""}{fmt(value)}
      </span>
    </div>
  );
}
