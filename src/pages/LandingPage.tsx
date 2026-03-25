import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Camera,
  Brain,
  BarChart3,
  ShoppingCart,
  Zap,
  TrendingUp,
  Target,
  Shield,
  Star,
  Rocket,
  Mail,
  Check,
  ArrowRight,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const Section = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.section
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-80px" }}
    variants={stagger}
    className={`py-16 md:py-24 ${className}`}
  >
    {children}
  </motion.section>
);

const FeatureItem = ({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) => (
  <motion.div variants={fadeUp} className="flex items-start gap-3">
    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <p className="text-muted-foreground leading-relaxed">{text}</p>
  </motion.div>
);

const CTAButton = ({ className = "" }: { className?: string }) => (
  <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
    <Link to="/auth?mode=signup">
      <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6 font-semibold">
        Comece grátis <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </Link>
    <Link to="/auth?mode=login">
      <Button
        variant="outline"
        size="lg"
        className="w-full sm:w-auto text-base px-8 py-6"
      >
        Já tenho conta
      </Button>
    </Link>
  </div>
);

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight text-foreground">
            🛒 SpendPilot
          </span>
          <Link to="/auth?mode=login">
            <Button variant="ghost" size="sm">
              Entrar
            </Button>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 pt-24">
        {/* Hero */}
        <Section className="pt-20 md:pt-32 pb-12">
          <motion.div variants={fadeUp} className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] text-foreground">
              Descubra onde comprar{" "}
              <span className="text-primary">mais barato</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              O SpendPilot analisa suas notas fiscais e mostra, com base no seu
              próprio histórico,{" "}
              <strong className="text-foreground">
                qual mercado tem os melhores preços para você
              </strong>
              .
            </p>
          </motion.div>
          <motion.div variants={fadeUp} className="mt-10">
            <CTAButton />
          </motion.div>
        </Section>

        {/* Economize */}
        <Section>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-foreground"
          >
            💥 Economize no supermercado sem mudar sua rotina
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-3 text-lg text-muted-foreground"
          >
            Você já faz suas compras. Agora o SpendPilot te mostra{" "}
            <strong className="text-foreground">onde gastar menos</strong>.
          </motion.p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <FeatureItem icon={Camera} text="Escaneie suas notas fiscais" />
            <FeatureItem
              icon={Brain}
              text="O sistema identifica produtos e preços"
            />
            <FeatureItem
              icon={BarChart3}
              text="Compare automaticamente entre supermercados"
            />
          </div>
          <motion.p
            variants={fadeUp}
            className="mt-8 text-lg font-semibold text-primary"
          >
            👉 Resultado: economia real todos os meses.
          </motion.p>
        </Section>

        {/* Compare preços */}
        <Section>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-foreground"
          >
            🛒 Compare preços com base na sua vida real
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-3 text-lg text-muted-foreground"
          >
            Nada de médias genéricas. O SpendPilot compara:
          </motion.p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-semibold text-foreground text-lg">
                O que comparamos
              </h3>
              <FeatureItem icon={ShoppingCart} text="Os produtos que VOCÊ compra" />
              <FeatureItem icon={ShoppingCart} text="Os mercados que VOCÊ frequenta" />
              <FeatureItem icon={ShoppingCart} text="Os preços que VOCÊ já pagou" />
            </div>
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-semibold text-foreground text-lg">
                Você descobre
              </h3>
              <FeatureItem
                icon={Check}
                text="Qual supermercado é mais barato"
              />
              <FeatureItem
                icon={Check}
                text="Onde cada produto compensa mais"
              />
              <FeatureItem
                icon={Check}
                text="Onde você está pagando acima do normal"
              />
            </div>
          </div>
        </Section>

        {/* Veja onde está o dinheiro */}
        <Section>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-foreground"
          >
            📊 Veja onde está o dinheiro
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-3 text-lg text-muted-foreground"
          >
            Tenha clareza total do seu mês:
          </motion.p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              "Quanto já gastou",
              "Quanto ainda pode gastar",
              "Quanto está acima ou abaixo da meta",
            ].map((t) => (
              <motion.div
                key={t}
                variants={fadeUp}
                className="glass-card p-6 text-center"
              >
                <p className="text-foreground font-medium">{t}</p>
              </motion.div>
            ))}
          </div>
          <motion.p
            variants={fadeUp}
            className="mt-6 text-primary font-semibold"
          >
            👉 Tudo atualizado automaticamente.
          </motion.p>
        </Section>

        {/* Escaneie notas */}
        <Section>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-foreground"
          >
            📸 Escaneie notas e automatize tudo
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-3 text-lg text-muted-foreground"
          >
            Sem digitação.
          </motion.p>
          <div className="mt-8 space-y-4">
            <FeatureItem icon={Camera} text="Tire foto da nota fiscal" />
            <FeatureItem
              icon={Zap}
              text="O sistema extrai os dados automaticamente"
            />
            <FeatureItem
              icon={BarChart3}
              text="Organiza tudo por categoria e produto"
            />
          </div>
          <motion.p
            variants={fadeUp}
            className="mt-6 text-primary font-semibold"
          >
            👉 Seu histórico vira inteligência.
          </motion.p>
        </Section>

        {/* Sugestões de economia */}
        <Section>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-foreground"
          >
            💡 Sugestões reais de economia
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-3 text-lg text-muted-foreground"
          >
            Receba recomendações como:
          </motion.p>
          <div className="mt-8 space-y-3">
            {[
              '"Arroz está 18% mais barato no mercado X"',
              '"Você pode economizar R$120/mês mudando de mercado"',
              '"Este produto varia muito de preço entre lojas"',
            ].map((q) => (
              <motion.div
                key={q}
                variants={fadeUp}
                className="glass-card px-6 py-4 border-l-4 border-l-primary"
              >
                <p className="text-foreground italic">{q}</p>
              </motion.div>
            ))}
          </div>
          <motion.p
            variants={fadeUp}
            className="mt-6 text-primary font-semibold"
          >
            👉 Economia prática, baseada nos seus dados.
          </motion.p>
        </Section>

        {/* Registre qualquer gasto */}
        <Section>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-foreground"
          >
            ⚡ Registre qualquer gasto em segundos
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-3 text-lg text-muted-foreground"
          >
            Além do supermercado, controle tudo:
          </motion.p>
          <div className="mt-8 flex flex-wrap gap-3">
            {["Uber", "Pix", "iFood", "Dinheiro"].map((t) => (
              <motion.span
                key={t}
                variants={fadeUp}
                className="rounded-full bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground"
              >
                {t}
              </motion.span>
            ))}
          </div>
          <motion.p
            variants={fadeUp}
            className="mt-6 text-primary font-semibold"
          >
            👉 Em menos de 5 segundos.
          </motion.p>
        </Section>

        {/* Evolução financeira */}
        <Section>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-foreground"
          >
            📈 Entenda sua evolução financeira
          </motion.h2>
          <div className="mt-8 space-y-4">
            <FeatureItem icon={TrendingUp} text="Compare meses" />
            <FeatureItem icon={TrendingUp} text="Veja tendências" />
            <FeatureItem
              icon={TrendingUp}
              text="Projete quanto vai gastar no ano"
            />
          </div>
          <motion.p
            variants={fadeUp}
            className="mt-6 text-primary font-semibold"
          >
            👉 Não só controle — <strong>antecipe</strong>.
          </motion.p>
        </Section>

        {/* Metas */}
        <Section>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-foreground"
          >
            🎯 Defina metas e economize de verdade
          </motion.h2>
          <div className="mt-8 space-y-4">
            <FeatureItem icon={Target} text="Limite mensal claro" />
            <FeatureItem
              icon={Target}
              text="Acompanhamento em tempo real"
            />
            <FeatureItem
              icon={Target}
              text="Impacto imediato após cada gasto"
            />
          </div>
        </Section>

        {/* Segurança */}
        <Section>
          <motion.div
            variants={fadeUp}
            className="glass-card p-8 md:p-12 text-center"
          >
            <Shield className="mx-auto h-10 w-10 text-primary mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              🔐 Seguro e privado
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">
              Seus dados são protegidos e visíveis apenas por você.
            </p>
          </motion.div>
        </Section>

        {/* Plano Grátis */}
        <Section>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-foreground"
          >
            💰 Comece grátis
          </motion.h2>
          <div className="mt-8 space-y-3">
            {[
              "Controle de gastos",
              "Upload de notas fiscais",
              "Comparação básica",
              "Dashboard completo",
            ].map((f) => (
              <motion.div
                key={f}
                variants={fadeUp}
                className="flex items-center gap-3"
              >
                <Check className="h-5 w-5 text-primary shrink-0" />
                <span className="text-foreground">{f}</span>
              </motion.div>
            ))}
          </div>
          <motion.div variants={fadeUp} className="mt-8">
            <CTAButton />
          </motion.div>
        </Section>

        {/* Premium */}
        <Section>
          <motion.div
            variants={fadeUp}
            className="glass-card p-8 md:p-12 border-primary/20"
          >
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-6 w-6 text-accent" />
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Premium
              </h2>
            </div>
            <p className="text-lg text-muted-foreground mb-6">
              Onde está o dinheiro de verdade. Desbloqueie:
            </p>
            <div className="space-y-3 mb-8">
              {[
                "Comparação avançada entre supermercados",
                "Insights inteligentes de economia",
                "Projeções financeiras",
                "Cálculo de economia mensal e anual",
              ].map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-accent shrink-0" />
                  <span className="text-foreground">{f}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-baseline gap-4 mb-2">
              <span className="text-3xl font-bold text-foreground">
                R$19,90
                <span className="text-base font-normal text-muted-foreground">
                  /mês
                </span>
              </span>
              <span className="text-muted-foreground">ou</span>
              <span className="text-3xl font-bold text-foreground">
                R$149,90
                <span className="text-base font-normal text-muted-foreground">
                  /ano
                </span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-8">
              🎁 15 dias grátis, sem cartão
            </p>
            <CTAButton />
          </motion.div>
        </Section>

        {/* CTA Final */}
        <Section className="text-center pb-12">
          <motion.div variants={fadeUp}>
            <Rocket className="mx-auto h-10 w-10 text-primary mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Comece a economizar hoje
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
              Você não precisa mudar seus hábitos. Só precisa saber:{" "}
              <strong className="text-primary">onde comprar melhor</strong>.
            </p>
            <div className="mt-8 flex justify-center">
              <CTAButton />
            </div>
          </motion.div>
        </Section>

        {/* Footer */}
        <footer className="border-t border-border py-12 text-center">
          <p className="text-muted-foreground text-sm">
            📩 Precisa de ajuda? Fale com a gente:
          </p>
          <a
            href="mailto:suporte.spendpilot@gmail.com"
            className="mt-2 inline-block text-primary font-medium hover:underline"
          >
            suporte.spendpilot@gmail.com
          </a>
          <p className="mt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} SpendPilot. Todos os direitos
            reservados.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
