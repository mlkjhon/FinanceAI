import React, { Suspense } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Collapse } from '../components/collapse';
import { HoldToDelete } from '../components/hold-to-delete';
import { Mail, LogOut, Loader2, Eye, EyeOff, Edit2, Check, X, Plus } from '../components/icons';
import { categoriesApi, perfilApi, transactionsApi, removeUserData, getToken, type Category, type CreateCategory } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { SkeletonCard, Badge } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { Segmented } from '../components/segmented';
import { salvarPreferencia as salvarTema, usePreferenciaTema } from '../lib/theme';
import { salvarPreferencia, usePreferencia } from '../lib/preferencias';
import { campoClasse } from '../lib/classes';
import { cn, formatDate } from '../lib/utils';

export const Route = createFileRoute('/profile')({
  beforeLoad: () => {
    if (!getToken()) throw redirect({ to: '/auth' });
  },
  component: ProfilePage,
});

const SECOES = [
  { id: 'conta', titulo: 'Conta' },
  { id: 'seguranca', titulo: 'Segurança' },
  { id: 'aparencia', titulo: 'Aparência' },
  { id: 'privacidade', titulo: 'Privacidade' },
  { id: 'categorias', titulo: 'Categorias' },
  { id: 'dados', titulo: 'Seus dados' },
  { id: 'excluir', titulo: 'Excluir conta' },
] as const;

const erroDe = (e: unknown) => (e as Error)?.message || 'Não deu para salvar agora. Tente de novo.';

// Bloco de configuração: título, explicação curta e o conteúdo
function Secao({ id, titulo, descricao, children, perigo }: { id: string; titulo: string; descricao?: string; children: React.ReactNode; perigo?: boolean }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={cn('finance-card p-5 sm:p-6 scroll-mt-24', perigo && 'border-[var(--color-finance-error)]/30')}>
      <h2 id={`${id}-titulo`} className={cn('font-brand font-semibold', perigo ? 'text-loss' : 'text-[var(--color-ink)]')}>{titulo}</h2>
      {descricao && <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{descricao}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

// Interruptor liga/desliga (o polegar desliza com transform)
function Interruptor({ id, titulo, descricao, ativo, onChange }: { id: string; titulo: string; descricao: string; ativo: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-[var(--color-ink)] cursor-pointer">{titulo}</label>
        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 max-w-[46ch]">{descricao}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={ativo}
        onClick={() => onChange(!ativo)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          ativo ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-line)]'
        )}
      >
        <span
          aria-hidden
          className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
          style={{ transform: ativo ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

function Mensagem({ ok, erro }: { ok?: string | false; erro?: string | false }) {
  if (erro) return <p role="alert" className="text-sm text-loss">{erro}</p>;
  if (ok) return <p role="status" className="pop-in inline-flex items-center gap-1.5 text-sm font-medium text-gain"><Check size={14} /> {ok}</p>;
  return null;
}

function Conta() {
  const { user, atualizarUsuario } = useAuth();
  const [nome, setNome] = React.useState(user?.nome ?? '');
  const [email, setEmail] = React.useState(user?.email ?? '');
  const salvar = useMutation({
    mutationFn: () => perfilApi.update({ nome: nome.trim(), email: email.trim() }),
    onSuccess: (u) => atualizarUsuario({ id: String(u.id ?? user?.id), nome: u.nome, email: u.email }),
  });
  const mudou = nome.trim() !== (user?.nome ?? '') || email.trim().toLowerCase() !== (user?.email ?? '').toLowerCase();

  return (
    <Secao id="conta" titulo="Conta" descricao="Seu nome aparece no app; o e-mail é usado para entrar.">
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); if (mudou) salvar.mutate(); }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="conta-nome" className="text-sm font-medium text-[var(--color-ink-soft)]">Nome</label>
            <input id="conta-nome" value={nome} onChange={(e) => { setNome(e.target.value); salvar.reset(); }} autoComplete="name" className={campoClasse} />
          </div>
          <div className="space-y-2">
            <label htmlFor="conta-email" className="text-sm font-medium text-[var(--color-ink-soft)]">E-mail</label>
            <input id="conta-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); salvar.reset(); }} autoComplete="email" className={campoClasse} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={!mudou || salvar.isPending} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
            {salvar.isPending && <Loader2 size={14} className="animate-spin" />}
            Salvar alterações
          </button>
          <Mensagem ok={salvar.isSuccess && 'Dados atualizados'} erro={salvar.isError && erroDe(salvar.error)} />
        </div>
      </form>
    </Secao>
  );
}

function CampoSenha({ id, label, value, onChange, autoComplete }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [ver, setVer] = React.useState(false);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-ink-soft)]">{label}</label>
      <div className="relative">
        <input id={id} type={ver ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className={cn(campoClasse, 'pr-11')} />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? 'Esconder senha' : 'Mostrar senha'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          {ver ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function Seguranca() {
  const [atual, setAtual] = React.useState('');
  const [nova, setNova] = React.useState('');
  const [confirma, setConfirma] = React.useState('');
  const trocar = useMutation({
    mutationFn: () => perfilApi.trocarSenha(atual, nova),
    onSuccess: () => { setAtual(''); setNova(''); setConfirma(''); },
  });
  const curta = nova.length > 0 && nova.length < 6;
  const diferente = confirma.length > 0 && confirma !== nova;
  const pronto = atual && nova.length >= 6 && confirma === nova;

  return (
    <Secao id="seguranca" titulo="Segurança" descricao="Troque sua senha. Ela precisa ter pelo menos 6 caracteres.">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (pronto) trocar.mutate(); }}>
        <input type="text" autoComplete="username" className="hidden" readOnly aria-hidden tabIndex={-1} />
        <CampoSenha id="senha-atual" label="Senha atual" value={atual} onChange={(v) => { setAtual(v); trocar.reset(); }} autoComplete="current-password" />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSenha id="senha-nova" label="Nova senha" value={nova} onChange={(v) => { setNova(v); trocar.reset(); }} autoComplete="new-password" />
          <CampoSenha id="senha-confirma" label="Repita a nova senha" value={confirma} onChange={(v) => { setConfirma(v); trocar.reset(); }} autoComplete="new-password" />
        </div>
        {(curta || diferente) && (
          <p className="text-xs text-loss">{curta ? 'A nova senha precisa ter pelo menos 6 caracteres.' : 'As senhas não são iguais.'}</p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={!pronto || trocar.isPending} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
            {trocar.isPending && <Loader2 size={14} className="animate-spin" />}
            Trocar senha
          </button>
          <Mensagem ok={trocar.isSuccess && 'Senha trocada'} erro={trocar.isError && erroDe(trocar.error)} />
        </div>
      </form>
    </Secao>
  );
}

function Aparencia() {
  const preferencia = usePreferenciaTema();
  const reduzir = usePreferencia('reduzirAnimacoes');
  return (
    <Secao id="aparencia" titulo="Aparência">
      <div className="divide-y divide-[var(--color-line)]">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-ink)]">Tema</p>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">“Sistema” acompanha o tema do seu computador ou celular.</p>
          </div>
          <Segmented
            id="tema"
            label="Tema"
            value={preferencia}
            onChange={(p) => {
              // transição curta de cor só durante a troca
              document.documentElement.classList.add('trocando-tema');
              salvarTema(p);
              setTimeout(() => document.documentElement.classList.remove('trocando-tema'), 300);
            }}
            options={[
              { value: 'sistema', label: 'Sistema' },
              { value: 'claro', label: 'Claro' },
              { value: 'escuro', label: 'Escuro' },
            ]}
          />
        </div>
        <div className="pt-4">
          <Interruptor
            id="pref-animacoes"
            titulo="Reduzir animações"
            descricao="Desliga os movimentos de entrada, transições e gráficos animados neste navegador."
            ativo={reduzir}
            onChange={(v) => salvarPreferencia('reduzirAnimacoes', v)}
          />
        </div>
      </div>
    </Secao>
  );
}

