import { Link } from '@tanstack/react-router';
import { motion } from 'motion/react';
import { ArrowLeft, TrendingUp } from './icons';

export function NotFoundPage() {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, transform: 'translateY(8px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-10">
          <span className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center text-white">
            <TrendingUp size={20} />
          </span>
          <span className="font-brand font-bold text-xl text-[var(--color-finance-primary-hover)]">
            Finance<span className="text-[var(--color-finance-accent)]">AI</span>
          </span>
        </Link>

        <p className="font-brand text-display text-[var(--color-accent)]" data-num>404</p>
        <h1 className="mt-2 font-brand text-h3 font-bold text-[var(--color-ink)]">Página não encontrada</h1>
        <p className="mt-3 text-body text-[var(--color-ink-soft)] max-w-sm mx-auto">
          O endereço pode ter mudado ou não existe mais. Volte ao início para continuar.
        </p>

        <Link
          to="/"
          className="pressable mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-accent)] text-white font-semibold"
        >
          <ArrowLeft size={18} />
          Voltar ao início
        </Link>
      </motion.div>
    </main>
  );
}
