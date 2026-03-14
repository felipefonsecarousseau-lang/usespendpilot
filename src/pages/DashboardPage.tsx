import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, AlertTriangle, Calendar } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const spendingData = [
  { name: "Supermercado", value: 1850, color: "hsl(160, 84%, 39%)" },
  { name: "Moradia", value: 2200, color: "hsl(160, 84%, 28%)" },
  { name: "Restaurante", value: 680, color: "hsl(160, 60%, 50%)" },
  { name: "Streaming", value: 77.80, color: "hsl(215, 16%, 46%)" },
  { name: "Utilidades", value: 309.40, color: "hsl(215, 16%, 36%)" },
  { name: "Transporte", value: 450, color: "hsl(160, 40%, 60%)" },
  { name: "Cinema", value: 120, color: "hsl(215, 20%, 55%)" },
];

const totalGasto = spendingData.reduce((s, d) => s + d.value, 0);
const mediaMensal = 5200;
const excedeMédia = totalGasto > mediaMensal;

const alertas = [
  { icon: TrendingUp, text: "Gasto com Restaurante 22% acima da média", tipo: "warning" as const },
  { icon: Calendar, text: "Conta de Luz vence em 2 dias", tipo: "info" as const },
  { icon: AlertTriangle, text: "Supermercado: R$ 350 acima do previsto este mês", tipo: "warning" as const },
];

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 20, delay: i * 0.08 },
  }),
};

const formatCurrency = (val: number) => {
  const [intPart, decPart] = val.toFixed(2).split(".");
  return (
    <span className="currency-display">
      R$ {intPart}<span className="opacity-50">,{decPart}</span>
    </span>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card p-3 text-sm">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-muted-foreground">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const DashboardPage = () => {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm text-muted-foreground">Março 2026</p>
          <h1 className="text-lg font-medium text-muted-foreground mt-1">Gasto total do mês</h1>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <p className={`text-5xl md:text-6xl font-bold tracking-tighter font-mono mt-2 ${
              excedeMédia ? "text-accent" : "text-foreground"
            }`}>
              {formatCurrency(totalGasto)}
            </p>
            {excedeMédia && (
              <p className="text-xs text-accent mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                R$ {(totalGasto - mediaMensal).toFixed(0)} acima da média mensal
              </p>
            )}
          </motion.div>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Donut Chart */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            className="glass-card p-6 md:col-span-3"
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Distribuição por categoria</h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spendingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      strokeWidth={2}
                      stroke="hsl(222, 47%, 2%)"
                      dataKey="value"
                    >
                      {spendingData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {spendingData
                  .sort((a, b) => b.value - a.value)
                  .map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-mono text-xs">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>

          {/* Alertas */}
          <motion.div
            custom={1}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            className="glass-card p-6 md:col-span-2"
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Pontos de atenção</h2>
            <div className="space-y-3">
              {alertas.map((alerta, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3 glass-card-inner p-3"
                >
                  <alerta.icon className={`h-4 w-4 mt-0.5 shrink-0 ${
                    alerta.tipo === "warning" ? "text-accent" : "text-primary"
                  }`} />
                  <p className="text-sm text-muted-foreground">{alerta.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recent Transactions */}
        <motion.div
          custom={2}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="glass-card p-6"
        >
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Últimas transações</h2>
          <div className="divide-y divide-border">
            {[
              { nome: "Supermercado Extra", cat: "Supermercado", valor: 287.50, data: "12 Mar" },
              { nome: "iFood", cat: "Restaurante", valor: 68.90, data: "11 Mar" },
              { nome: "Netflix", cat: "Streaming", valor: 55.90, data: "10 Mar" },
              { nome: "Uber", cat: "Transporte", valor: 32.40, data: "10 Mar" },
              { nome: "Farmácia Drogasil", cat: "Saúde", valor: 94.70, data: "09 Mar" },
            ].map((t, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{t.nome}</p>
                  <p className="text-xs text-muted-foreground">{t.cat} · {t.data}</p>
                </div>
                <span className="text-sm">{formatCurrency(t.valor)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
