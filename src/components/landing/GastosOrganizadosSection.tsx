import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { mockExpenseBreakdown } from "@/data/mockLandingData";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const GastosOrganizadosSection = () => {
  const { period, total, categories } = mockExpenseBreakdown;

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={stagger}
      className="py-10 md:py-20"
    >
      <motion.h2
        variants={fadeUp}
        className="text-3xl md:text-4xl font-bold text-foreground"
      >
        📊 Seus Gastos Organizados Automaticamente
      </motion.h2>
      <motion.p
        variants={fadeUp}
        className="mt-3 text-lg text-muted-foreground"
      >
        Saiba exatamente para onde vai o seu dinheiro.
      </motion.p>

      <motion.div variants={fadeUp} className="mt-10">
        <Card className="border-border bg-card overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-8">
              <div>
                <p className="text-sm text-muted-foreground">{period}</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground mt-1">
                  R$ {total.toLocaleString("pt-BR")}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    gastos este mês
                  </span>
                </p>
              </div>
              <span className="self-start rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                Exemplo ilustrativo
              </span>
            </div>

            <div className="space-y-5">
              {categories.map((cat) => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">
                      {cat.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      R$ {cat.value.toLocaleString("pt-BR")} ({cat.percent}%)
                    </span>
                  </div>
                  <div
                    className="h-2.5 w-full rounded-full bg-secondary"
                    role="progressbar"
                    aria-label={`${cat.name}: ${cat.percent}%`}
                    aria-valuenow={cat.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: cat.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${cat.percent}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.section>
  );
};

export default GastosOrganizadosSection;
