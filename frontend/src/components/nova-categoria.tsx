import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, type Category } from '../lib/api';
import { campoClasse } from '../lib/classes';
import { cn } from '../lib/utils';
import { Loader2, Plus } from './icons';
import { Collapse } from './collapse';

/*
 * Criar categoria sem sair da tela (transação, orçamento, categorias...).
 * A categoria é só do usuário e já nasce com a subcategoria "Geral".
 * Uso: <NovaCategoria tipo="despesa" onCriada={(id) => ...} /> mostra o botão
 * "+ Nova" e, aberto, o campo de nome logo abaixo.
 */
export function BotaoNovaCategoria({ aberto, onClick, controla, rotulo = 'Nova' }: { aberto: boolean; onClick: () => void; controla: string; rotulo?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={aberto}
      aria-controls={controla}
      className="pressable inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-[var(--color-accent)] hover:bg-gain-soft"
    >
      <Plus size={12} /> {rotulo}
    </button>
  );
}

export function PainelNovaCategoria({
  id,
  aberto,
  tipo,
  escolherTipo = false,
  onCriada,
}: {
  id: string;
  aberto: boolean;
  tipo: 'receita' | 'despesa';
  // true: deixa escolher entre receita e despesa (ex.: tela de categorias)
  escolherTipo?: boolean;
  onCriada: (id: string, categoria: Category) => void;
}) {
  const qc = useQueryClient();
  const uid = useId();
  const [nome, setNome] = useState('');
  const [tipoEscolhido, setTipoEscolhido] = useState(tipo);
  const tipoFinal = escolherTipo ? tipoEscolhido : tipo;

  const criar = useMutation({
    mutationFn: () => categoriesApi.create({ nome: nome.trim(), tipo: tipoFinal }),
    onSuccess: (c) => {
      const nova: Category = { id: String(c.id_categoria), nome: c.nome, tipo: tipoFinal, propria: true };
      // entra na lista na hora (sem esperar o recarregamento) para os selects já mostrarem
      qc.setQueryData<Category[]>(['categories'], (antes) => [...(antes ?? []), nova]);
      qc.invalidateQueries({ queryKey: ['categories'] });
      setNome('');
      onCriada(nova.id, nova);
    },
  });
  const enviar = () => {
    if (nome.trim().length >= 2 && !criar.isPending) criar.mutate();
  };

  return (
    <Collapse open={aberto}>
      <div id={id} className="rounded-xl bg-[var(--color-surface)] p-3 space-y-2">
        <label htmlFor={`${uid}-nome`} className="text-xs font-medium text-[var(--color-ink-soft)]">
          Nova categoria{escolherTipo ? '' : ` de ${tipoFinal === 'receita' ? 'receita' : 'despesa'}`}{' '}
          <span className="text-[var(--color-ink-muted)] font-normal">(só você vê)</span>
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`${uid}-nome`}
            value={nome}
            maxLength={60}
            onChange={(e) => { setNome(e.target.value); criar.reset(); }}
            // Enter cria a categoria (não envia o formulário em volta)
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enviar(); } }}
            placeholder={tipoFinal === 'receita' ? 'Ex.: Freelas' : 'Ex.: Pets'}
            className={cn(campoClasse, 'py-2.5 flex-1')}
          />
          {escolherTipo && (
            <select
              aria-label="Tipo da categoria"
              value={tipoEscolhido}
              onChange={(e) => setTipoEscolhido(e.target.value as 'receita' | 'despesa')}
              className={cn(campoClasse, 'py-2.5 sm:w-36')}
            >
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          )}
          <button
            type="button"
            onClick={enviar}
            disabled={nome.trim().length < 2 || criar.isPending}
            className="btn-primary shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {criar.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Criar'}
          </button>
        </div>
        {criar.isError && <p role="alert" className="text-xs text-loss">{(criar.error as Error).message || 'Não deu para criar a categoria.'}</p>}
      </div>
    </Collapse>
  );
}
