import { Mail, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqSection {
  emoji: string;
  title: string;
  questions: { q: string; a: string }[];
}

const faqSections: FaqSection[] = [
  {
    emoji: "🧾",
    title: "Uso geral",
    questions: [
      {
        q: "O que é o ZeroDívida?",
        a: "O ZeroDívida é uma plataforma inteligente de controle de gastos. Ele permite escanear notas fiscais, registrar despesas manuais, acompanhar contas fixas, definir metas e ter uma visão completa das suas finanças mensais.",
      },
      {
        q: "Preciso pagar para usar?",
        a: "Não! O ZeroDívida oferece um plano gratuito com funcionalidades essenciais. Você também pode experimentar o plano Premium gratuitamente por 15 dias ao se cadastrar.",
      },
      {
        q: "O que está incluído no plano gratuito?",
        a: "No plano gratuito você pode registrar gastos manuais, cadastrar contas fixas, acompanhar o dashboard mensal e definir metas de economia.",
      },
      {
        q: "O que está incluído no Premium?",
        a: "O plano Premium inclui OCR de notas fiscais, comparação de preços entre estabelecimentos, insights inteligentes com IA, previsões financeiras e análises avançadas de gastos.",
      },
    ],
  },
  {
    emoji: "📸",
    title: "Notas fiscais",
    questions: [
      {
        q: "Como funciona o envio de notas?",
        a: "Basta tirar uma foto ou enviar uma imagem da nota fiscal. Nossa IA extrai automaticamente os produtos, preços, quantidades e o estabelecimento.",
      },
      {
        q: "Posso editar os dados extraídos?",
        a: "Sim! Após o escaneamento, você pode revisar e editar todos os dados antes de salvar. Altere nomes, preços, categorias ou remova itens que não deseja registrar.",
      },
      {
        q: "O sistema sempre acerta na leitura?",
        a: "A IA tem alta precisão, mas notas com baixa qualidade de imagem, amassadas ou com fontes muito pequenas podem gerar erros. Por isso, sempre oferecemos a etapa de revisão antes de salvar.",
      },
      {
        q: "Quais dados são extraídos da nota?",
        a: "Extraímos o nome do estabelecimento, CNPJ, data da compra, cada produto com nome, quantidade, preço unitário, preço total e categoria.",
      },
    ],
  },
  {
    emoji: "🛒",
    title: "Comparação de preços",
    questions: [
      {
        q: "Como funciona a comparação de preços?",
        a: "O ZeroDívida compara os preços dos produtos que você comprou em diferentes estabelecimentos ao longo do tempo, mostrando onde cada item foi mais barato.",
      },
      {
        q: "Preciso cadastrar produtos manualmente?",
        a: "Não! Os produtos são cadastrados automaticamente quando você escaneia notas fiscais. Quanto mais notas você enviar, mais completa será a comparação.",
      },
      {
        q: "Posso saber qual supermercado é mais barato?",
        a: "Sim! Com base no histórico das suas compras, o app mostra qual estabelecimento oferece os melhores preços para os produtos que você costuma comprar.",
      },
      {
        q: "O app sugere economia?",
        a: "Sim! O ZeroDívida calcula quanto você poderia economizar se comprasse seus produtos nos locais mais baratos e gera sugestões personalizadas.",
      },
    ],
  },
  {
    emoji: "💸",
    title: "Gastos manuais",
    questions: [
      {
        q: "Posso adicionar gastos sem nota fiscal?",
        a: "Sim! Na seção de gastos manuais, você pode registrar qualquer despesa informando nome, valor, categoria, forma de pagamento e data.",
      },
      {
        q: "Quais são exemplos de gastos manuais?",
        a: "Contas de luz, água, internet, aluguel, transporte, lazer, alimentação fora de casa, assinaturas de streaming — qualquer gasto do seu dia a dia.",
      },
      {
        q: "Eles entram no total mensal?",
        a: "Sim! Todos os gastos manuais são somados ao seu total mensal e aparecem no dashboard junto com as notas fiscais escaneadas.",
      },
    ],
  },
  {
    emoji: "🔁",
    title: "Contas fixas",
    questions: [
      {
        q: "Posso cadastrar contas recorrentes?",
        a: "Sim! Cadastre contas fixas como aluguel, internet, energia, e o ZeroDívida acompanha automaticamente o vencimento e status de pagamento todo mês.",
      },
      {
        q: "Posso marcar como pago?",
        a: "Sim! Cada mês você pode marcar individualmente quais contas foram pagas, mantendo o controle total dos seus compromissos financeiros.",
      },
      {
        q: "Elas aparecem automaticamente todo mês?",
        a: "Sim! As contas fixas ativas geram automaticamente uma ocorrência para cada mês, facilitando o acompanhamento sem retrabalho.",
      },
    ],
  },
  {
    emoji: "📊",
    title: "Dashboard",
    questions: [
      {
        q: "O que aparece no dashboard?",
        a: "O dashboard mostra o resumo do mês atual: total gasto, orçamento restante, contas fixas pendentes, metas de economia e gráficos de distribuição por categoria.",
      },
      {
        q: "Inclui todos os tipos de gastos?",
        a: "Sim! O dashboard consolida gastos de notas fiscais, despesas manuais e contas fixas em uma única visão.",
      },
      {
        q: "Atualiza automaticamente?",
        a: "Sim! Sempre que você registra um novo gasto ou escaneia uma nota, o dashboard é atualizado em tempo real.",
      },
    ],
  },
  {
    emoji: "🎯",
    title: "Metas",
    questions: [
      {
        q: "Posso definir uma meta mensal de gastos?",
        a: "Sim! Defina um orçamento mensal e o ZeroDívida acompanha em tempo real quanto você já gastou e quanto ainda pode gastar.",
      },
      {
        q: "O app mostra quanto ainda posso gastar?",
        a: "Sim! Com base no orçamento definido e nos gastos registrados, o app calcula e mostra o saldo disponível para o restante do mês.",
      },
    ],
  },
  {
    emoji: "📈",
    title: "Análises",
    questions: [
      {
        q: "O que são insights inteligentes?",
        a: "São análises geradas pela IA que identificam padrões nos seus gastos, como categorias onde você gasta mais, tendências de aumento e oportunidades de economia.",
      },
      {
        q: "Posso ver a evolução dos meus gastos?",
        a: "Sim! A visão financeira mostra gráficos comparativos entre meses, evolução por categoria e tendências ao longo do tempo.",
      },
      {
        q: "Existe previsão de gastos futuros?",
        a: "Sim! Com base no seu histórico, o ZeroDívida projeta seus gastos para os próximos meses, ajudando no planejamento financeiro.",
      },
    ],
  },
  {
    emoji: "💰",
    title: "Economia",
    questions: [
      {
        q: "O app me ajuda a economizar?",
        a: "Sim! Através da comparação de preços, insights de gastos e sugestões personalizadas, o ZeroDívida identifica onde e como você pode economizar.",
      },
      {
        q: "Posso ver quanto economizei?",
        a: "Sim! O app calcula a economia potencial e realizada com base nas suas compras e escolhas de estabelecimentos.",
      },
    ],
  },
  {
    emoji: "🔐",
    title: "Segurança",
    questions: [
      {
        q: "Meus dados estão seguros?",
        a: "Sim! Utilizamos criptografia, autenticação segura e políticas de acesso por usuário. Seus dados financeiros são protegidos e nunca compartilhados.",
      },
      {
        q: "Outros usuários podem ver meus dados?",
        a: "Não! Cada conta é completamente isolada. Apenas você tem acesso aos seus gastos, notas e informações financeiras.",
      },
    ],
  },
  {
    emoji: "💳",
    title: "Assinatura",
    questions: [
      {
        q: "Existe teste gratuito do Premium?",
        a: "Sim! Ao se cadastrar, você recebe 15 dias de Premium grátis para experimentar todas as funcionalidades antes de decidir assinar.",
      },
      {
        q: "Posso cancelar a qualquer momento?",
        a: "Sim! Você pode cancelar sua assinatura a qualquer momento sem burocracia. Seu acesso Premium continua até o final do período pago.",
      },
      {
        q: "Posso ver meu histórico de assinatura?",
        a: "Sim! Na página 'Minha Assinatura' você encontra informações sobre seu plano atual, período de teste e status da assinatura.",
      },
    ],
  },
  {
    emoji: "🆘",
    title: "Suporte",
    questions: [
      {
        q: "Onde posso pedir ajuda?",
        a: "Você pode entrar em contato pelo e-mail suporte.zerodivida@gmail.com. Respondemos o mais rápido possível!",
      },
      {
        q: "Posso sugerir melhorias?",
        a: "Claro! Adoramos ouvir nossos usuários. Envie suas sugestões para suporte.zerodivida@gmail.com e ajude a tornar o ZeroDívida ainda melhor.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <HelpCircle className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Perguntas Frequentes
          </h1>
          <p className="mt-3 text-muted-foreground">
            Encontre respostas rápidas sobre como usar o ZeroDívida e aproveitar
            ao máximo suas finanças.
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqSections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                <span>{section.emoji}</span>
                {section.title}
              </h2>
              <Accordion type="multiple" className="rounded-xl border border-border bg-card">
                {section.questions.map((item, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`${section.title}-${idx}`}
                    className="border-border px-4 last:border-b-0"
                  >
                    <AccordionTrigger className="py-4 text-left text-sm font-medium text-foreground hover:text-primary hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>

        {/* Support Footer */}
        <div className="mt-12 rounded-xl border border-border bg-card p-6 text-center sm:p-8">
          <h3 className="text-lg font-semibold text-foreground">
            Ainda precisa de ajuda?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre em contato com nosso suporte e responderemos o mais rápido
            possível.
          </p>
          <a
            href="mailto:suporte.zerodivida@gmail.com"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Mail className="h-4 w-4" />
            suporte.zerodivida@gmail.com
          </a>
        </div>

        {/* Back link */}
        <div className="mt-8 text-center">
          <a
            href="/dashboard"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            ← Voltar ao Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
