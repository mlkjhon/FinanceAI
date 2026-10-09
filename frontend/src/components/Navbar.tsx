import React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronRight, Menu, X } from './icons';
import { Wordmark } from './landing/wordmark';
import { useAuth } from '../contexts/AuthContext';
import { spring } from '../lib/motion-tokens';

const navLinks = [
  { href: '/dashboard', label: 'Visão geral' },
  { href: '/transactions', label: 'Transações' },
  { href: '/budgets', label: 'Orçamentos' },
  { href: '/goals', label: 'Metas' },
  { href: '/bancos', label: 'Bancos' },
  { href: '/investimentos', label: 'Investimentos' },
  { href: '/insights', label: 'Insights' },
];

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduce = useReducedMotion();
  const activeHref = navLinks.find((l) => pathname === l.href || pathname.startsWith(l.href + '/'))?.href;

  return (
    <nav className="sticky top-0 z-[var(--z-header)] bg-white/95 border-b border-[var(--color-line)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" aria-label="FinanceAI, página inicial">
            <Wordmark />
          </Link>

          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = link.href === activeHref;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                      active ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {/*
                      Indicador da tela ativa: desliza de um link para o outro.
                      Propósito: continuidade espacial na troca de tela (ocasional).
                    */}
                    {active && (
                      <motion.span
                        layoutId={reduce ? undefined : 'nav-active'}
                        transition={spring.snappy}
                        className="absolute inset-0 -z-10 rounded-full bg-[var(--color-accent)]/8"
                      />
                    )}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Atalho para o perfil (o "Sair" fica lá dentro) */}
                <div className="hidden lg:flex items-center pl-3 border-l border-[var(--color-line)]">
                  <Link
                    to="/profile"
                    aria-label="Meu perfil e configurações"
                    aria-current={pathname === '/profile' ? 'page' : undefined}
                    className={`group pressable flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors duration-200 hover:bg-[var(--color-surface)] ${
                      pathname === '/profile' ? 'bg-[var(--color-accent)]/8' : ''
                    }`}
                  >
                    <span className="w-8 h-8 rounded-[10px] bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center text-xs font-bold">
                      {user?.nome?.charAt(0).toUpperCase()}
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-[var(--color-ink-muted)] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5 group-hover:text-[var(--color-ink)]"
                    />
                  </Link>
                </div>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Abrir menu"
                  aria-expanded={menuOpen}
                  className="pressable lg:hidden p-2 rounded-full text-[var(--color-ink-soft)] bg-[var(--color-surface)]"
                >
                  <Menu size={20} />
                </button>
              </>
            ) : (
              <Link to="/auth" className="btn-primary px-4 py-2 text-sm">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && isAuthenticated && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              onClick={() => setMenuOpen(false)}
              className="lg:hidden fixed inset-0 z-[var(--z-overlay)] bg-[var(--color-ink)]/25"
            />
            <motion.div
              initial={{ transform: 'translateX(100%)' }}
              animate={{ transform: 'translateX(0%)' }}
              exit={{ transform: 'translateX(100%)', transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="lg:hidden fixed top-0 right-0 h-[100dvh] w-72 z-[var(--z-drawer)] bg-white shadow-2xl flex flex-col p-6 pt-[calc(1.5rem+env(safe-area-inset-top))]"
            >
              <div className="flex justify-between items-center mb-8">
                <span className="text-sm text-[var(--color-ink-muted)]">Olá, {user?.nome?.split(' ')[0]}</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Fechar menu"
                  className="pressable p-2 text-[var(--color-ink-soft)] bg-[var(--color-surface)] rounded-full"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={link.href === activeHref ? 'page' : undefined}
                    className={`px-4 py-3 rounded-xl text-base font-medium transition-colors duration-200 ${
                      link.href === activeHref
                        ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/8'
                        : 'text-[var(--color-ink-soft)]'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-base font-medium text-[var(--color-ink-soft)]"
                >
                  Perfil
                </Link>
                <hr className="my-4 border-[var(--color-line)]" />
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="text-left px-4 py-3 rounded-xl text-base font-medium text-loss"
                >
                  Sair da conta
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
