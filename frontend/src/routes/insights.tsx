import { useCallback, useEffect, useRef, useState } from 'react';
import { createFileRoute, redirect, Link } from '@tanstack/react-router';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import { Navbar } from '../components/Navbar';
import { Segmented } from '../components/segmented';
import { Collapse } from '../components/collapse';
import { Icon } from '../components/icons';
import { BlocoFrame, BlocoSkeleton } from '../components/insights/frame';
import { CommandBar } from '../components/insights/command-bar';
import { AiStatus } from '../components/insights/primitives';
import { analisar, buscarFixadosServidor, executarComando, lerAnaliseSalva, lerFixados, salvarAnaliseAtual, salvarFixados, salvarFixadosServidor } from '../lib/insights/client';
import type { Bloco, EstadoIA, Operacao, Periodo } from '../lib/insights/types';

export const Route = createFileRoute('/insights')({
  beforeLoad: () => {
    if (!localStorage.getItem('finance_token') && !sessionStorage.getItem('finance_token')) throw redirect({ to: '/auth' });
  },
  component: InsightsPage,
});

type ChavePeriodo = 'mes' | '3m' | 'ano' | 'custom';
const hojeISO = () => new Date().toISOString().slice(0, 10);

// O story fica sempre no topo; o resto segue a ordem em que a IA mandou (relevância)
const comStoryNoTopo = (lista: Bloco[]) => [...lista.filter((b) => b.type === 'story'), ...lista.filter((b) => b.type !== 'story')];

