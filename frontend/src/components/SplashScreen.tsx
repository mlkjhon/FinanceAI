import React from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import { Icon } from './icons';

interface SplashScreenProps {
  type?: 'initial' | 'transition' | 'ai';
  message?: string;
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const financialMessages = [
  'Cuide hoje do seu amanhã financeiro.',
  'Cada centavo conta. Cada decisão importa.',
  'Inteligência que organiza sua vida financeira.',
  'Seu dinheiro, seu futuro, sua escolha.',
];

export function SplashScreen({ type = 'initial', message }: SplashScreenProps) {
  const [currentMessage, setCurrentMessage] = React.useState(0);
  const amount = useMotionValue(0);
  const amountText = useTransform(amount, (v) => brl.format(v));

  React.useEffect(() => {
    if (type !== 'initial') return;
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % financialMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [type]);

  React.useEffect(() => {
    if (type !== 'initial') return;
    const controls = animate(amount, 99999.99, { duration: 1.5, ease: [0.23, 1, 0.32, 1] });
    return () => controls.stop();
  }, [type, amount]);

  if (type === 'ai') {
    return (
      <div className="fixed inset-0 z-[var(--z-splash)] flex flex-col items-center justify-center bg-white">
        <NeuralWave />
        <motion.p
          key={message}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-8 text-[var(--color-finance-accent)] font-body text-sm font-medium tracking-wide"
        >
          {message || 'Analisando seus padrões de gastos...'}
        </motion.p>
      </div>
    );
  }

  if (type === 'transition') {
    return (
      <div className="fixed inset-0 z-[var(--z-splash)] flex items-center justify-center bg-white">
        <div className="w-full max-w-sm px-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="h-4 rounded-full bg-gradient-to-r from-[var(--color-finance-secondary)]/20 via-[var(--color-finance-secondary)]/60 to-[var(--color-finance-secondary)]/20 bg-[length:200%_100%]"
              style={{ width: `${100 - i * 15}%` }}
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Initial splash
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[var(--z-splash)] flex flex-col items-center justify-center bg-white overflow-hidden"
    >
      {/* Floating particles */}
      <ParticleGraph />

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo */}
        <motion.div
          initial={{ transform: 'scale(0.9)', opacity: 0 }}
          animate={{ transform: 'scale(1)', opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl gradient-hero flex items-center justify-center shadow-lg shadow-[var(--color-finance-primary)]/30">
            <Icon name="trend-up" size={28} className="text-white" />
          </div>
          <span className="text-3xl font-brand font-bold text-gray-900 tracking-tight">Finance<span className="text-[var(--color-finance-accent)]">AI</span></span>
        </motion.div>

        {/* Animated counter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xl font-brand font-semibold text-[var(--color-finance-secondary)] tabular-nums"
        >
          {amountText}
        </motion.div>

        {/* Rotating message */}
        <motion.p
          key={currentMessage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5 }}
          className="text-gray-500 text-sm text-center max-w-xs"
        >
          {financialMessages[currentMessage]}
        </motion.p>

        {/* Loading dots */}
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-[var(--color-finance-accent)]"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ParticleGraph() {
  const bars = [22, 38, 30, 52, 45, 66, 72, 84];
  return (
    <div className="absolute inset-x-0 bottom-0 flex h-1/2 items-end justify-center gap-[3vw] px-[8vw] opacity-10 pointer-events-none">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-[4vw] max-w-10 rounded-t-lg bg-[var(--color-finance-secondary)] origin-bottom"
          style={{ height: h + '%' }}
          initial={{ transform: 'scaleY(0.2)' }}
          animate={{ transform: 'scaleY(1)' }}
          transition={{ duration: 0.9, delay: i * 0.06, ease: [0.23, 1, 0.32, 1] }}
        />
      ))}
    </div>
  );
}

function NeuralWave() {
  return (
    <div className="relative w-32 h-32">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-[var(--color-finance-accent)]/40"
          animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: [0.77, 0, 0.175, 1] }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 rounded-2xl gradient-hero flex items-center justify-center"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <Icon name="check" size={20} className="text-white" />
        </motion.div>
      </div>
    </div>
  );
}

/* Overlay com saída animada; carregado sob demanda pelo __root (fora da landing). */
export function SplashOverlay({ show }: { show: boolean }) {
  return <AnimatePresence>{show && <SplashScreen key="splash" type="initial" />}</AnimatePresence>;
}
