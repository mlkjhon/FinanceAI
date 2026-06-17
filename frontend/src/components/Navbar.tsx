import React from 'react';
import { Link } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const navLinks = [
  { href: '/', label: 'Início' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/transactions', label: 'Transações' },
  { href: '/budgets', label: 'Orçamentos' },
  { href: '/goals', label: 'Metas' },
  { href: '/bancos', label: 'Bancos' },
  { href: '/insights', label: 'Insights IA' },
];

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 glass border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl gradient-hero flex items-center justify-center shadow shadow-[var(--color-finance-primary)]/30 group-hover:scale-110 transition-transform">
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="font-brand font-bold text-lg text-[var(--color-finance-primary)] dark:text-white">
              Finance<span className="text-[var(--color-finance-accent)]">AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.slice(1).map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-[var(--color-finance-primary)] dark:hover:text-[var(--color-finance-accent)] hover:bg-[var(--color-finance-primary)]/5 transition-colors"
                  activeProps={{ className: 'text-[var(--color-finance-primary)] bg-[var(--color-finance-primary)]/10 dark:text-[var(--color-finance-accent)]' }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2">

            {isAuthenticated ? (
              <>
                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                  <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center text-white text-xs font-bold">
                    {user?.nome?.charAt(0).toUpperCase()}
                  </div>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                  >
                    Sair
                  </button>
                </div>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="md:hidden p-2 rounded-lg text-gray-500 hover:text-[var(--color-finance-primary)] bg-gray-50 transition-colors"
                >
                  <Menu size={20} />
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="px-4 py-2 rounded-xl text-sm font-semibold gradient-hero text-white hover:opacity-90 transition-opacity shadow shadow-[var(--color-finance-primary)]/20"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu Overlay & Drawer */}
      <AnimatePresence>
        {menuOpen && isAuthenticated && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="md:hidden fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed top-0 right-0 h-screen w-64 z-[70] bg-white shadow-2xl flex flex-col p-6"
            >
              <div className="flex justify-between items-center mb-8">
                <span className="font-brand font-bold text-lg text-[var(--color-finance-primary)]">
                  Menu
                </span>
                <button onClick={() => setMenuOpen(false)} className="p-2 text-gray-500 hover:text-gray-900 bg-gray-100 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto">
                {navLinks.slice(1).map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-[var(--color-finance-primary)]/10 hover:text-[var(--color-finance-primary)] transition-colors"
                    activeProps={{ className: 'text-[var(--color-finance-primary)] bg-[var(--color-finance-primary)]/10' }}
                  >
                    {link.label}
                  </Link>
                ))}
                <hr className="my-4 border-gray-100" />
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="text-left px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  Sair da conta
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
