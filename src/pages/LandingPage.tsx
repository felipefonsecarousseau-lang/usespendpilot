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
  TrendingDown,
  Lightbulb,
  Lock,
  AlertTriangle,
  HeartHandshake,
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
        Criar conta gratuita <ArrowRight className="ml-2 h-5 w-5" />
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
    <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Plano gratuito para sempre</span>
    <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Premium: 15 dias grátis sem cartão</span>
    <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Cancele quando quiser</span>
  </div>
);

const FAQ_ITEMS = [
  {
    q: "Funciona com qualquer supermercado?",
    a: "Sim! Nossa inteligência artificial reconhece e processa notas fiscais de praticamente todos os supermercados e estabelecimentos comerciais do Brasil, desde que a nota tenha QR Code ou código de barras legível.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Absolutamente. Utilizamos criptografia de ponta a ponta e seguimos as mais rigorosas normas de segurança e privacidade (LGPD). Seus dados são seus e não são vendidos ou compartilhados com terceiros.",
  },
  {
    q: "Preciso digitar alguma coisa manualmente?",
    a: "Quase nada. Basta tirar uma foto da nota fiscal — a IA extrai todos os dados, produtos e preços automaticamente. Para gastos sem nota (ex.: Uber, iFood), você pode adicionar manualmente em segundos.",
  },
  {
    q: "Posso usar em mais de um dispositivo?",
    a: "Sim. Sua conta ZeroDívida pode ser acessada em múltiplos dispositivos simultaneamente, garantindo controle financeiro onde quer que você esteja.",
  },
  {
    q: "Preciso de cartão de crédito para testar?",
    a: "Não. O plano gratuito não exige cartão. O período de teste Premium também começa sem nenhuma cobrança.",
  },
  {
    q: "Como o ZeroDívida encontra 'dinheiro escondido'?",
    a: "A IA analisa seus padrões de compra e compara os preços dos produtos que você mais consome em diferentes estabelecimentos ao longo do tempo. Ela identifica oportunidades de economia, sugerindo onde e quando comprar para maximizar seu dinheiro.",
  },
  {
    q: "Posso cancelar o plano Premium a qualquer momento?",
    a: "Sim, sem burocracia. O cancelamento é feito nas configurações da conta, sem multa ou fidelidade mínima.",
  },
];