function InsightsPage() {
  const [blocos, setBlocos] = useState<Bloco[]>(() => lerFixados());
  const [estado, setEstado] = useState<EstadoIA>('ocioso');
  const [erro, setErro] = useState<string | null>(null);
  const [vazio, setVazio] = useState(false);
  const [chave, setChave] = useState<ChavePeriodo>('mes');
  const [custom, setCustom] = useState({ inicio: hojeISO().slice(0, 8) + '01', fim: hojeISO() });
  const [novos, setNovos] = useState<Set<string>>(new Set());
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());
  const [resposta, setResposta] = useState<{ texto: string; id: number } | null>(null);
  const [erroComando, setErroComando] = useState<string | null>(null);
  // Análise salva: quando foi gerada, se ainda está carregando e se este período não tem nenhuma
  const [geradoEm, setGeradoEm] = useState<string | null>(null);
  const [carregandoSalva, setCarregandoSalva] = useState(true);
  const [semAnalise, setSemAnalise] = useState(false);
  // Marca mudanças feitas pelo usuário (comando, remover, fixar) para salvar no servidor
  const sujo = useRef(false);

  const abort = useRef<AbortController | null>(null);
  const fila = useRef<Bloco[]>([]);
  const streamAcabou = useRef(true);
  const blocosRef = useRef(blocos);
  blocosRef.current = blocos;

  const periodo: Periodo = chave === 'custom' ? custom : chave;

  const [fixadosProntos, setFixadosProntos] = useState(false);

  // Fixados do servidor chegam antes da primeira análise (com limite de 2,5s)
  useEffect(() => {
    let vivo = true;
    const limite = setTimeout(() => vivo && setFixadosProntos(true), 2500);
    buscarFixadosServidor().then((doServidor) => {
      if (!vivo) return;
      if (doServidor && doServidor.length) setBlocos(comStoryNoTopo(doServidor));
      clearTimeout(limite);
      setFixadosProntos(true);
    });
    return () => { vivo = false; clearTimeout(limite); };
  }, []);

  // Salva local na hora e no servidor quando o conjunto de fixados muda
  const assinaturaFixados = blocos.filter((b) => b.fixado).map((b) => b.id + JSON.stringify(b.pedido)).join('|');
  useEffect(() => salvarFixados(blocos), [blocos]);
  useEffect(() => {
    if (!fixadosProntos) return;
    const t = setTimeout(() => salvarFixadosServidor(blocosRef.current), 800);
    return () => clearTimeout(t);
  }, [assinaturaFixados, fixadosProntos]);

  /*
   * Os blocos que chegam vão para uma fila e entram um a cada 110ms. Assim a
   * cascata acontece mesmo quando a rede entrega vários de uma vez.
   */
  useEffect(() => {
    const t = setInterval(() => {
      const b = fila.current.shift();
      if (b) {
        setBlocos((atual) => {
          const i = atual.findIndex((x) => x.id === b.id);
          if (i >= 0) return atual.map((x) => (x.id === b.id ? b : x)); // fixado recalculado
          return comStoryNoTopo([...atual, b]);
        });
      } else if (streamAcabou.current) {
        setEstado((e) => (e === 'gerando' || e === 'analisando' ? 'ocioso' : e));
      }
    }, 110);
    return () => clearInterval(t);
  }, []);

  const gerar = useCallback(async (p: Periodo) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    const fixados = blocosRef.current.filter((b) => b.fixado);
    fila.current = [];
    streamAcabou.current = false;
    setErro(null);
    setVazio(false);
    setSemAnalise(false);
    setEstado('analisando');
    setBlocos(fixados); // os não fixados saem com animação; os fixados ficam e são recalculados

    try {
      await analisar(
        p,
        fixados,
        (e) => {
          if (e.evento === 'estado') setEstado(e.estado);
          else if (e.evento === 'bloco') fila.current.push(e.bloco);
          else if (e.evento === 'vazio') setVazio(true);
          else if (e.evento === 'erro') setErro(e.mensagem);
        },
        ctrl.signal
      );
      if (abort.current === ctrl) setGeradoEm(new Date().toISOString());
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setErro((e as Error).message || 'Não foi possível falar com a IA.');
    } finally {
      if (abort.current === ctrl) streamAcabou.current = true;
    }
  }, []);

  /*
   * Ao abrir (ou trocar de período) a página mostra a ANÁLISE SALVA, recalculada
   * com os dados de hoje, sem chamar a IA. A IA só roda no botão "Gerar nova
   * análise", ou sozinha uma única vez: no mês atual, quando ainda não há nada salvo.
   */
  useEffect(() => {
    if (!fixadosProntos) return;
    let vivo = true;
    abort.current?.abort();
    fila.current = [];
    setErro(null);
    setVazio(false);
    setSemAnalise(false);
    setCarregandoSalva(true);
    const fixos = blocosRef.current.filter((b) => b.fixado);
    lerAnaliseSalva(periodo, fixos)
      .then((r) => {
        if (!vivo) return;
        setCarregandoSalva(false);
        sujo.current = false;
        if (r.existe) {
          setGeradoEm(r.geradoEm);
          // entram em cascata pela mesma fila do streaming
          setBlocos(fixos.filter((f) => !r.blocos.some((b) => b.id === f.id)));
          fila.current = comStoryNoTopo(r.blocos);
        } else if (chave === 'mes') {
          gerar(periodo); // primeira vez: gera uma única análise
        } else {
          setGeradoEm(null);
          setBlocos(comStoryNoTopo(r.blocos));
          setSemAnalise(true);
        }
      })
      .catch((e) => {
        if (!vivo) return;
        setCarregandoSalva(false);
        setErro((e as Error).message || 'Não foi possível carregar a análise.');
      });
    return () => {
      vivo = false;
      abort.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixadosProntos, chave, chave === 'custom' ? `${custom.inicio}|${custom.fim}` : '']);

  // Edições do usuário vão para o servidor (sem IA), para reabrir igual
  useEffect(() => {
    if (!sujo.current || estado !== 'ocioso') return;
    const t = setTimeout(() => {
      sujo.current = false;
      salvarAnaliseAtual(periodo, blocosRef.current);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocos, estado]);

  const marcarNovos = (ids: string[]) => {
    if (!ids.length) return;
    setNovos(new Set(ids));
    setTimeout(() => setNovos(new Set()), 1800);
    // leva o primeiro bloco criado/alterado para a vista
    requestAnimationFrame(() => document.getElementById(`bloco-${ids[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const aplicar = (ops: Operacao[]) => {
    const tocados: string[] = [];
    if (ops.length) sujo.current = true;
    setBlocos((atual) => {
      let lista = [...atual];
      for (const op of ops) {
        if (op.op === 'create') {
          const i = lista.findIndex((b) => b.type !== 'story');
          lista.splice(i < 0 ? lista.length : i, 0, op.bloco);
          tocados.push(op.bloco.id);
        } else if (op.op === 'update') {
          lista = lista.map((b) => (b.id === op.id ? { ...op.bloco, id: op.id, fixado: b.fixado } : b));
          tocados.push(op.id);
        } else if (op.op === 'remove') {
          lista = lista.filter((b) => !op.ids.includes(b.id));
        } else if (op.op === 'reorder') {
          const pos = new Map(op.ids.map((id, i) => [id, i]));
          lista = [...lista].sort((a, b) => (pos.get(a.id) ?? 999) - (pos.get(b.id) ?? 999));
        }
      }
      return comStoryNoTopo(lista);
    });
    marcarNovos(tocados);
  };

  const comando = async (texto: string, alvo?: string) => {
    setErroComando(null);
    setEstado('executando');
    if (alvo) setOcupados(new Set([alvo]));
    try {
      const { operacoes, resposta: r } = await executarComando(texto, periodo, blocosRef.current);
      aplicar(operacoes);
      if (r) setResposta({ texto: r, id: Date.now() });
    } catch (e) {
      setErroComando((e as Error).message || 'A IA não conseguiu executar o pedido.');
      setTimeout(() => setErroComando(null), 6000);
    } finally {
      setOcupados(new Set());
      setEstado('ocioso');
    }
  };

  useEffect(() => {
    if (!resposta) return;
    const t = setTimeout(() => setResposta(null), 7000);
    return () => clearTimeout(t);
  }, [resposta]);

  const acoes = {
    onRefazer: (b: Bloco) =>
      comando(`Refaça o bloco ${b.id} ("${b.title}") com outro ângulo ou outra visualização, mantendo o assunto. Use a operação update nesse id.`, b.id),
    onFixar: (b: Bloco) => { sujo.current = true; setBlocos((l) => l.map((x) => (x.id === b.id ? { ...x, fixado: !x.fixado } : x))); },
    onRemover: (b: Bloco) => { sujo.current = true; setBlocos((l) => l.filter((x) => x.id !== b.id)); },
  };

  const carregando = estado === 'analisando' || estado === 'gerando' || carregandoSalva;
  const semStory = !blocos.some((b) => b.type === 'story');

  return (
    <div className="min-h-[100dvh] app-surface">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-44">
        <header className="flex flex-col gap-5 mb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-brand text-3xl font-bold tracking-tight text-[var(--color-ink)]">Insights</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <AiStatus estado={estado} />
                {geradoEm && estado === 'ocioso' && (
                  <span className="text-xs text-[var(--color-ink-muted)]" data-num>
                    Análise de {new Date(geradoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · números atualizados agora
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => gerar(periodo)}
              disabled={estado !== 'ocioso'}
              className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
            >
              <Icon name="sparkle" size={16} />
              Gerar nova análise
            </button>
          </div>
          <Segmented
            id="insights-periodo"
            label="Período da análise"
            value={chave}
            onChange={(v) => setChave(v)}
            options={[
              { value: 'mes', label: 'Este mês' },
              { value: '3m', label: '3 meses' },
              { value: 'ano', label: 'Ano' },
              { value: 'custom', label: 'Personalizado' },
            ]}
          />
          <Collapse open={chave === 'custom'} className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-[var(--color-ink-soft)] space-y-1.5">
              <span className="block">De</span>
              <input type="date" value={custom.inicio} max={custom.fim} onChange={(e) => setCustom((c) => ({ ...c, inicio: e.target.value }))} className="field px-3 py-2 rounded-[var(--radius-input)] border border-[var(--color-line)] bg-white" />
            </label>
            <label className="text-sm text-[var(--color-ink-soft)] space-y-1.5">
              <span className="block">Até</span>
              <input type="date" value={custom.fim} min={custom.inicio} max={hojeISO()} onChange={(e) => setCustom((c) => ({ ...c, fim: e.target.value }))} className="field px-3 py-2 rounded-[var(--radius-input)] border border-[var(--color-line)] bg-white" />
            </label>
          </Collapse>
        </header>

        {erro ? (
          <div role="alert" className="finance-card px-6 py-8 max-w-xl">
            <p className="font-semibold text-[var(--color-ink)]">A análise não pôde ser gerada.</p>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1">{erro}</p>
            <button type="button" onClick={() => gerar(periodo)} className="btn-primary px-5 py-2.5 text-sm mt-5">
              <Icon name="arrows-clockwise" size={15} /> Tentar novamente
            </button>
          </div>
        ) : vazio && !blocos.length ? (
          <div className="finance-card px-6 py-10 max-w-xl">
            <p className="font-semibold text-[var(--color-ink)]">Ainda não há lançamentos neste período.</p>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1 max-w-[46ch]">
              A IA monta a análise a partir das suas transações. Registre algumas, ou escolha um período maior.
            </p>
            <Link to="/transactions" className="btn-primary px-5 py-2.5 text-sm mt-5">Registrar transações</Link>
          </div>
        ) : (
          <>
          {semAnalise && !carregando && (
            <div className="rise finance-card px-6 py-8 mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--color-ink)]">Ainda não há análise para este período.</p>
                <p className="text-sm text-[var(--color-ink-muted)] mt-1">A IA só roda quando você pedir, para não gastar à toa.</p>
              </div>
              <button type="button" onClick={() => gerar(periodo)} className="btn-primary px-5 py-2.5 text-sm">
                <Icon name="sparkle" size={16} /> Gerar análise
              </button>
            </div>
          )}
          <LayoutGroup>
            <div className="grid grid-cols-12 gap-4 sm:gap-5 grid-flow-row-dense">
              {carregando && semStory && <BlocoSkeleton size="full" alto />}
              <AnimatePresence mode="popLayout">
                {blocos.map((b) => (
                  <BlocoFrame
                    key={b.id}
                    ref={(el) => { if (el) el.id = `bloco-${b.id}`; }}
                    bloco={b}
                    novo={novos.has(b.id)}
                    ocupado={ocupados.has(b.id)}
                    {...acoes}
                  />
                ))}
              </AnimatePresence>
              {carregando && (
                <>
                  <BlocoSkeleton size="sm" />
                  <BlocoSkeleton size="md" alto />
                  {blocos.length < 3 && <BlocoSkeleton size="sm" />}
                </>
              )}
            </div>
          </LayoutGroup>
          </>
        )}
      </main>
      <CommandBar estado={estado} resposta={resposta} erro={erroComando} onEnviar={(t) => comando(t)} />
    </div>
  );
}
