import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Icon, type IconName } from '../icons';
import { cn } from '../../lib/utils';
import { ease } from '../../lib/motion-tokens';
import { budgetsApi, goalsApi, investimentosApi } from '../../lib/api';
import { fmt, diaCurto } from '../../lib/insights/format';
import { nomeIndexador } from '../../lib/investimentos';
import type { BlocoDe } from '../../lib/insights/types';
import { StreamText } from './primitives';
import { marcarAcaoFeita } from '../../lib/insights/client';
import { MoneyInput } from '../money-input';
import { deNumero, paraNumero } from '../../lib/dinheiro';

type Acao = BlocoDe<'action'>['data'];

const CONFIG: Record<Acao['acao'], { rotulo: string; icone: IconName; destino: '/goals' | '/budgets' | '/investimentos'; destinoNome: string }> = {
  criar_meta: { rotulo: 'Nova meta', icone: 'target', destino: '/goals', destinoNome: 'Metas' },
  depositar_meta: { rotulo: 'Depositar na meta', icone: 'piggy-bank', destino: '/goals', destinoNome: 'Metas' },
  criar_orcamento: { rotulo: 'Novo orçamento', icone: 'wallet', destino: '/budgets', destinoNome: 'Orçamentos' },
  aportar: { rotulo: 'Aporte', icone: 'trend-up', destino: '/investimentos', destinoNome: 'Investimentos' },
  criar_investimento: { rotulo: 'Novo investimento', icone: 'coins', destino: '/investimentos', destinoNome: 'Investimentos' },
};

function textoBotao(d: Acao, valor: number) {
  switch (d.acao) {
    case 'criar_meta': return 'Criar meta';
    case 'depositar_meta': return `Depositar ${fmt(valor)}`;
    case 'criar_orcamento': return 'Criar orçamento';
    case 'aportar': return `Aportar ${fmt(valor)}`;
    case 'criar_investimento': return 'Cadastrar investimento';
  }
}

function textoFeito(d: Acao) {
  switch (d.acao) {
    case 'criar_meta': return 'Meta criada';
    case 'depositar_meta': return 'Depósito feito';
    case 'criar_orcamento': return 'Orçamento criado';
    case 'aportar': return 'Aporte feito';
    case 'criar_investimento': return 'Investimento cadastrado';
  }
}

// "hoje às 14:32", "ontem às 09:10" ou "9 de out às 14:32"
function quando(iso: string) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dia = (x: Date) => x.toDateString();
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  if (dia(dt) === dia(new Date())) return `Hoje às ${hora}`;
  if (dia(dt) === dia(ontem)) return `Ontem às ${hora}`;
  return `${dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')} às ${hora}`;
}

// Leva direto ao que foi criado/alterado (meta ou investimento); senão, à lista
function LinkDestino({ d, alvoId, nome, destino }: { d: Acao; alvoId: string | null; nome: string; destino: '/goals' | '/budgets' | '/investimentos' }) {
  const conteudo = (texto: string) => (
    <>
      <span className="link-line">{texto}</span>
      <span className="arrow-nudge"><Icon name="arrow-right" size={14} /></span>
    </>
  );
  const classe = 'group shrink-0 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent)]';
  if (alvoId && (d.acao === 'criar_meta' || d.acao === 'depositar_meta')) {
    return <Link to="/goals/$id" params={{ id: alvoId }} className={classe}>{conteudo('Ver meta')}</Link>;
  }
  if (alvoId && (d.acao === 'aportar' || d.acao === 'criar_investimento')) {
    return <Link to="/investimentos/$id" params={{ id: alvoId }} className={classe}>{conteudo('Ver investimento')}</Link>;
  }
  return <Link to={destino} className={classe}>{conteudo(`Ver em ${nome}`)}</Link>;
}

/*
 * Bloco de ação: a proposta da IA (com números calculados dos dados reais),
 * o valor editável e um botão que faz a ação de verdade no app.
 * Motion: o botão vira o estado "feito" com crossfade + blur curto, e o check
 * entra com um leve quique (raro: é uma conquista).
 */
