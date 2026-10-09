import React, { useState } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Counter } from '../components/motion/counter';
import { spring, ease } from '../lib/motion-tokens';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema, type LoginForm, type RegisterForm } from '../lib/schemas/auth';
import { TrendingUp, Eye, EyeOff, Loader2, ArrowLeft } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

type AuthSearch = { tab?: 'login' | 'register'; email?: string };

export const Route = createFileRoute('/auth')({
  // A landing manda ?tab=register&email=... para o cadastro já começar preenchido.
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    tab: search.tab === 'register' ? 'register' : undefined,
    email: typeof search.email === 'string' ? search.email.slice(0, 254) : undefined,
  }),
  component: AuthPage,
});


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
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={isPassword ? (showPwd ? 'text' : 'password') : type}
          placeholder={placeholder}
          className={cn(
            'w-full px-4 py-3 rounded-xl border text-sm bg-white text-gray-900 placeholder-gray-400 outline-none transition-[color,background-color,border-color,box-shadow,opacity]',
            'border-gray-200 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-finance-primary)]/20',
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

function AuthPage() {
  const search = Route.useSearch();
  const [tab, setTab] = useState<'login' | 'register'>(search.tab ?? 'login');
  const reduce = useReducedMotion();
  const [apiError, setApiError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: search.email ?? '' },
  });

  const onLogin = async (data: LoginForm) => {
    setApiError('');
    try {
      await login(data.email, data.password, rememberMe);
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
    <div className="min-h-[100dvh] flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 gradient-hero flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-1/2 top-1/2 h-[75%] aspect-square -translate-x-1/2 -translate-y-1/2">
            {[100, 66, 33].map((size) => (
              <span
                key={size}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80"
                style={{ width: size + '%', height: size + '%' }}
              />
            ))}
            {[0, 60, 120].map((angle) => (
              <span
                key={angle}
                className="absolute left-0 top-1/2 h-px w-full bg-white/60"
                style={{ transform: 'rotate(' + angle + 'deg)' }}
              />
            ))}
          </div>
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
            {[['16', 'Indexadores'], ['13', 'Tipos de investimento'], ['6', 'Módulos']].map(([v, l]) => (
              <div key={l} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="font-brand font-bold text-xl"><Counter value={Number(v)} /></p>
                <p className="text-white/60 text-xs mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--color-finance-bg-light)] relative">
        <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} />
          Voltar para Home
        </Link>
        <div className="w-full max-w-md mt-12 sm:mt-0">
          {/* Mobile brand */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-8">
            <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="font-brand font-bold text-xl text-[var(--color-accent)]">
              Finance<span className="text-[var(--color-finance-accent)]">AI</span>
            </span>
          </div>

          {/* Tab toggle */}
          <div className="flex rounded-full bg-[var(--color-ink)]/[0.05] p-1 mb-8" role="group" aria-label="Entrar ou criar conta">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tab === t}
                onClick={() => { setTab(t); setApiError(''); }}
                className={cn(
                  'relative flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors duration-150',
                  tab === t ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]'
                )}
              >
                {tab === t && (
                  <motion.span
                    layoutId={reduce ? undefined : 'auth-tab'}
                    transition={spring.snappy}
                    className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm"
                  />
                )}
                {t === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, transform: 'translateX(-12px)' }}
                animate={{ opacity: 1, transform: 'translateX(0px)', transition: { duration: 0.18, ease: ease.out } }}
                exit={{ opacity: 0, transform: 'translateX(12px)', transition: { duration: 0.12, ease: ease.out } }}
                onSubmit={loginForm.handleSubmit(onLogin)}
                className="space-y-5"
              >
                <div>
                  <h1 className="font-brand text-2xl font-bold text-gray-900">Bem-vindo de volta</h1>
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

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)] transition-[color,background-color,border-color,box-shadow,opacity]"
                  />
                  <label htmlFor="rememberMe" className="text-sm text-gray-600 cursor-pointer">
                    Lembrar de mim
                  </label>
                </div>

                {apiError && (
                  <div key={apiError} role="alert" className="shake p-3 rounded-xl bg-[var(--color-finance-error)]/10 text-loss text-sm">
                    {apiError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginForm.formState.isSubmitting}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loginForm.formState.isSubmitting && <Loader2 size={18} className="animate-spin" />}
                  Entrar
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, transform: 'translateX(12px)' }}
                animate={{ opacity: 1, transform: 'translateX(0px)', transition: { duration: 0.18, ease: ease.out } }}
                exit={{ opacity: 0, transform: 'translateX(-12px)', transition: { duration: 0.12, ease: ease.out } }}
                onSubmit={registerForm.handleSubmit(onRegister)}
                className="space-y-4"
              >
                <div>
                  <h1 className="font-brand text-2xl font-bold text-gray-900">Criar sua conta</h1>
                  <p className="text-sm text-gray-500 mt-1">Leva menos de um minuto</p>
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
                  <div key={apiError} role="alert" className="shake p-3 rounded-xl bg-[var(--color-finance-error)]/10 text-loss text-sm">
                    {apiError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={registerForm.formState.isSubmitting}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-70"
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
