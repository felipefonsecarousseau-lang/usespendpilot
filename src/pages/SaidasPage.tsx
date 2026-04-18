import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Zap, RotateCcw, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import FixedExpensesTab from "@/components/saidas/FixedExpensesTab";
import ScannerExpensesTab from "@/components/saidas/ScannerExpensesTab";
import ManualExpensesTab from "@/components/saidas/ManualExpensesTab";

type TabKey = "fixed" | "scanner" | "manual";

const tabs: { key: TabKey; label: string; icon: typeof ScanLine; color: string }[] = [
  { key: "fixed", label: "Contas Fixas", icon: RotateCcw, color: "text-muted-foreground" },
  { key: "scanner", label: "Notas Fiscais", icon: ScanLine, color: "text-primary" },
  { key: "manual", label: "Gastos Rápidos", icon: Zap, color: "text-accent" },
];

const SaidasPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === null ? (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Saídas</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Controle tudo que sai do seu dinheiro em um só lugar
                </p>
              </div>

              <div className="grid gap-4">
                {tabs.map((tab, i) => {
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => setActiveTab(tab.key)}
                      className="glass-card p-6 flex items-center gap-4 hover:border-primary/30 transition-colors text-left w-full group"
                    >
                      <div className="rounded-full bg-secondary p-3 group-hover:bg-primary/10 transition-colors">
                        <Icon className={`h-6 w-6 ${tab.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-foreground">{tab.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tab.key === "fixed" && "Gerencie suas contas recorrentes mensais"}
                          {tab.key === "scanner" && "Notas fiscais escaneadas via câmera"}
                          {tab.key === "manual" && "Gastos avulsos registrados manualmente"}
                        </p>
                      </div>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={() => setActiveTab(null)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>

              {activeTab === "fixed" && <FixedExpensesTab />}
              {activeTab === "scanner" && <ScannerExpensesTab />}
              {activeTab === "manual" && <ManualExpensesTab />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default SaidasPage;
