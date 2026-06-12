import React from 'react';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { TrendingUp, Menu, X, Moon, Sun } from 'lucide-react';
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
  const [dark, setDark] = React.useState(() => document.body.classList.contains('dark'));

  const toggleDark = () => {
    document.body.classList.toggle('dark');
    setDark((prev) => !prev);
  };

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-40 glass border-b border-white/10"
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
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-gray-500 hover:text-[var(--color-finance-primary)] hover:bg-[var(--color-finance-primary)]/5 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

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
                  className="md:hidden p-2 rounded-lg text-gray-500 hover:text-[var(--color-finance-primary)] transition-colors"
                >
                  {menuOpen ? <X size={20} /> : <Menu size={20} />}
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

      {/* Mobile menu */}
      {menuOpen && isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[var(--color-finance-card-dark)] px-4 py-3 space-y-1"
        >
          {navLinks.slice(1).map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-[var(--color-finance-primary)]/5 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => { logout(); setMenuOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Sair
          </button>
        </motion.div>
      )}
    </motion.nav>
  );
}
