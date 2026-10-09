// Indexadores, rótulos e sugestões por tipo usados nos formulários de investimento

export const INDEXADORES = [
  'PREFIXADO', 'CDI', 'SELIC', 'IPCA', 'IGPM', 'INPC',
  'TR', 'POUPANCA', 'IBOVESPA', 'TLP', 'TJLP', 'TBF',
  'PTAX', 'IMA-B', 'IRF-M', 'IDA',
] as const;

const NOMES: Record<string, string> = { PREFIXADO: 'Prefixado', POUPANCA: 'Poupança', IGPM: 'IGP-M' };
export const nomeIndexador = (i: string) => NOMES[i] ?? i;

const PERCENTUAL = ['CDI', 'SELIC', 'POUPANCA', 'IBOVESPA'];
export const regraDo = (i: string) => (i === 'PREFIXADO' ? 'prefixado' : PERCENTUAL.includes(i) ? 'percentual' : 'spread');

export function rotuloTaxa(indexador: string) {
  const r = regraDo(indexador);
  if (r === 'prefixado') return 'Taxa ao ano';
  if (r === 'percentual') return `Quanto do ${nomeIndexador(indexador)} (%)`;
  return `Taxa acima do ${nomeIndexador(indexador)} (% ao ano)`;
}

export function exemploTaxa(indexador: string) {
  const r = regraDo(indexador);
  return r === 'prefixado' ? 'Ex.: 12,5' : r === 'percentual' ? 'Ex.: 110' : 'Ex.: 6,2';
}

/*
 * Ao escolher o tipo, o formulário já sugere o indexador e a taxa mais comuns
 * (o usuário pode trocar). Tipos sem regra comum não sugerem nada.
 */
export const SUGESTAO_POR_TIPO: Record<string, { indexador: string; taxa: string }> = {
  CDB: { indexador: 'CDI', taxa: '100' },
  CDI: { indexador: 'CDI', taxa: '100' },
  'LCI / LCA': { indexador: 'CDI', taxa: '90' },
  'Tesouro Direto': { indexador: 'SELIC', taxa: '100' },
  Poupança: { indexador: 'POUPANCA', taxa: '100' },
  'Previdência Privada': { indexador: 'CDI', taxa: '100' },
  'Fundos de Investimento': { indexador: 'CDI', taxa: '100' },
  Ações: { indexador: 'IBOVESPA', taxa: '100' },
  ETFs: { indexador: 'IBOVESPA', taxa: '100' },
  'Fundos Imobiliários (FIIs)': { indexador: 'IPCA', taxa: '6' },
};
