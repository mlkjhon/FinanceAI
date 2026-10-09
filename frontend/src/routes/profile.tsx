import React, { Suspense } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Collapse } from '../components/collapse';
import { HoldToDelete } from '../components/hold-to-delete';
import { User, Mail, LogOut, Loader2 } from '../components/icons';
import { authApi, categoriesApi, type CreateCategory } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { FinanceCard, SkeletonCard, Badge } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/profile')({
  beforeLoad: () => {
    if (!localStorage.getItem('finance_token') && !sessionStorage.getItem('finance_token')) throw redirect({ to: '/auth' });
  },
  component: ProfilePage,
});

function ProfileContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCatForm, setShowCatForm] = React.useState(false);
  const [catForm, setCatForm] = React.useState<CreateCategory>({ nome: '', tipo: 'despesa' });

  const { data: cats, isLoading: catsLoading } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const createCatMut = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setShowCatForm(false); setCatForm({ nome: '', tipo: 'despesa' }); },
  });

  const deleteCatMut = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const handleLogout = () => {
    logout();
    navigate({ to: '/' });
  };

  return (
    <div className="stagger space-y-6 pb-16 max-w-2xl">
      <div>
        <h1 className="font-brand text-2xl font-bold text-gray-900">Perfil</h1>
        <p className="text-sm text-gray-500">Gerencie suas informações e categorias</p>
      </div>

      {/* User card */}
      <FinanceCard>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center text-white font-brand font-bold text-2xl">
            {user?.nome?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-brand font-bold text-xl text-gray-900">{user?.nome}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
              <Mail size={13} /> {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-finance-error)]/30 text-[var(--color-finance-error)] text-sm font-semibold hover:bg-[var(--color-finance-error)]/5 transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </FinanceCard>

      {/* Categories */}
      <FinanceCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-brand font-semibold text-gray-900">Categorias</h2>
          <button
            onClick={() => setShowCatForm(!showCatForm)}
            aria-expanded={showCatForm}
            className="text-sm text-[var(--color-accent)] font-medium hover:underline"
          >
            + Adicionar
          </button>
        </div>

        <Collapse open={showCatForm} className="flex flex-col sm:flex-row gap-2 mb-4 p-3 rounded-xl bg-[var(--color-surface)]">
            <input
              value={catForm.nome}
              onChange={(e) => setCatForm((p) => ({ ...p, nome: e.target.value }))}
              placeholder="Nome da categoria"
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[var(--color-accent)]"
            />
            <select
              value={catForm.tipo}
              onChange={(e) => setCatForm((p) => ({ ...p, tipo: e.target.value as 'receita' | 'despesa' }))}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
            >
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
            <button
              disabled={!catForm.nome || createCatMut.isPending}
              onClick={() => createCatMut.mutate(catForm)}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {createCatMut.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Salvar'}
            </button>
        </Collapse>

        {catsLoading ? (
          <SkeletonCard lines={3} className="border-0 shadow-none" />
        ) : (
          <div className="space-y-2">
            {cats?.length ? <AnimatePresence initial={false}>{cats.map((c) => (
              <motion.div
                key={c.id}
                layout="position"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden flex items-center justify-between py-2 border-b border-[var(--color-line)] last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Badge label={c.tipo === 'receita' ? 'Receita' : 'Despesa'} variant={c.tipo === 'receita' ? 'success' : 'error'} />
                  <span className="text-sm text-gray-700">{c.nome}</span>
                </div>
                <HoldToDelete compact label="Segure para remover" pending={deleteCatMut.isPending && deleteCatMut.variables === c.id} onConfirm={() => deleteCatMut.mutate(c.id)} />
              </motion.div>
            ))}</AnimatePresence> : (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma categoria criada</p>
            )}
          </div>
        )}
      </FinanceCard>
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="min-h-[100dvh] app-surface">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<SkeletonCard lines={4} />}>
          <ProfileContent />
        </Suspense>
      </div>
    </div>
  );
}
