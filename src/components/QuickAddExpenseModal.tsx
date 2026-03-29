import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "alimentacao", label: "Alimentação" },
  { value: "transporte", label: "Transporte" },
  { value: "lazer", label: "Lazer" },
  { value: "saude", label: "Saúde" },
  { value: "educacao", label: "Educação" },
  { value: "streaming", label: "Streaming" },
  { value: "compras", label: "Compras" },
  { value: "mercado", label: "Supermercado" },
  { value: "moradia", label: "Moradia" },
  { value: "outros", label: "Outros" },
];

const PAYMENT_TYPES = [
  { value: "pix", label: "Pix" },
  { value: "cartao", label: "Cartão" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Débito" },
];

// Smart category suggestion based on name
const suggestCategory = (name: string): string | null => {
  const lower = name.toLowerCase().trim();
  const map: Record<string, string[]> = {
    transporte: ["uber", "99", "cabify", "estacionamento", "gasolina", "combustível", "pedagio", "pedágio"],
    alimentacao: ["ifood", "rappi", "restaurante", "lanche", "almoço", "jantar", "café", "mcdonald", "burger"],
    streaming: ["netflix", "spotify", "disney", "hbo", "amazon prime", "youtube", "deezer", "apple tv"],
    lazer: ["cinema", "teatro", "show", "ingresso", "bar", "festa"],
    saude: ["farmacia", "farmácia", "médico", "consulta", "exame", "dentista", "academia"],
    educacao: ["curso", "livro", "escola", "faculdade", "udemy", "coursera"],
    mercado: ["supermercado", "mercado", "feira", "atacado", "atacadão"],
    moradia: ["aluguel", "condomínio", "condominio", "iptu"],
  };
  for (const [cat, keywords] of Object.entries(map)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return null;
};

interface QuickAddExpenseModalProps {
  open: boolean;
  onClose: () => void;
}

export default function QuickAddExpenseModal({ open, onClose }: QuickAddExpenseModalProps) {
  const [valor, setValor] = useState("");
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("outros");
  const [tipoPagamento, setTipoPagamento] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().split("T")[0]);
  const [autoSuggested, setAutoSuggested] = useState(false);
  const valorRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setTimeout(() => valorRef.current?.focus(), 100);
    }
  }, [open]);

  // Auto-suggest category when name changes
  useEffect(() => {
    if (!nome) return;
    const suggested = suggestCategory(nome);
    if (suggested && !autoSuggested) {
      setCategoria(suggested);
      setAutoSuggested(true);
    }
  }, [nome]);

  const resetForm = () => {
    setValor("");
    setNome("");
    setCategoria("outros");
    setTipoPagamento("");
    setData(new Date().toISOString().split("T")[0]);
    setAutoSuggested(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const numVal = parseFloat(valor.replace(/[^\d.,]/g, "").replace(",", "."));
      if (!numVal || numVal <= 0) throw new Error("Valor inválido");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      const { error } = await supabase.from("manual_expenses").insert({
        user_id: session.user.id,
        nome: nome.trim() || "Gasto rápido",
        valor: numVal,
        categoria,
        data,
        tipo_pagamento: tipoPagamento || null,
      });
      if (error) throw error;
      return numVal;
    },
    onSuccess: (savedVal) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-manual-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["gastos-manual-expenses"] });
      toast.success(`R$ ${savedVal.toFixed(2).replace(".", ",")} adicionados ao seu mês`);
      resetForm();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar gasto");
    },
  });

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl p-6 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Gasto rápido</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Valor (primary) */}
          <div>
            <Label className="text-xs text-muted-foreground">Valor *</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <Input
                ref={valorRef}
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="pl-10 text-xl font-mono h-14 text-center"
              />
            </div>
          </div>

          {/* Nome + Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Input
                placeholder="Ex: Uber, iFood..."
                value={nome}
                onChange={(e) => { setNome(e.target.value); setAutoSuggested(false); }}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data */}
          <div>
            <Label className="text-xs text-muted-foreground">Data</Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Payment type */}
          <div>
            <Label className="text-xs text-muted-foreground">Tipo de pagamento</Label>
            <div className="flex gap-2 mt-1.5">
              {PAYMENT_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  onClick={() => setTipoPagamento(tipoPagamento === pt.value ? "" : pt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    tipoPagamento === pt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            className="w-full h-12 gap-2 text-base"
            disabled={!valor || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <Check className="h-5 w-5" />
            {mutation.isPending ? "Salvando..." : "Salvar gasto"}
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
