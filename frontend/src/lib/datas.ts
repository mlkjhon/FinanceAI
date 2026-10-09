// "10/2026" -> "out 2026" (ou "outubro" com long)
export function nomeMes(mmYYYY: string, estilo: 'short' | 'long' = 'short') {
  const [m, y] = (mmYYYY || '').split('/');
  if (!m || !y) return mmYYYY;
  const d = new Date(Number(y), Number(m) - 1, 15);
  const mes = d.toLocaleDateString('pt-BR', { month: estilo }).replace('.', '');
  return estilo === 'long' ? mes : `${mes} ${y}`;
}