function Privacidade() {
  const ocultar = usePreferencia('ocultarValores');
  return (
    <Secao id="privacidade" titulo="Privacidade">
      <Interruptor
        id="pref-ocultar"
        titulo="Ocultar valores"
        descricao="Troca os valores em dinheiro por R$ •••• em todo o app. Bom para abrir em público. Vale só neste navegador."
        ativo={ocultar}
        onChange={(v) => salvarPreferencia('ocultarValores', v)}
      />
    </Secao>
  );
}

const VISIVEIS = 3;

function LinhaCategoria({ c }: { c: Category }) {
  const qc = useQueryClient();
  const [editando, setEditando] = React.useState(false);
  const [nome, setNome] = React.useState(c.nome);
  const atualizar = useMutation({
    mutationFn: () => categoriesApi.update(c.id, { nome: nome.trim(), tipo: c.tipo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setEditando(false); },
  });
  const excluir = useMutation({
    mutationFn: () => categoriesApi.delete(c.id),
    onSuccess: () => {
      ['categories', 'transactions', 'budgets', 'dashboard-summary'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });

  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between gap-3 min-h-9">
        {editando ? (
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); if (nome.trim().length >= 2) atualizar.mutate(); }}
          >
            <label htmlFor={`cat-${c.id}`} className="sr-only">Nome da categoria</label>
            <input
              id={`cat-${c.id}`}
              autoFocus
              value={nome}
              maxLength={60}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setEditando(false); setNome(c.nome); } }}
              className={cn(campoClasse, 'py-2')}
            />
            <button type="submit" disabled={atualizar.isPending || nome.trim().length < 2} aria-label="Salvar nome" className="pressable p-2 rounded-lg text-gain hover:bg-gain-soft disabled:opacity-50">
              {atualizar.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
            <button type="button" onClick={() => { setEditando(false); setNome(c.nome); }} aria-label="Cancelar" className="pressable p-2 rounded-lg text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]">
              <X size={16} />
            </button>
          </form>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <Badge label={c.tipo === 'receita' ? 'Receita' : 'Despesa'} variant={c.tipo === 'receita' ? 'success' : 'error'} />
              <span className="truncate text-sm text-[var(--color-ink)]">{c.nome}</span>
              {!c.propria && <span className="shrink-0 text-xs text-[var(--color-ink-muted)]">Padrão</span>}
            </div>
            {c.propria && (
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => setEditando(true)} aria-label={`Renomear ${c.nome}`} className="pressable p-2 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)]">
                  <Edit2 size={15} />
                </button>
                <HoldToDelete compact label="Segure para remover" pending={excluir.isPending} onConfirm={() => excluir.mutate()} />
              </div>
            )}
          </>
        )}
      </div>
      {(atualizar.isError || excluir.isError) && <p role="alert" className="mt-1 text-xs text-loss">{erroDe(atualizar.error || excluir.error)}</p>}
    </div>
  );
}

