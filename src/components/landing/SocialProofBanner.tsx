import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Users } from "lucide-react";

function useAnimatedCounter(target: number, duration = 2000, enabled = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const start = performance.now();
    let raf: number;

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);

  return count;
}

const SocialProofBanner = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const count = useAnimatedCounter(7243, 2200, isInView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="py-10 md:py-14"
    >
      <div className="glass-card p-8 md:p-10 text-center flex flex-col items-center gap-4">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Users className="h-6 w-6" />
          <span className="text-3xl md:text-4xl font-bold tabular-nums">
            +{count.toLocaleString("pt-BR")}
          </span>
          <span className="text-lg md:text-xl font-semibold text-foreground">
            usuários ativos
          </span>
        </div>

        <p className="text-muted-foreground text-base md:text-lg max-w-xl leading-relaxed">
          Já estão economizando no supermercado com decisões mais inteligentes.
        </p>

        <p className="text-sm font-medium text-primary/80">
          Descubra onde você está pagando mais caro antes de comprar.
        </p>
      </div>
    </motion.div>
  );
};

export default SocialProofBanner;
