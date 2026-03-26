import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockInsights } from "@/data/mockLandingData";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const InsightsSection = () => {
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
        🧠 Inteligência que Economiza
      </motion.h2>
      <motion.p
        variants={fadeUp}
        className="mt-3 text-lg text-muted-foreground"
      >
        Receba insights automáticos baseados nos seus gastos reais.
      </motion.p>

      <motion.div
        variants={fadeUp}
        className="mt-10 grid gap-4 md:grid-cols-3"
      >
        {mockInsights.map((insight) => (
          <Card
            key={insight.title}
            className="border-border bg-card hover:bg-secondary/40 transition-colors"
          >
            <CardContent className="p-6 flex flex-col h-full">
              <span className="text-3xl mb-3" role="img" aria-label={insight.title}>
                {insight.emoji}
              </span>
              <h3 className="text-lg font-semibold text-foreground">
                {insight.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground flex-1">
                {insight.description}
              </p>
              <Link to="/auth?mode=signup" className="mt-4">
                <Button variant="ghost" size="sm" className="px-0 text-primary hover:text-primary/80">
                  Ver detalhes <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </motion.section>
  );
};

export default InsightsSection;
