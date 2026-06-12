import { createFileRoute, Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/404')({
  component: NotFoundPage,
});

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[var(--color-finance-primary)]/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-[var(--color-finance-accent)]/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <span className="font-brand font-bold text-xl text-[var(--color-finance-primary)] dark:text-white">
            Finance<span className="text-[var(--color-finance-accent)]">AI</span>
          </span>
        </div>

        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-8xl font-brand font-black text-transparent bg-gradient-to-r from-[var(--color-finance-primary)] to-[var(--color-finance-accent)] bg-clip-text mb-4"
        >
          404
        </motion.div>

        <h1 className="font-brand text-2xl font-bold text-gray-900 dark:text-white mb-3">Página não encontrada</h1>
        <p className="text-gray-500 text-sm max-w-xs mx-auto mb-8">
          Parece que você se perdeu nas suas finanças. Não se preocupe, vamos te colocar no caminho certo!
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-hero text-white font-semibold hover:opacity-90 transition-opacity"
        >
          <ArrowLeft size={18} />
          Voltar ao início
        </Link>
      </motion.div>
    </div>
  );
}
