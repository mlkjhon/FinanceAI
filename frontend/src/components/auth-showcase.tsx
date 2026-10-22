import { useQuery } from '@tanstack/react-query';
import { Icon, type IconName } from './icons';

/*
 * Painel verde da tela de entrar/cadastrar. Mostra coisas reais em vez de
 * contadores: as taxas do dia (BrasilAPI, a mesma fonte dos investimentos do app)
 * e o que o app faz de diferente. Se a API de taxas falhar, a faixa some.
 */
type Taxa = { nome: string; valor: number };

const PONTOS: { icone: IconName; titulo: string; texto: string }[] = [
  {
    icone: 'sparkle',
    titulo: 'Insights que fazem, não só falam',
    texto: 'A IA lê seus gastos e sugere criar uma meta, um orçamento ou um aporte. Um toque e está feito.',
  },
  {
    icone: 'trend-up',
    titulo: 'Investimentos rendendo todo dia',
    texto: 'CDB, Tesouro, poupança: o rendimento entra sozinho, calculado com CDI, Selic e IPCA reais.',
  },
  {
    icone: 'target',
    titulo: 'Metas e orçamentos com histórico',
    texto: 'Cada depósito com data e hora, limites por categoria e o dinheiro voltando ao saldo quando você desiste.',
  },
];

const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

export function AuthShowcase() {
  const { data: taxas } = useQuery({
    queryKey: ['taxas-publicas'],
    queryFn: async () => {
      const r = await fetch('https://brasilapi.com.br/api/taxas/v1');
      if (!r.ok) throw new Error('taxas');
      return (await r.json()) as Taxa[];
    },
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });
  // a API manda 'Selic' (às vezes 'SELIC'): compara sem diferenciar maiúsculas e mostra o nome bonito
  const ordem = ['SELIC', 'CDI', 'IPCA'];
  const NOMES: Record<string, string> = { SELIC: 'Selic', CDI: 'CDI', IPCA: 'IPCA' };
  const lista = (taxas ?? [])
    .map((t) => ({ ...t, nome: t.nome.toUpperCase() }))
    .filter((t) => ordem.includes(t.nome))
    .sort((a, b) => ordem.indexOf(a.nome) - ordem.indexOf(b.nome));

  return (
    <div className="hidden lg:flex w-1/2 gradient-hero text-white flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
      {/* textura sutil: um arco grande saindo do canto, sem competir com o texto */}
      <span aria-hidden className="pointer-events-none absolute -right-40 -bottom-40 size-[34rem] rounded-full border border-white/10" />
      <span aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-[24rem] rounded-full border border-white/10" />

      <div className="relative flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-white/15">
          <Icon name="trend-up" size={22} />
        </span>
        <span className="font-brand text-2xl font-bold">FinanceAI</span>
      </div>

      <div className="relative max-w-md space-y-10">
        <div className="space-y-3">
          <h2 className="font-brand text-4xl font-bold leading-tight tracking-tight text-balance">Seu dinheiro, explicado e organizado.</h2>
          <p className="text-white/75 text-base max-w-[40ch]">
            Transações, metas, orçamentos e investimentos num lugar só, com uma IA que mostra o que importa no seu mês.
          </p>
        </div>

        <ul className="space-y-5">
          {PONTOS.map((p, i) => (
            <li key={p.titulo} className="rise flex gap-4" style={{ '--i': i + 1 } as React.CSSProperties}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/12 ring-1 ring-white/15">
                <Icon name={p.icone} size={18} />
              </span>
              <div>
                <p className="font-semibold">{p.titulo}</p>
                <p className="mt-0.5 text-sm text-white/70">{p.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative">
        {lista.length > 0 && (
          <div className="rise" style={{ '--i': 5 } as React.CSSProperties}>
            <p className="text-xs uppercase tracking-wider text-white/60">Taxas de hoje · BrasilAPI</p>
            <dl style={{ gridTemplateColumns: `repeat(${lista.length}, minmax(0, 1fr))` }} className="mt-3 grid divide-x divide-white/15 rounded-2xl bg-white/10 ring-1 ring-white/15">
              {lista.map((t) => (
                <div key={t.nome} className="px-5 py-4">
                  <dt className="text-xs text-white/65">{NOMES[t.nome]}</dt>
                  <dd className="mt-1 font-brand text-2xl font-bold tracking-tight" data-num>{pct(t.valor)}</dd>
                  <dd className="text-[11px] text-white/55">{t.nome === 'IPCA' ? 'em 12 meses' : 'ao ano'}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
