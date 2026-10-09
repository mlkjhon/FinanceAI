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
  const [valorTexto, setValorTexto] = useState(d.valor != null ? String(d.valor).replace('.', ',') : '');
  const [estado, setEstado] = useState<'pronto' | 'executando' | 'feito' | 'erro'>('pronto');
  const [erro, setErro] = useState('');
  const valor = parseFloat(valorTexto.replace(/\./g, '').replace(',', '.')) || 0;
  const precisaValor = d.acao !== 'criar_investimento';
  const valorInvalido = precisaValor && (valor <= 0 || (d.acao === 'depositar_meta' && d.falta != null && valor > d.falta + 0.001));

  const executar = async () => {
    if (valorInvalido || estado === 'executando') return;
    setEstado('executando');
    setErro('');
    try {
      if (d.acao === 'criar_meta') {
        await goalsApi.create({ nome: d.titulo, valor_meta: valor, valor_atual: 0, data_alvo: d.dataObjetivo ?? undefined, descricao: 'Criada a partir dos Insights' });
      } else if (d.acao === 'depositar_meta') {
        await goalsApi.adicionarDinheiro(d.alvoId!, valor);
      } else if (d.acao === 'criar_orcamento') {
        await budgetsApi.create({ categoria_id: d.alvoId!, valor_limite: valor, mes: d.mes!, ano: d.ano! });
      } else if (d.acao === 'aportar') {
        await investimentosApi.addTransaction(d.alvoId!, { tipo: 'aporte', valor });
      } else {
        await investimentosApi.create({ nome: d.titulo, tipo: d.tipoInvestimento!, taxa_rendimento: d.taxa!, indexador: d.indexador! });
      }
      ['goals', 'budgets', 'investimentos', 'dashboard-summary', 'transactions'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setEstado('feito');
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
        {d.acao === 'depositar_meta' && d.falta != null && (
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
              <input
                id={`valor-${b.id}`}
                inputMode="decimal"
                value={valorTexto}
                disabled={estado === 'feito' || estado === 'executando'}
                onChange={(e) => setValorTexto(e.target.value.replace(/[^0-9.,]/g, ''))}
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
              <span className="pop-in inline-flex items-center gap-2 text-sm font-semibold text-gain" style={{ animationDelay: '0ms' }}>
                <Icon name="check" size={16} /> Feito
              </span>
              <Link to={cfg.destino} className="group inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent)]">
                <span className="link-line">Ver em {cfg.destinoNome}</span>
                <span className="arrow-nudge"><Icon name="arrow-right" size={14} /></span>
              </Link>
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
