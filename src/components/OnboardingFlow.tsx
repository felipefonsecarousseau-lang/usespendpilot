import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, PenLine, Crown, Sparkles, ArrowRight, Check, Target, Wallet, PiggyBank, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useFullPlanStatus } from "@/hooks/usePremiumStatus";
import { toast } from "sonner";

const GOALS = [
  { id: "economizar", label: "Economizar mais dinheiro", icon: PiggyBank },
  { id: "controlar", label: "Controlar meus gastos", icon: Wallet },
  { id: "vermelho", label: "Sair do vermelho", icon: Target },
  { id: "entender", label: "Entender para onde vai meu dinheiro", icon: HelpCircle },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [goal, setGoal] = useState("");
  const [budgetValue, setBudgetValue] = useState("");
  const navigate = useNavigate();
  const { completeOnboarding } = useOnboarding();

  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  const saveBudgetAndContinue = async () => {
    const value = parseFloat(budgetValue.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!value || value <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const now = new Date();
    const mes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    await supabase.from("monthly_budget").upsert(
      { user_id: session.user.id, mes, valor_limite: value },
      { onConflict: "user_id,mes" }
    );
    goNext();
  };

  const finishOnboarding = async (route: string) => {
    await completeOnboarding.mutateAsync(goal || "controlar");
    navigate(route);
  };

  const skipToFinish = async () => {
    await completeOnboarding.mutateAsync(goal || "controlar");
    navigate("/dashboard");
  };

  const steps = [
    // Step 0: Impact
    <motion.div key="impact" className="flex flex-col items-center text-center gap-6 max-w-md mx-auto">
      <div className="rounded-full bg-primary/10 p-5">
        <Wallet className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
        Descubra para onde seu dinheiro está indo e economize todo mês.
      </h1>
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>📸 Escaneie notas fiscais automaticamente</p>
        <p>📊 Acompanhe seus gastos mensais</p>
        <p>💡 Descubra onde economizar</p>
      </div>
      <Button size="lg" className="gap-2 mt-2" onClick={goNext}>
        Começar <ArrowRight className="h-4 w-4" />
      </Button>
    </motion.div>,

    // Step 1: Goal
    <motion.div key="goal" className="flex flex-col items-center text-center gap-6 max-w-md mx-auto">
      <h2 className="text-xl md:text-2xl font-bold text-foreground">O que você quer melhorar?</h2>
      <div className="grid grid-cols-1 gap-3 w-full">
        {GOALS.map((g) => (
          <button
            key={g.id}
            onClick={() => { setGoal(g.id); }}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left text-sm ${
              goal === g.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card/50 text-muted-foreground hover:border-primary/40"
            }`}
          >
            <g.icon className={`h-5 w-5 shrink-0 ${goal === g.id ? "text-primary" : "text-muted-foreground"}`} />
            {g.label}
            {goal === g.id && <Check className="h-4 w-4 text-primary ml-auto" />}
          </button>
        ))}
      </div>
      <Button size="lg" className="gap-2" disabled={!goal} onClick={goNext}>
        Continuar <ArrowRight className="h-4 w-4" />
      </Button>
    </motion.div>,

    // Step 2: Budget
    <motion.div key="budget" className="flex flex-col items-center text-center gap-6 max-w-md mx-auto">
      <div className="rounded-full bg-primary/10 p-4">
        <Target className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-foreground">Quanto você quer gastar por mês?</h2>
      <p className="text-sm text-muted-foreground">Vamos te ajudar a não ultrapassar esse valor.</p>
      <div className="w-full max-w-xs">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="2.000"
            value={budgetValue}
            onChange={(e) => setBudgetValue(e.target.value)}
            className="pl-10 text-center text-lg font-mono h-12"
          />
        </div>
      </div>
      <Button size="lg" className="gap-2" disabled={!budgetValue} onClick={saveBudgetAndContinue}>
        Definir meta <ArrowRight className="h-4 w-4" />
      </Button>
      <button onClick={goNext} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        Pular por agora
      </button>
    </motion.div>,

    // Step 3: First action
    <motion.div key="action" className="flex flex-col items-center text-center gap-6 max-w-md mx-auto">
      <h2 className="text-xl md:text-2xl font-bold text-foreground">Adicione seu primeiro gasto</h2>
      <p className="text-sm text-muted-foreground">Escaneie uma nota fiscal ou adicione manualmente.</p>
      <div className="grid grid-cols-1 gap-3 w-full">
        <button
          onClick={() => finishOnboarding("/scan")}
          className="flex items-center gap-4 p-5 rounded-xl border border-primary bg-primary/10 text-foreground hover:bg-primary/15 transition-all"
        >
          <ScanLine className="h-6 w-6 text-primary shrink-0" />
          <div className="text-left">
            <p className="font-medium text-sm">📸 Escanear nota fiscal</p>
            <p className="text-xs text-muted-foreground">Mais rápido e automático</p>
          </div>
          <ArrowRight className="h-4 w-4 text-primary ml-auto" />
        </button>
        <button
          onClick={() => finishOnboarding("/expenses")}
          className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
        >
          <PenLine className="h-6 w-6 shrink-0" />
          <div className="text-left">
            <p className="font-medium text-sm">✍️ Adicionar manualmente</p>
            <p className="text-xs text-muted-foreground">Contas fixas e gastos avulsos</p>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto" />
        </button>
      </div>
      <button onClick={skipToFinish} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        Ir para o dashboard
      </button>
    </motion.div>,
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/40" : "w-4 bg-muted"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full"
        >
          {steps[step]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