function Categorias() {
  const qc = useQueryClient();
  const [mostrarTodas, setMostrarTodas] = React.useState(false);
  const [criando, setCriando] = React.useState(false);
  const [form, setForm] = React.useState<CreateCategory>({ nome: '', tipo: 'despesa' });
  const { data: cats, isLoading } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const criar = useMutation({
    mutationFn: () => categoriesApi.create({ ...form, nome: form.nome.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setCriando(false);
      setForm({ nome: '', tipo: 'despesa' });
    },
  });

  // As suas primeiro (são as que dá para mexer), depois as padrão
  const lista = [...(cats ?? [])].sort((a, b) => Number(!!b.propria) - Number(!!a.propria) || a.nome.localeCompare(b.nome, 'pt-BR'));
  const visiveis = mostrarTodas ? lista : lista.slice(0, VISIVEIS);
  const escondidas = lista.length - VISIVEIS;

  return (
    <Secao id="categorias" titulo="Categorias" descricao="As categorias que você cria são só suas. As padrão valem para todo mundo e não podem ser alteradas.">
      <div className="flex justify-end -mt-2 mb-2">
        <button
          type="button"
          onClick={() => setCriando((v) => !v)}
          aria-expanded={criando}
          className="pressable inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-[var(--color-accent)] hover:bg-gain-soft"
        >
          <Plus size={14} /> Nova categoria
        </button>
      </div>

      <Collapse open={criando}>
        <form
          className="mb-4 flex flex-col gap-2 rounded-xl bg-[var(--color-surface)] p-3 sm:flex-row"
          onSubmit={(e) => { e.preventDefault(); if (form.nome.trim().length >= 2) criar.mutate(); }}
        >
          <label htmlFor="cat-nova" className="sr-only">Nome da categoria</label>
          <input
            id="cat-nova"
            value={form.nome}
            maxLength={60}
            onChange={(e) => { setForm((p) => ({ ...p, nome: e.target.value })); criar.reset(); }}
            placeholder="Nome da categoria"
            className={cn(campoClasse, 'py-2.5 flex-1')}
          />
          <label htmlFor="cat-nova-tipo" className="sr-only">Tipo</label>
          <select
            id="cat-nova-tipo"
            value={form.tipo}
            onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as 'receita' | 'despesa' }))}
            className={cn(campoClasse, 'py-2.5 sm:w-36')}
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
          <button type="submit" disabled={form.nome.trim().length < 2 || criar.isPending} className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50">
            {criar.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Criar'}
          </button>
        </form>
        {criar.isError && <p role="alert" className="-mt-2 mb-3 text-xs text-loss">{erroDe(criar.error)}</p>}
      </Collapse>

      {isLoading ? (
        <SkeletonCard lines={3} className="border-0 shadow-none" />
      ) : lista.length ? (
        <>
          <div className="divide-y divide-[var(--color-line)]">
            <AnimatePresence initial={false}>
              {visiveis.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                >
                  <LinhaCategoria c={c} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {escondidas > 0 && (
            <button
              type="button"
              onClick={() => setMostrarTodas((v) => !v)}
              aria-expanded={mostrarTodas}
              className="pressable mt-3 w-full rounded-xl border border-[var(--color-line)] py-2.5 text-sm font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-surface)]"
            >
              {mostrarTodas ? 'Mostrar menos' : `Mostrar mais (${escondidas})`}
            </button>
          )}
        </>
      ) : (
        <p className="text-sm text-[var(--color-ink-muted)] text-center py-4">Nenhuma categoria ainda</p>
      )}
    </Secao>
  );
}

