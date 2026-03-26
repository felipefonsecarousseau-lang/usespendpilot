import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mockPriceComparison } from "@/data/mockLandingData";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const EconomiaRealtimeSection = () => {
  const { product, stores, savings } = mockPriceComparison;

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
        🔍 Veja Sua Economia em Tempo Real
      </motion.h2>
      <motion.p
        variants={fadeUp}
        className="mt-3 text-lg text-muted-foreground"
      >
        Compare preços entre supermercados com base nas suas compras.
      </motion.p>

      <motion.div
        variants={fadeUp}
        className="mt-10 grid gap-4 md:grid-cols-2"
      >
        {stores.map((store) => (
          <Card
            key={store.name}
            className={`relative overflow-hidden border ${
              store.isCheapest
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {store.name}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    store.isCheapest
                      ? "bg-primary/15 text-primary"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {store.badge}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{product}</p>
              <p
                className={`mt-1 text-3xl font-bold ${
                  store.isCheapest ? "text-primary" : "text-foreground"
                }`}
              >
                R$ {store.price.toFixed(2).replace(".", ",")}
              </p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      >
        <p className="text-lg font-semibold text-primary">
          💰 Economize R$ {savings.toFixed(2).replace(".", ",")} nesta compra
        </p>
        <Link to="/auth?mode=signup">
          <Button variant="outline" size="sm">
            Ver mais ofertas <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </motion.div>
    </motion.section>
  );
};

export default EconomiaRealtimeSection;