const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight text-foreground">ZeroDívida</span>
          <div className="flex items-center gap-3">
            <Link to="/auth?mode=login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm">Criar conta grátis</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 pt-24">

        {/* ── Hero ── */}
        <Section className="pt-20 md:pt-32 pb-8">
          <motion.div variants={fadeUp} className="max-w-3xl">
            <span className="inline-block rounded-full bg-red-500/10 text-red-400 text-sm font-medium px-4 py-1.5 mb-6 border border-red-500/20">
              80,2% das famílias brasileiras estão endividadas
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] text-foreground">
              Pare de perder para os juros.{" "}
              <span className="text-primary">Recupere sua paz financeira.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              O ZeroDívida escaneia suas notas fiscais com IA, encontra R$ escondidos no supermercado
              e mostra exatamente quanto sobra no mês —{" "}
              <strong className="text-foreground">sem digitar nada</strong>.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary font-medium">
              <Check className="h-4 w-4" />
              100% gratuito para começar — sem necessidade de cartão
            </div>
          </motion.div>
          <motion.div variants={fadeUp}>
            <CTABlock />
            <TrustRow />
          </motion.div>
        </Section>

        {/* ── Stats ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { value: "80,2%", label: "das famílias endividadas no Brasil" },
            { value: "29%", label: "da renda perdida em juros" },
            { value: "451,5%", label: "juros rotativo do cartão ao ano" },
            { value: "R$ 1.440", label: "de economia potencial por ano" },
          ].map((s) => (
            <motion.div key={s.value} variants={fadeUp} className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Prova Social ── */}
        <SocialProofBanner />

        {/* ── O Pesadelo Diário ── */}
        <Section>
          <motion.div variants={fadeUp} className="max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">O problema</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              O pesadelo diário de quem não controla as finanças
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A vida de quem lida com dívidas vai muito além dos números negativos na conta. É um ciclo de estresse que afeta a saúde mental e as relações pessoais.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {[
              {
                icon: AlertTriangle,
                title: "Ansiedade constante",
                body: "Medo de abrir o app do banco, insônia pensando nas contas — sem visibilidade, qualquer número parece uma ameaça.",
              },
              {
                icon: TrendingDown,
                title: "Juros que nunca param",
                body: "Rotativo do cartão a 451,5% ao ano + cheque especial a 7,96% ao mês = dívida eterna pagando só o mínimo.",
              },
              {
                icon: Brain,
                title: "Gastos invisíveis",
                body: "Supermercado, streaming, iFood — tudo some sem registro. No fim do mês, você não consegue explicar o saldo.",
              },
              {
                icon: BarChart3,
                title: "Falta de clareza para agir",
                body: "Sem saber exatamente para onde o dinheiro vai, é impossível priorizar dívidas ou criar uma estratégia real.",
              },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className="glass-card p-6 flex gap-4">
                <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <item.icon className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Stats table */}
          <motion.div variants={fadeUp} className="mt-8 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-5 py-3 text-left font-semibold text-foreground">Indicador</th>
                  <th className="px-5 py-3 text-left font-semibold text-foreground">Impacto</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Famílias endividadas", "80,2% no Brasil"],
                  ["Comprometimento da renda", "29% em juros para endividados"],
                  ["Juros rotativo cartão", "451,5% ao ano"],
                  ["Saúde mental afetada", "74–84% dos endividados"],
                ].map(([ind, imp], i) => (
                  <tr key={ind} className={`border-b border-border ${i % 2 === 0 ? "bg-card" : "bg-surface/40"}`}>
                    <td className="px-5 py-3 font-medium text-foreground">{ind}</td>
                    <td className="px-5 py-3 text-muted-foreground">{imp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </Section>

        {/* ── Antes × Depois ── */}
        <Section>
          <motion.div variants={fadeUp} className="max-w-2xl mb-10">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">A solução</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              ZeroDívida: seu escudo contra o caos financeiro
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Transformamos a complexidade em simplicidade — e a ansiedade em ação.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-4 text-left font-semibold text-red-400 bg-red-500/5 w-1/2">
                    Sua realidade atual (caos)
                  </th>
                  <th className="px-5 py-4 text-left font-semibold text-primary bg-primary/5 w-1/2">
                    Com ZeroDívida (controle)
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Contas se acumulam, sem saber por onde começar.", "Visão clara de todos os gastos e o melhor caminho para reduzir dívidas."],
                  ["Gastos invisíveis drenam seu dinheiro.", "Economias inteligentes reveladas pela IA nas suas compras diárias."],
                  ["Medo de abrir o app do banco.", "Confiança para tomar decisões financeiras com dados na palma da mão."],
                  ["Noites em claro pensando nas dívidas.", "Paz mental sabendo que você está no controle."],
                ].map(([antes, depois], i) => (
                  <tr key={i} className={`border-b border-border ${i % 2 === 0 ? "" : "bg-surface/30"}`}>
                    <td className="px-5 py-4 text-muted-foreground align-top">{antes}</td>
                    <td className="px-5 py-4 text-foreground font-medium align-top">{depois}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-6 text-center">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="font-semibold px-10 py-6 text-base">
                Quero minha paz de volta! <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-3">Gratuito para sempre · Premium com 15 dias de teste sem cartão</p>
          </motion.div>
        </Section>

        {/* ── Demo sections (existing) ── */}
        <EconomiaRealtimeSection />
        <GastosOrganizadosSection />
        <InsightsSection />

        {/* ── 3 passos ── */}
        <Section>
          <motion.div variants={fadeUp} className="max-w-2xl mb-12">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">Como funciona</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              3 passos simples para sua liberdade
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Desenhado para ser intuitivo — configure em menos de 2 minutos e já veja resultados.
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                icon: Camera,
                num: "01",
                title: "Foto da nota fiscal",
                body: "Tire uma foto da sua nota fiscal. A IA extrai todos os dados, produtos e preços automaticamente — sem digitar nada.",
                detail: "Foto → dados em segundos, organizados por categoria.",
              },
              {
                icon: TrendingDown,
                num: "02",
                title: "Comparação inteligente",
                body: "O ZeroDívida compara seu histórico de compras e te mostra onde você pode economizar com base nos seus próprios dados.",
                detail: "Exemplo: 'Supermercado X economiza 12% nos seus itens essenciais.'",
              },
              {
                icon: Lightbulb,
                num: "03",
                title: "Insights acionáveis",
                body: "Receba relatórios claros e personalizados com o quanto sobra para quitar dívidas e como melhorar sua saúde financeira.",
                detail: "Exemplo: 'R$1.440/ano disponíveis para abater o rotativo.'",
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

        {/* ── Depoimentos ── */}
        <Section>
          <motion.div variants={fadeUp} className="max-w-2xl mb-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">Depoimentos</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              +7.243 usuários já recuperaram o controle
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Veja o que pessoas como você estão dizendo sobre como o ZeroDívida mudou suas vidas.
            </p>
          </motion.div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                quote: "Eu estava desesperada com as dívidas do cartão. Com o ZeroDívida, consegui ver para onde meu dinheiro ia e quitei R$2.000 em 3 meses. Hoje durmo em paz!",
                name: "Maria S.",
                city: "São Paulo",
              },
              {
                quote: "Achei que controlar gastos era um bicho de sete cabeças. O ZeroDívida me mostrou que é simples. A função de escanear notas é um divisor de águas. Minha família agradece!",
                name: "João P.",
                city: "Rio de Janeiro",
              },
              {
                quote: "Sempre fui desorganizado com dinheiro. O ZeroDívida me deu o controle que eu precisava, sem me julgar. As dicas de economia são ouro! Já economizei o suficiente para uma viagem.",
                name: "Ana L.",
                city: "Belo Horizonte",
              },
            ].map((t) => (
              <motion.div key={t.name} variants={fadeUp} className="glass-card p-6 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.city}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-8 glass-card p-6 flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
            <div>
              <p className="text-3xl font-bold text-primary">R$ 1.440</p>
              <p className="text-sm text-muted-foreground">economizados/ano em média</p>
            </div>
            <div className="hidden md:block h-12 w-px bg-border" />
            <div>
              <p className="text-3xl font-bold text-primary">92%</p>
              <p className="text-sm text-muted-foreground">relatam menos ansiedade financeira</p>
            </div>
            <div className="hidden md:block h-12 w-px bg-border" />
            <div>
              <p className="text-3xl font-bold text-primary">+7.243</p>
              <p className="text-sm text-muted-foreground">usuários ativos</p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-6 text-center">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="font-semibold px-10 py-6 text-base">
                Junte-se a eles! Comece grátis <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </Section>

        {/* ── Planos ── */}
        <Section>
          <motion.div variants={fadeUp} className="max-w-2xl mb-12">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">Planos</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Comece grátis. Evolua quando fizer sentido.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Sem cartão de crédito nos primeiros 15 dias. Cancele quando quiser.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Plano Gratuito */}
            <motion.div variants={fadeUp} className="glass-card p-8 flex flex-col">
              <h3 className="text-xl font-bold text-foreground mb-1">Gratuito</h3>
              <p className="text-muted-foreground text-sm mb-6">Ideal para começar a sentir o controle.</p>
              <p className="text-3xl font-bold text-foreground mb-8">
                R$ 0<span className="text-base font-normal text-muted-foreground">/mês</span>
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Controle manual de gastos",
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
              <p className="text-muted-foreground text-sm mb-6">Tudo ilimitado. Economize de verdade.</p>
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
                  "Escaneamento ilimitado de notas com IA",
                  "Comparação avançada de preços entre mercados",
                  "Insights automáticos de economia",
                  "Simulador de cenários financeiros",
                  "Projeções e análise de saúde financeira",
                  "Suporte prioritário",
                  "Conteúdos exclusivos de educação financeira",
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
              <h2 className="text-2xl font-bold text-foreground mb-2">Garantia ZeroDívida: 30 dias ou seu dinheiro de volta</h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                Experimente por 30 dias. Se você não sentir que o ZeroDívida vale o que paga, devolvemos
                o valor integralmente — sem perguntas, sem burocracia. Zero risco para você.
              </p>
            </div>
          </motion.div>
        </Section>

        {/* ── Segurança ── */}
        <Section>
          <motion.div variants={fadeUp} className="max-w-2xl mb-10">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">Privacidade & Segurança</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Seus dados são seus.</h2>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-col md:flex-row gap-6">
            {[
              { icon: Lock, title: "Dados criptografados", body: "Suas informações são armazenadas com criptografia e acessíveis apenas por você." },
              { icon: Shield, title: "Sem venda de dados", body: "Não compartilhamos nenhuma informação financeira com anunciantes ou terceiros. Seus dados não são vendidos." },
              { icon: HeartHandshake, title: "Conformidade LGPD", body: "Seguimos as mais rigorosas normas de segurança e privacidade da Lei Geral de Proteção de Dados." },
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
            <p className="mt-4 text-lg text-muted-foreground">
              Tire suas dúvidas e comece sua jornada para a liberdade financeira com confiança.
            </p>
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
              Controle seus gastos, descubra onde economizar e tome decisões financeiras com base em dados reais — não em achismos.
            </p>
            <CTABlock centered />
            <TrustRow />
          </motion.div>
        </Section>

        {/* ── Footer ── */}
        <footer className="border-t border-border py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-base font-bold text-foreground">ZeroDívida</span>
              <p className="text-xs text-muted-foreground mt-1">
                © {new Date().getFullYear()} ZeroDívida. Todos os direitos reservados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <a href="mailto:suporte.zerodivida@gmail.com" className="hover:text-foreground transition-colors">
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
