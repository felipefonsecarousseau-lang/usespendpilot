import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import EconomiaRealtimeSection from "@/components/landing/EconomiaRealtimeSection";
import GastosOrganizadosSection from "@/components/landing/GastosOrganizadosSection";
import InsightsSection from "@/components/landing/InsightsSection";
import SocialProofBanner from "@/components/landing/SocialProofBanner";
import {
  Camera,
  Brain,
  BarChart3,
  Shield,
  Star,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Receipt,
  TrendingDown,
  Lightbulb,
  Lock,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
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
    viewport={{ once: true, margin: "-60px" }}
    variants={stagger}
    className={`py-16 md:py-24 ${className}`}
  >
    {children}
  </motion.section>
);

const CTABlock = ({ centered = false }: { centered?: boolean }) => (
  <div className={`flex flex-col sm:flex-row gap-3 mt-8 ${centered ? "justify-center" : ""}`}>
    <Link to="/auth?mode=signup">
      <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6 font-semibold">
        Comece grátis <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </Link>
    <Link to="/auth?mode=login">
      <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 py-6">
        Já tenho conta
      </Button>
    </Link>
  </div>
);

const TrustRow = () => (
  <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-sm text-muted-foreground">
    <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> 15 dias grátis</span>
    <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Sem cartão de crédito</span>
    <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Cancele quando quiser</span>
  </div>
);

const FAQ_ITEMS = [
  {
    q: "Como o SpendPilot funciona?",
    a: "Você escaneia suas notas fiscais com a câmera ou enviando o arquivo. A IA extrai os produtos e preços automaticamente. Com o tempo, o sistema compara os preços entre os mercados onde você compra e gera insights de economia.",
  },
  {
    q: "Meus dados são privados?",
    a: "Sim. Seus dados são protegidos e visíveis apenas por você. Não compartilhamos nenhuma informação pessoal ou financeira com terceiros.",
  },
  {
    q: "Quanto tempo leva para configurar?",
    a: "Menos de 2 minutos. Crie sua conta, escaneie a primeira nota e o dashboard já é atualizado automaticamente.",
  },
  {
    q: "Preciso de cartão de crédito para testar?",
    a: "Não. O plano gratuito não exige cartão. O período de teste do Premium também começa sem cobrança.",
  },
  {
    q: "Posso cancelar o plano Premium a qualquer momento?",
    a: "Sim, sem burocracia. O cancelamento pode ser feito nas configurações da conta, sem multa ou fidelidade.",
  },
  {
    q: "O SpendPilot funciona com qualquer supermercado?",
    a: "Sim. A leitura é feita pela nota fiscal, então funciona com qualquer estabelecimento que emita cupom fiscal.",
  },
];

