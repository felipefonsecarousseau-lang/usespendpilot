import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, AlertTriangle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AppLayout from "@/components/AppLayout";

interface Expense {
  id: string;
  nome: string;
  valor: number;
  vencimento: string;
  diaRecorrente?: number;
  categoria: string;
  status: "pendente" | "agendado" | "pago";
}

const categorias = ["Moradia", "Utilidades", "Streaming", "Internet", "Telefone", "Seguro", "Educação", "Outros"];
const diasDoMes = Array.from({ length: 31 }, (_, i) => i + 1);

const getProximoVencimento = (dia: number): string => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const venc = new Date(ano, mes, dia);
  if (venc < hoje) venc.setMonth(venc.getMonth() + 1);
  return venc.toISOString().split("T")[0];
};

const initialExpenses: Expense[] = [
  { id: "1", nome: "Aluguel", valor: 2200, vencimento: "2026-03-10", diaRecorrente: 10, categoria: "Moradia", status: "pago" },
  { id: "2", nome: "Conta de Luz", valor: 189.50, vencimento: "2026-03-15", diaRecorrente: 15, categoria: "Utilidades", status: "pendente" },
  { id: "3", nome: "Internet", valor: 119.90, vencimento: "2026-03-20", diaRecorrente: 20, categoria: "Internet", status: "agendado" },
  { id: "4", nome: "Netflix", valor: 55.90, vencimento: "2026-03-05", diaRecorrente: 5, categoria: "Streaming", status: "pago" },
  { id: "5", nome: "Spotify", valor: 21.90, vencimento: "2026-03-05", diaRecorrente: 5, categoria: "Streaming", status: "pago" },
];

const ManualExpensesPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [diaRecorrente, setDiaRecorrente] = useState<number>(1);
  const [categoria, setCategoria] = useState(categorias[0]);

  const statusColors: Record<string, string> = {
    pendente: "bg-accent/20 text-accent",
    agendado: "bg-primary/20 text-primary",
    pago: "bg-muted text-muted-foreground",
  };

  const statusLabels: Record<string, string> = {
    pendente: "Pendente",
    agendado: "Agendado",
    pago: "Pago",
  };

  const alertas = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return expenses.filter(e => {
      if (e.status === "pago") return false;
      const venc = new Date(e.vencimento + "T12:00:00");
      const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 3;
    }).map(e => {
      const venc = new Date(e.vencimento + "T12:00:00");
      const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return { ...e, diasRestantes: diff };
    });
  }, [expenses]);

  const toggleStatus = (id: string) => {
    setExpenses(prev =>
      prev.map(e => {
        if (e.id !== id) return e;
        const next = e.status === "pendente" ? "agendado" : e.status === "agendado" ? "pago" : "pendente";
        return { ...e, status: next };
      })
    );
  };

  const addExpense = () => {
    if (!nome || !valor) {
      toast.error("Preencha todos os campos.");
      return;
    }
    const newExp: Expense = {
      id: Date.now().toString(),
      nome,
      valor: parseFloat(valor),
      vencimento: getProximoVencimento(diaRecorrente),
      diaRecorrente,
      categoria,
      status: "pendente",
    };
    setExpenses(prev => [...prev, newExp]);
    setNome(""); setValor(""); setDiaRecorrente(1); setCategoria(categorias[0]);
    setShowForm(false);
    toast.success("Conta recorrente adicionada!");
  };

  const removeExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const formatCurrency = (val: number) => {
    const [intPart, decPart] = val.toFixed(2).split(".");
    return (
      <span className="currency-display">
        R$ {intPart}<span className="opacity-50">,{decPart}</span>
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contas Recorrentes</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie suas contas fixas e recorrentes.</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>

        {alertas.length > 0 && (
          <div className="space-y-2">
            {alertas.map(a => (
              <Alert key={a.id} variant="destructive" className="border-destructive/30 bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>{a.nome}</strong> vence {a.diasRestantes === 0 ? "hoje" : `em ${a.diasRestantes} dia${a.diasRestantes > 1 ? "s" : ""}`} — {formatCurrency(a.valor)}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="glass-card p-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nome da conta" value={nome} onChange={e => setNome(e.target.value)} className="bg-secondary" />
              <Input placeholder="Valor" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="bg-secondary" />
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  value={diaRecorrente}
                  onChange={e => setDiaRecorrente(Number(e.target.value))}
                  className="bg-secondary border border-border rounded-md px-3 py-2 text-sm w-full"
                >
                  {diasDoMes.map(d => (
                    <option key={d} value={d}>Todo dia {d}</option>
                  ))}
                </select>
              </div>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm">
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={addExpense}>Adicionar</Button>
            </div>
          </motion.div>
        )}

        <div className="glass-card divide-y divide-border">
          {expenses.map((expense, i) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-4 gap-4 group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => toggleStatus(expense.id)}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${statusColors[expense.status]}`}
                >
                  {statusLabels[expense.status]}
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{expense.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {expense.categoria} · {expense.diaRecorrente ? `Todo dia ${expense.diaRecorrente}` : `Vence ${new Date(expense.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">{formatCurrency(expense.valor)}</span>
                <button
                  onClick={() => removeExpense(expense.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default ManualExpensesPage;
