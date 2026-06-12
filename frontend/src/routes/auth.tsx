import React, { useState } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TrendingUp, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export const Route = createFileRoute('/auth')({
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

const registerSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

function InputField({
  label, type = 'text', error, placeholder, ...rest
}: {
  label: string;
  type?: string;
  error?: string;
  placeholder?: string;
  [key: string]: unknown;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative">
        <input
          type={isPassword ? (showPwd ? 'text' : 'password') : type}
          placeholder={placeholder}
          className={cn(
            'w-full px-4 py-3 rounded-xl border text-sm bg-white dark:bg-[var(--color-finance-card-dark)] text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all',
            'border-gray-200 dark:border-gray-700 focus:border-[var(--color-finance-primary)] focus:ring-2 focus:ring-[var(--color-finance-primary)]/20',
            error && 'border-[var(--color-finance-error)] focus:ring-[var(--color-finance-error)]/20'
          )}
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-[var(--color-finance-error)]">{error}</p>}
    </div>
  );
}

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onLogin = async (data: LoginForm) => {
    setApiError('');
    try {
      await login(data.email, data.password);
      navigate({ to: '/dashboard' });
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Erro ao fazer login');
    }
  };

  const onRegister = async (data: RegisterForm) => {
    setApiError('');
    try {
      await register(data.nome, data.email, data.password);
      navigate({ to: '/dashboard' });
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Erro ao criar conta');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 gradient-hero flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <circle cx="200" cy="200" r="150" fill="none" stroke="white" strokeWidth="0.5" />
            <circle cx="200" cy="200" r="100" fill="none" stroke="white" strokeWidth="0.5" />
            <circle cx="200" cy="200" r="50" fill="none" stroke="white" strokeWidth="0.5" />
            {[0, 60, 120, 180, 240, 300].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <line key={angle} x1="200" y1="200" x2={200 + 150 * Math.cos(rad)} y2={200 + 150 * Math.sin(rad)} stroke="white" strokeWidth="0.3" />
              );
            })}
          </svg>
        </div>
        <div className="relative z-10 text-center text-white">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <TrendingUp size={28} className="text-white" />
            </div>
            <span className="font-brand text-3xl font-bold">FinanceAI</span>
          </div>
          <h2 className="font-brand text-2xl font-bold mb-4">Inteligência que organiza sua vida financeira</h2>
          <p className="text-white/70 text-sm max-w-xs">
            Tome controle das suas finanças com o poder da IA. Dashboard, Metas, Orçamentos e Insights em um único lugar.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[['2.4k+', 'Usuários'], ['98%', 'Satisfação'], ['R$ 1M+', 'Economizados']].map(([v, l]) => (
              <div key={l} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="font-brand font-bold text-xl">{v}</p>
                <p className="text-white/60 text-xs mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--color-finance-bg-light)] dark:bg-[var(--color-finance-bg-dark)] relative">
        <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={16} />
          Voltar para Home
        </Link>
        <div className="w-full max-w-md mt-12 sm:mt-0">
          {/* Mobile brand */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-8">
            <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="font-brand font-bold text-xl text-[var(--color-finance-primary)] dark:text-white">
              Finance<span className="text-[var(--color-finance-accent)]">AI</span>
            </span>
          </div>

          {/* Tab toggle */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800/50 p-1 mb-8">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setApiError(''); }}
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
                  tab === t
                    ? 'bg-white dark:bg-[var(--color-finance-card-dark)] text-[var(--color-finance-primary)] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                {t === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                onSubmit={loginForm.handleSubmit(onLogin)}
                className="space-y-5"
              >
                <div>
                  <h1 className="font-brand text-2xl font-bold text-gray-900 dark:text-white">Bem-vindo de volta!</h1>
                  <p className="text-sm text-gray-500 mt-1">Acesse sua conta FinanceAI</p>
                </div>

                <InputField
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  error={loginForm.formState.errors.email?.message}
                  {...loginForm.register('email')}
                />
                <InputField
                  label="Senha"
                  type="password"
                  placeholder="••••••••"
                  error={loginForm.formState.errors.password?.message}
                  {...loginForm.register('password')}
                />

                {apiError && (
                  <div className="p-3 rounded-xl bg-[var(--color-finance-error)]/10 text-[var(--color-finance-error)] text-sm">
                    {apiError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginForm.formState.isSubmitting}
                  className="w-full py-3.5 rounded-xl gradient-hero text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loginForm.formState.isSubmitting && <Loader2 size={18} className="animate-spin" />}
                  Entrar
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={registerForm.handleSubmit(onRegister)}
                className="space-y-4"
              >
                <div>
                  <h1 className="font-brand text-2xl font-bold text-gray-900 dark:text-white">Criar sua conta</h1>
                  <p className="text-sm text-gray-500 mt-1">Comece a transformar suas finanças hoje</p>
                </div>

                <InputField
                  label="Nome completo"
                  placeholder="João Silva"
                  error={registerForm.formState.errors.nome?.message}
                  {...registerForm.register('nome')}
                />
                <InputField
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  error={registerForm.formState.errors.email?.message}
                  {...registerForm.register('email')}
                />
                <InputField
                  label="Senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  error={registerForm.formState.errors.password?.message}
                  {...registerForm.register('password')}
                />
                <InputField
                  label="Confirmar senha"
                  type="password"
                  placeholder="Repita a senha"
                  error={registerForm.formState.errors.confirmPassword?.message}
                  {...registerForm.register('confirmPassword')}
                />

                {apiError && (
                  <div className="p-3 rounded-xl bg-[var(--color-finance-error)]/10 text-[var(--color-finance-error)] text-sm">
                    {apiError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={registerForm.formState.isSubmitting}
                  className="w-full py-3.5 rounded-xl gradient-hero text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {registerForm.formState.isSubmitting && <Loader2 size={18} className="animate-spin" />}
                  Criar conta grátis
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