// CSV no padrão brasileiro (ponto e vírgula, vírgula decimal) para abrir direto no Excel
function baixarCsv(linhas: string[][], nome: string) {
  const escapar = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const texto = '﻿' + linhas.map((l) => l.map(escapar).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Dados() {
  const exportar = useMutation({
    mutationFn: async () => {
      // a lista do app pagina no navegador: pede tudo de uma vez
      const { data: txs } = await transactionsApi.list({ limit: '1000000' });
      const linhas = [
        ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)'],
        ...txs.map((t) => [
          formatDate(String(t.data || '')),
          t.descricao,
          t.categoria_nome || 'Sem categoria',
          t.tipo === 'receita' ? 'Receita' : 'Despesa',
          (t.tipo === 'receita' ? t.valor : -t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        ]),
      ];
      baixarCsv(linhas, `financeai-transacoes-${new Date().toISOString().slice(0, 10)}.csv`);
      return txs.length;
    },
  });

  return (
    <Secao id="dados" titulo="Seus dados" descricao="Baixe todas as suas transações numa planilha (abre no Excel e no Google Planilhas).">
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => exportar.mutate()} disabled={exportar.isPending} className="pressable inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface)] disabled:opacity-60">
          {exportar.isPending && <Loader2 size={14} className="animate-spin" />}
          Exportar transações (CSV)
        </button>
        <Mensagem
          ok={exportar.isSuccess && (exportar.data ? `${exportar.data} transações exportadas` : 'Nenhuma transação para exportar')}
          erro={exportar.isError && erroDe(exportar.error)}
        />
      </div>
    </Secao>
  );
}

function ExcluirConta() {
  const [aberto, setAberto] = React.useState(false);
  const [senha, setSenha] = React.useState('');
  const excluir = useMutation({
    mutationFn: () => perfilApi.excluirConta(senha),
    onSuccess: () => {
      removeUserData();
      window.location.href = '/';
    },
  });

  return (
    <Secao id="excluir" titulo="Excluir conta" descricao="Apaga sua conta e tudo o que está nela: transações, metas, orçamentos, investimentos, categorias e análises. Não dá para desfazer." perigo>
      {!aberto ? (
        <button type="button" onClick={() => setAberto(true)} className="pressable rounded-full border border-[var(--color-finance-error)]/40 px-5 py-2.5 text-sm font-semibold text-loss hover:bg-loss-soft">
          Quero excluir minha conta
        </button>
      ) : (
        <div className="space-y-4 max-w-sm">
          <CampoSenha id="excluir-senha" label="Digite sua senha para confirmar" value={senha} onChange={(v) => { setSenha(v); excluir.reset(); }} autoComplete="current-password" />
          <div className="flex flex-wrap items-center gap-3">
            {senha ? (
              <HoldToDelete label="Segure para excluir a conta" pending={excluir.isPending} onConfirm={() => excluir.mutate()} />
            ) : (
              <span className="text-xs text-[var(--color-ink-muted)]">Informe a senha para liberar o botão.</span>
            )}
            <button type="button" onClick={() => { setAberto(false); setSenha(''); excluir.reset(); }} className="text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
              Cancelar
            </button>
          </div>
          <Mensagem erro={excluir.isError && erroDe(excluir.error)} />
        </div>
      )}
    </Secao>
  );
}

function ProfileContent() {
  const { user, logout } = useAuth();

  return (
    <div className="stagger pb-16">
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="size-14 rounded-2xl gradient-hero grid place-items-center text-white font-brand font-bold text-2xl" aria-hidden>
          {user?.nome?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-brand text-2xl font-bold tracking-tight text-[var(--color-ink)] truncate">{user?.nome}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] flex items-center gap-1.5 mt-0.5 truncate">
            <Mail size={13} /> {user?.email}
          </p>
        </div>
        <button
          onClick={logout}
          className="pressable flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-finance-error)]/30 text-loss text-sm font-semibold hover:bg-loss-soft"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
        {/* Índice das configurações (no celular vira uma faixa rolável) */}
        <nav aria-label="Configurações" className="lg:sticky lg:top-24 lg:self-start -mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto">
          <ul className="flex gap-1 lg:flex-col">
            {SECOES.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={cn(
                    'block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 hover:bg-[var(--color-surface)]',
                    s.id === 'excluir' ? 'text-loss' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                  )}
                >
                  {s.titulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6 max-w-2xl min-w-0">
          <Conta />
          <Seguranca />
          <Aparencia />
          <Privacidade />
          <Categorias />
          <Dados />
          <ExcluirConta />
        </div>
      </div>
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="min-h-[100dvh] app-surface">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<SkeletonCard lines={4} />}>
          <ProfileContent />
        </Suspense>
      </div>
    </div>
  );
}