const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight text-foreground">
            SpendPilot
          </span>
          <div className="flex items-center gap-3">
            <Link to="/auth?mode=login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm">Começar grátis</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 pt-24">

        {/* ── Hero ── */}
        <Section className="pt-20 md:pt-32 pb-8">
          <motion.div variants={fadeUp} className="max-w-3xl">
            <span className="inline-block rounded-full bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 mb-6">
              Controle financeiro + economia no supermercado
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] text-foreground">
              Saiba para onde vai o seu dinheiro.{" "}
              <span className="text-primary">E onde economizar.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              O SpendPilot lê suas notas fiscais automaticamente, organiza seus gastos por categoria
              e mostra — com base no seu próprio histórico —{" "}
              <strong className="text-foreground">qual supermercado tem os melhores preços para você</strong>.
            </p>
          </motion.div>
          <motion.div variants={fadeUp}>
            <CTABlock />
            <TrustRow />
          </motion.div>
        </Section>

        {/* ── Prova Social ── */}
        <SocialProofBanner />

        {/* ── Demo: Comparação de preços ── */}
        <EconomiaRealtimeSection />

        {/* ── Demo: Dashboard de gastos ── */}
        <GastosOrganizadosSection />

        {/* ── Demo: Insights ── */}
        <InsightsSection />

        {/* ── Problema ── */}
        <Section>
          <motion.div variants={fadeUp} className="max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">O problema</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Você provavelmente está gastando mais do que deveria
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Não por descuido — mas porque falta visibilidade. Sem dados, é impossível tomar decisões melhores.
            </p>
          </motion.div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Sem controle real",
                body: "Você sabe aproximadamente quanto gasta, mas raramente sabe exatamente onde o dinheiro foi.",
              },
              {
                title: "Gastos invisíveis",
                body: "Supermercado, iFood, Uber — tudo some sem registro. No fim do mês, você não consegue explicar o saldo.",
              },
              {
                title: "Supermercado caro sem saber",
                body: "Os preços variam até 20% entre mercados. Sem comparação, você paga mais sem perceber.",
              },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className="glass-card p-6">
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ── Agitação: impacto real ── */}
        <Section>
          <motion.div variants={fadeUp} className="glass-card p-8 md:p-12 border-accent/20">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">O impacto</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Quanto isso custa por ano?
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                { value: "R$ 800", label: "gasto médio mensal em supermercado", sub: "para uma família de 3 pessoas" },
                { value: "15%", label: "de variação de preço entre mercados", sub: "nos mesmos produtos" },
                { value: "R$ 1.440", label: "de economia potencial por ano", sub: "só comprando no mercado certo" },
              ].map((stat) => (
                <div key={stat.value} className="text-center md:text-left">
                  <p className="text-4xl font-bold text-primary">{stat.value}</p>
                  <p className="text-sm font-medium text-foreground mt-1">{stat.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-muted-foreground text-sm border-t border-border pt-6">
              Esses R$ 1.440 não aparecem em nenhuma conta — são gastos que somem invisíveis, compra a compra.
              O SpendPilot torna esse desperdício visível.
            </p>
          </motion.div>
        </Section>

        {/* ── Solução: 3 pilares ── */}
        <Section>
          <motion.div variants={fadeUp} className="max-w-2xl mb-12">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">Como funciona</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Três pilares que trabalham juntos
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Cada funcionalidade alimenta a próxima. Quanto mais você usa, mais preciso fica.
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                icon: Receipt,
                num: "01",
                title: "Leitura automática de notas fiscais",
                body: "Fotografe ou envie o arquivo da nota. A IA extrai todos os produtos, quantidades e preços sem digitação. Funciona com qualquer estabelecimento que emita cupom fiscal.",
                detail: "Foto → dados em segundos, organizados por categoria automaticamente.",
              },
              {
                icon: TrendingDown,
                num: "02",
                title: "Comparação de preços baseada no seu histórico real",
                body: "Nada de médias genéricas de internet. O SpendPilot compara os preços que você mesmo pagou, nos mercados que você frequenta, para os produtos que você compra.",
                detail: "Exemplo: Arroz 5kg → Mercado A R$ 32,90 · Mercado B R$ 27,50 → economia de R$ 5,40.",
              },
              {
                icon: Lightbulb,
                num: "03",
                title: "Insights práticos de economia",
                body: "Com base no histórico acumulado, o sistema gera sugestões diretas: qual mercado compensa mais para cada tipo de produto e quanto você economizaria mudando um hábito.",
                detail: "Sem achismos — só dados do seu próprio histórico de compras.",
              },
            ].map((pilar) => (
              <motion.div key={pilar.num} variants={fadeUp} className="glass-card p-6 md:p-8 flex gap-6">
                <div className="shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <pilar.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-1">{pilar.num}</p>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{pilar.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">{pilar.body}</p>
                  <p className="text-sm text-primary font-medium">{pilar.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ── Planos ── */}
        <Section>
          <motion.div variants={fadeUp} className="max-w-2xl mb-12">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">Planos</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Comece grátis. Evolua quando fizer sentido.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Plano Gratuito */}
            <motion.div variants={fadeUp} className="glass-card p-8 flex flex-col">
              <h3 className="text-xl font-bold text-foreground mb-1">Gratuito</h3>
              <p className="text-muted-foreground text-sm mb-6">Para começar a ter controle.</p>
              <p className="text-3xl font-bold text-foreground mb-8">
                R$ 0<span className="text-base font-normal text-muted-foreground">/mês</span>
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Controle de gastos manuais",
                  "Upload e leitura de notas fiscais",
                  "Dashboard de categorias",
                  "Registro de gastos fixos",
                  "Histórico de compras",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth?mode=signup">
                <Button variant="outline" className="w-full">Criar conta grátis</Button>
              </Link>
            </motion.div>

            {/* Plano Premium */}
            <motion.div variants={fadeUp} className="glass-card p-8 flex flex-col border-primary/30 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="rounded-full bg-primary/15 text-primary text-xs font-semibold px-3 py-1">
                  15 dias grátis
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-5 w-5 text-accent" />
                <h3 className="text-xl font-bold text-foreground">Premium</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-6">Para economizar de verdade no supermercado.</p>
              <div className="mb-2">
                <p className="text-3xl font-bold text-foreground">
                  R$ 19,90<span className="text-base font-normal text-muted-foreground">/mês</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ou <strong className="text-foreground">R$ 149,90/ano</strong> — 2 meses grátis
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-6">Sem cartão durante o período de teste.</p>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Tudo do plano gratuito",
                  "Comparação avançada entre supermercados",
                  "Insights automáticos de economia",
                  "Projeções financeiras mensais",
                  "Cálculo de economia potencial por produto",
                  "Análise de saúde financeira",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                    <Check className="h-4 w-4 text-accent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth?mode=signup">
                <Button className="w-full font-semibold">
                  Experimentar grátis por 15 dias <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </Section>

        {/* ── Garantia ── */}
        <Section>
          <motion.div variants={fadeUp} className="glass-card p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="shrink-0 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Garantia de 30 dias</h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                Se em 30 dias você não sentir que o SpendPilot vale o que paga, devolvemos o valor integralmente.
                Sem perguntas, sem burocracia.
              </p>
            </div>
          </motion.div>
        </Section>

        {/* ── Segurança ── */}
        <Section>
          <motion.div variants={fadeUp} className="flex flex-col md:flex-row gap-6">
            {[
              { icon: Lock, title: "Dados criptografados", body: "Suas informações são armazenadas com criptografia e acessíveis apenas por você." },
              { icon: Shield, title: "Sem venda de dados", body: "Não compartilhamos nenhuma informação financeira com anunciantes ou terceiros." },
              { icon: Brain, title: "IA sem acesso externo", body: "O processamento das notas é feito internamente. Seus dados não alimentam modelos de terceiros." },
            ].map((item) => (
              <div key={item.title} className="glass-card p-6 flex gap-4 flex-1">
                <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </Section>

        {/* ── FAQ ── */}
        <Section>
          <motion.div variants={fadeUp} className="max-w-2xl mb-10">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">Dúvidas frequentes</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Perguntas e respostas</h2>
          </motion.div>
          <motion.div variants={fadeUp} className="space-y-2 max-w-3xl">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="glass-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-medium text-foreground">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-muted-foreground text-sm leading-relaxed border-t border-border pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        </Section>

        {/* ── CTA Final ── */}
        <Section className="text-center pb-12">
          <motion.div variants={fadeUp} className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Comece a ter clareza financeira hoje
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Controle seus gastos, descubra onde economizar no supermercado e tome decisões financeiras com base em dados reais.
            </p>
            <CTABlock centered />
            <TrustRow />
          </motion.div>
        </Section>

        {/* ── Footer ── */}
        <footer className="border-t border-border py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-base font-bold text-foreground">SpendPilot</span>
              <p className="text-xs text-muted-foreground mt-1">
                © {new Date().getFullYear()} SpendPilot. Todos os direitos reservados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <a href="mailto:suporte.spendpilot@gmail.com" className="hover:text-foreground transition-colors">
                Suporte
              </a>
              <span className="hover:text-foreground transition-colors cursor-pointer">Termos de uso</span>
              <span className="hover:text-foreground transition-colors cursor-pointer">Privacidade</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
