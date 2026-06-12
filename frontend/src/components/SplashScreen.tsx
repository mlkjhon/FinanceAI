import React from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  type?: 'initial' | 'transition' | 'ai';
  message?: string;
}

const financialMessages = [
  'Cuide hoje do seu amanhã financeiro.',
  'Cada centavo conta. Cada decisão importa.',
  'Inteligência que organiza sua vida financeira.',
  'Seu dinheiro, seu futuro, sua escolha.',
];

export function SplashScreen({ type = 'initial', message }: SplashScreenProps) {
  const [currentMessage, setCurrentMessage] = React.useState(0);
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    if (type !== 'initial') return;
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % financialMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [type]);

  React.useEffect(() => {
    if (type !== 'initial') return;
    let start = 0;
    const end = 99999.99;
    const duration = 1500;
    const step = end / (duration / 16);
    const raf = () => {
      start += step;
      if (start >= end) { setDisplayValue(end); return; }
      setDisplayValue(start);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [type]);

  if (type === 'ai') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white overflow-hidden"
    >
      {/* Floating particles */}
      <ParticleGraph />

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl gradient-hero flex items-center justify-center shadow-lg shadow-[var(--color-finance-primary)]/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <span className="text-3xl font-brand font-bold text-white tracking-tight">Finance<span className="text-[var(--color-finance-accent)]">AI</span></span>
        </motion.div>

        {/* Animated counter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xl font-brand font-semibold text-[var(--color-finance-secondary)] tabular-nums"
        >
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayValue)}
        </motion.div>

        {/* Rotating message */}
        <motion.p
          key={currentMessage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5 }}
          className="text-white/50 text-sm text-center max-w-xs"
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
  const points = [
    { x: 10, y: 80 }, { x: 20, y: 65 }, { x: 32, y: 70 },
    { x: 45, y: 48 }, { x: 58, y: 55 }, { x: 70, y: 35 },
    { x: 82, y: 28 }, { x: 92, y: 20 },
  ];
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.path
          d={pathD}
          fill="none"
          stroke="var(--color-finance-accent)"
          strokeWidth="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop', repeatDelay: 1 }}
        />
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x} cy={p.y} r="0.8"
            fill="var(--color-finance-secondary)"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
            transition={{ duration: 2, delay: i * 0.2, repeat: Infinity, repeatDelay: 1 }}
          />
        ))}
      </svg>
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
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: 'easeInOut' }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 rounded-2xl gradient-hero flex items-center justify-center"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z"/>
            <path d="m8 12 3 3 6-6"/>
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