export function ActionBlock({ b }: { b: BlocoDe<'action'> }) {
  const d = b.data;
  const cfg = CONFIG[d.acao];
  const qc = useQueryClient();
  const [feito, setFeito] = useState(b.feito ?? null);
  const [valorTexto, setValorTexto] = useState(() => deNumero(b.feito?.valor ?? d.valor));
  const [estado, setEstado] = useState<'pronto' | 'executando' | 'feito' | 'erro'>(b.feito ? 'feito' : 'pronto');
  const [erro, setErro] = useState('');
  const valor = paraNumero(valorTexto) ?? 0;
  const precisaValor = d.acao !== 'criar_investimento';
  const valorInvalido = precisaValor && (valor <= 0 || (d.acao === 'depositar_meta' && d.falta != null && valor > d.falta + 0.001));

  const executar = async () => {
    if (valorInvalido || estado === 'executando') return;
    setEstado('executando');
    setErro('');
    try {
      // o que foi criado/alterado, para o link "ver" levar direto ao detalhe
      let alvo: string | null = d.alvoId ?? null;
      if (d.acao === 'criar_meta') {
        const meta = await goalsApi.create({ nome: d.titulo, valor_meta: valor, valor_atual: 0, data_alvo: d.dataObjetivo ?? undefined, descricao: 'Criada a partir dos Insights' }, 'insights');
        alvo = meta?.id_meta != null ? String(meta.id_meta) : null;
      } else if (d.acao === 'depositar_meta') {
        await goalsApi.adicionarDinheiro(d.alvoId!, valor, 'insights');
      } else if (d.acao === 'criar_orcamento') {
        await budgetsApi.create({ categoria_id: d.alvoId!, valor_limite: valor, mes: d.mes!, ano: d.ano! });
      } else if (d.acao === 'aportar') {
        await investimentosApi.addTransaction(d.alvoId!, { tipo: 'aporte', valor });
      } else {
        const r = await investimentosApi.create({ nome: d.titulo, tipo: d.tipoInvestimento!, taxa_rendimento: d.taxa!, indexador: d.indexador! });
        alvo = r?.investimento?.id_investimento != null ? String(r.investimento.id_investimento) : null;
      }
      ['goals', 'budgets', 'investimentos', 'dashboard-summary', 'transactions'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      const registro = { em: new Date().toISOString(), valor: precisaValor ? valor : null, alvoId: alvo };
      setFeito(registro);
      setEstado('feito');
      // guarda na análise salva (se falhar, o bloco segue como feito nesta visita)
      marcarAcaoFeita(b, registro.valor, alvo).then((doServidor) => doServidor && setFeito(doServidor));
    } catch (e) {
      setErro((e as Error).message || 'Não deu para concluir agora.');
      setEstado('erro');
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <span className="self-start inline-flex items-center gap-1.5 rounded-md bg-gain-soft px-2 py-0.5 text-xs font-medium text-gain">
        <Icon name={cfg.icone} size={12} />
        {cfg.rotulo}
      </span>

      <StreamText text={d.texto} className="text-[15px] leading-relaxed text-[var(--color-ink-soft)]" />

      {/* A proposta, explícita: o que exatamente vai acontecer */}
      <dl className="rounded-xl bg-[var(--color-surface)] px-4 py-3 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--color-ink-muted)]">
            {d.acao === 'criar_orcamento' ? 'Categoria' : d.acao === 'criar_meta' || d.acao === 'depositar_meta' ? 'Meta' : 'Investimento'}
          </dt>
          <dd className="font-medium text-[var(--color-ink)] text-right truncate">{d.titulo}</dd>
        </div>
        {d.acao === 'criar_investimento' && (
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-ink-muted)]">Rendimento</dt>
            <dd className="font-medium text-[var(--color-ink)]" data-num>
              {d.tipoInvestimento} · {d.indexador === 'PREFIXADO' ? `${d.taxa}% a.a.` : `${d.taxa}% do ${nomeIndexador(d.indexador!)}`}
            </dd>
          </div>
        )}
        {d.dataObjetivo && (
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-ink-muted)]">Prazo</dt>
            <dd className="font-medium text-[var(--color-ink)]" data-num>{diaCurto(d.dataObjetivo)} {d.dataObjetivo.slice(0, 4)}</dd>
          </div>
        )}
        {d.acao === 'depositar_meta' && d.falta != null && estado !== 'feito' && (
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-ink-muted)]">Falta para a meta</dt>
            <dd className="font-medium text-[var(--color-ink)]" data-num>{fmt(d.falta)}</dd>
          </div>
        )}
        {precisaValor && (
          <div className="flex items-center justify-between gap-3">
            <dt>
              <label htmlFor={`valor-${b.id}`} className="text-[var(--color-ink-muted)]">
                {d.acao === 'criar_meta' ? 'Valor da meta' : d.acao === 'criar_orcamento' ? 'Limite por mês' : 'Valor'}
              </label>
            </dt>
            <dd className="flex items-center gap-1 font-semibold text-[var(--color-ink)]">
              R$
              <MoneyInput
                id={`valor-${b.id}`}
                value={valorTexto}
                disabled={estado === 'feito' || estado === 'executando'}
                onValueChange={setValorTexto}
                aria-invalid={valorInvalido}
                className="field w-24 rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] px-2 py-1 text-right tabular-nums disabled:opacity-70"
              />
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-auto grid">
        <AnimatePresence mode="popLayout" initial={false}>
          {estado === 'feito' ? (
            <motion.div
              key="feito"
              className="[grid-area:1/1] flex items-center justify-between gap-3"
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)', transition: { duration: 0.25, ease: ease.out } }}
            >
              <span className="min-w-0">
                <span className="pop-in inline-flex items-center gap-2 text-sm font-semibold text-gain" style={{ animationDelay: '0ms' }}>
                  <Icon name="check" size={16} /> {textoFeito(d)}
                </span>
                {feito && (
                  <span className="block text-xs text-[var(--color-ink-muted)]" data-num>
                    {quando(feito.em)}{feito.valor ? ` · ${fmt(feito.valor)}` : ''}
                  </span>
                )}
              </span>
              <LinkDestino d={d} alvoId={feito?.alvoId ?? d.alvoId ?? null} nome={cfg.destinoNome} destino={cfg.destino} />
            </motion.div>
          ) : (
            <motion.button
              key="botao"
              type="button"
              onClick={executar}
              disabled={valorInvalido || estado === 'executando'}
              exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.15 } }}
              className="[grid-area:1/1] btn-primary w-full py-2.5 text-sm disabled:opacity-50"
            >
              {estado === 'executando' ? <span className="spinner" aria-hidden /> : <Icon name={cfg.icone} size={15} />}
              {estado === 'executando' ? 'Fazendo' : textoBotao(d, valor)}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      {estado === 'erro' && <p role="alert" className={cn('text-xs text-loss')}>{erro}</p>}
    </div>
  );
}
