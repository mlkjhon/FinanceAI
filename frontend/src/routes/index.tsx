import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, Shield, Zap, Target, ArrowRight, Star, BarChart3, Wallet, Brain } from 'lucide-react';
import { useRef } from 'react';
import { Navbar } from '../components/Navbar';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const token = localStorage.getItem('finance_token');
    if (token) throw redirect({ to: '/dashboard' });
  },
  component: LandingPage,
});

const features = [
  {
    icon: <Brain size={28} />,
    title: 'IA Financeira',
    description: 'Nossa inteligência artificial analisa seus gastos e gera insights personalizados para você economizar mais.',
    color: 'var(--color-finance-accent)',
  },
  {
    icon: <BarChart3 size={28} />,
    title: 'Dashboard Completo',
    description: 'Visualize sua saúde financeira em tempo real com gráficos interativos e métricas claras.',
    color: 'var(--color-finance-primary)',
  },
  {
    icon: <Target size={28} />,
    title: 'Metas Personalizadas',
    description: 'Defina e acompanhe seus objetivos financeiros com acompanhamento visual e motivacional.',
    color: 'var(--color-finance-secondary)',
  },
  {
    icon: <Shield size={28} />,
    title: 'Segurança Total',
    description: 'Seus dados são protegidos com autenticação JWT e criptografia de ponta a ponta.',
    color: 'var(--color-finance-error)',
  },
  {
    icon: <Wallet size={28} />,
    title: 'Controle de Orçamento',
    description: 'Configure limites de gastos por categoria e receba alertas antes de ultrapassar.',
    color: 'var(--color-finance-accent)',
  },
  {
    icon: <Zap size={28} />,
    title: 'Transações em Tempo Real',
    description: 'Registre e categorize receitas e despesas de forma rápida e intuitiva.',
    color: 'var(--color-finance-primary)',
  },
];

const steps = [
  { num: '01', title: 'Crie sua conta', desc: 'Cadastro rápido em segundos, sem burocracia.' },
  { num: '02', title: 'Adicione suas transações', desc: 'Importe ou registre seus gastos e receitas por categoria.' },
  { num: '03', title: 'Deixe a IA trabalhar', desc: 'Receba insights, previsões e dicas personalizadas baseadas no seu perfil financeiro.' },
];

const testimonials = [
  { name: 'Ana Paula M.', role: 'Designer UX', text: 'Consegui quitar minhas dívidas em 6 meses usando as recomendações da IA. Incrível!', stars: 5 },
  { name: 'Lucas Oliveira', role: 'Engenheiro de Software', text: 'O dashboard é lindo e funcional. Finalmente entendo para onde vai meu dinheiro.', stars: 5 },
  { name: 'Maria Clara S.', role: 'Professora', text: 'As metas me mantêm motivada. A barra de progresso me faz querer economizar mais todo mês.', stars: 5 },
];

function FeatureCard({ icon, title, description, color, index }: typeof features[0] & { index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="finance-card p-6 group"
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <h3 className="font-brand font-semibold text-lg mb-2 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}

export default function LandingPage() {
  const featRef = useRef(null);
  const featInView = useInView(featRef, { once: true });

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32 px-4">
        {/* Gradient blob */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[var(--color-finance-primary)]/10 to-[var(--color-finance-accent)]/5 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[var(--color-finance-secondary)]/10 blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-finance-primary)]/10 text-[var(--color-finance-primary)] dark:text-[var(--color-finance-accent)] text-sm font-medium mb-6 border border-[var(--color-finance-primary)]/20"
          >
            <Zap size={14} />
            Powered by Inteligência Artificial
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-brand text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight mb-6"
          >
            Controle suas finanças
            <br />
            <span className="bg-gradient-to-r from-[var(--color-finance-primary)] to-[var(--color-finance-accent)] bg-clip-text text-transparent">
              com inteligência
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10"
          >
            O FinanceAI usa IA avançada para analisar seus gastos, identificar oportunidades de economia e te ajudar a alcançar seus objetivos financeiros.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/auth"
              className="group flex items-center gap-2 px-8 py-4 rounded-2xl gradient-hero text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-[var(--color-finance-primary)]/30"
            >
              Começar gratuitamente
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-base hover:border-[var(--color-finance-primary)] hover:text-[var(--color-finance-primary)] transition-colors"
            >
              Ver demonstração
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-2 mt-10 text-sm text-gray-500"
          >
            <div className="flex -space-x-2">
              {['A', 'B', 'C'].map((l) => (
                <div key={l} className="w-8 h-8 rounded-full gradient-hero border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                  {l}
                </div>
              ))}
            </div>
            <span>+2.400 pessoas já usam o FinanceAI</span>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section ref={featRef} className="py-20 px-4 bg-gray-50/50 dark:bg-black/10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={featInView ? { opacity: 1, y: 0 } : {}}
            className="text-center mb-14"
          >
            <h2 className="font-brand text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Tudo que você precisa para prosperar
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Ferramentas poderosas aliadas à IA para transformar sua relação com o dinheiro.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-brand text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Como funciona
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-10">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-hero text-white font-brand font-bold text-xl mb-4 shadow-lg shadow-[var(--color-finance-primary)]/20">
                  {s.num}
                </div>
                <h3 className="font-brand font-semibold text-lg mb-2 text-gray-900 dark:text-white">{s.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-50/50 dark:bg-black/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-brand text-3xl font-bold text-gray-900 dark:text-white mb-4">
              O que nossos usuários dizem
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="finance-card p-6"
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={14} className="fill-[var(--color-finance-secondary)] text-[var(--color-finance-secondary)]" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full gradient-hero flex items-center justify-center text-white text-xs font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="gradient-hero rounded-3xl p-12 shadow-2xl shadow-[var(--color-finance-primary)]/20"
          >
            <h2 className="font-brand text-3xl sm:text-4xl font-bold text-white mb-4">
              Comece sua transformação financeira hoje
            </h2>
            <p className="text-white/70 mb-8">Grátis para sempre. Sem cartão de crédito.</p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[var(--color-finance-primary)] font-bold rounded-2xl hover:bg-white/90 transition-colors text-base"
            >
              Criar conta grátis
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-[var(--color-finance-primary)]" />
            <span className="font-brand font-bold text-gray-700 dark:text-white">
              Finance<span className="text-[var(--color-finance-accent)]">AI</span>
            </span>
          </div>
          <p className="text-sm text-gray-400">© 2026 FinanceAI. Todos os direitos reservados.</p>
          <div className="flex gap-4 text-sm text-gray-400">
            <a href="#" className="hover:text-[var(--color-finance-primary)] transition-colors">Política de Privacidade</a>
            <a href="#" className="hover:text-[var(--color-finance-primary)] transition-colors">Termos de Uso</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
