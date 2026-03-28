import { motion } from "framer-motion";
import { ArrowRight, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { mockPriceComparison } from "@/data/mockLandingData";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const EconomiaRealtimeSection = () => {
  const { stores, products, savings } = mockPriceComparison;

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className="py-10 md:py-20"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-3 mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <TrendingDown className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Comparação de preços</p>
      </motion.div>
      <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-3">
        Seus mercados, seus preços
      </motion.h2>
      <motion.p variants={fadeUp} className="text-lg text-muted-foreground mb-10 max-w-xl">
        Com base nas suas compras, o SpendPilot mostra qual mercado compensa mais para cada produto.
      </motion.p>

      {/* Cabeçalho das lojas */}
      <motion.div variants={fadeUp} className="glass-card overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-3 px-6 py-3 border-b border-border bg-secondary/30">
          <span className="text-xs font-medium text-muted-foreground">Produto</span>
          {stores.map((s) => (
            <span key={s.name} className={`text-xs font-medium text-right ${s.isCheapest ? "text-primary" : "text-muted-foreground"}`}>
              {s.name}
              {s.isCheapest && (
                <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px]">✓ mais barato</span>
              )}
            </span>
          ))}
        </div>

        {/* Product rows */}
        {products.map((product, idx) => {
          const cheapestIdx = product.prices.indexOf(Math.min(...product.prices));
          return (
            <div key={product.name} className={`grid grid-cols-3 px-6 py-4 ${idx < products.length - 1 ? "border-b border-border/50" : ""}`}>
              <span className="text-sm text-foreground font-medium">{product.name}</span>
              {product.prices.map((price, pi) => (
                <span
                  key={pi}
                  className={`text-sm font-mono text-right ${pi === cheapestIdx ? "text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  R$ {price.toFixed(2).replace(".", ",")}
                </span>
              ))}
            </div>
          );
        })}

        {/* Savings footer */}
        <div className="px-6 py-4 bg-primary/5 border-t border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm font-semibold text-primary">
            Economia total nesta compra: R$ {savings.toFixed(2).replace(".", ",")}
          </p>
          <Link to="/auth?mode=signup">
            <Button variant="outline" size="sm">
              Ver minha comparação <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </motion.div>

      <motion.p variants={fadeUp} className="mt-4 text-xs text-muted-foreground">
        Dados ilustrativos. Sua comparação é gerada com base no seu histórico real de compras.
      </motion.p>
    </motion.section>
  );
};

export default EconomiaRealtimeSection;
