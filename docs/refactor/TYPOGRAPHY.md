# Tipografia

## Escolha: Sistema A, "Grotesk de contraste"

- **Display:** Cabinet Grotesk 500 / 700 / 800 (Fontshare, ITF Free Font License).
- **Texto:** Switzer 400 / 400 itálico / 500 / 600 (Fontshare, ITF Free Font License).

Por que A e não B (Geist): o design read é "fintech de consumo, calma e confiável". Geist é a escolha óbvia de fintech/devtool e está saturada. Cabinet Grotesk tem personalidade nos títulos sem perder seriedade, e Switzer é neutra e muito legível em corpo.

Por que Switzer e não General Sans: inspecionei as duas com `fontkit`. General Sans tem numerais proporcionais e **não tem** `tnum`; em um app de finanças os contadores e valores tremeriam. Switzer tem numerais tabulares por padrão (todos os dígitos com 576 unidades de avanço), então `tabular-nums` funciona de fato.

Glifos conferidos nas duas: `ç ã õ á à â é ê í ó ô ú ü º ª R$ “ ” ‘ ’` e maiúsculas acentuadas. Nenhum faltando.

## Stylistic set

Cabinet Grotesk oferece `ss01` a `ss05`. Renderizei as variações:

| Set | Efeito |
|---|---|
| `ss01` | "a" e "g" de um andar |
| `ss04` | só "a" de um andar |
| `ss05` | só "g" de um andar |

Escolhido **`ss01`** em todos os títulos e no `.font-brand` (`font-feature-settings: "ss01" 1, "kern" 1`). O "ɑ" de um andar muda a palavra "Finance" no logo e nas headlines e é o detalhe que mais afasta a página do visual padrão.

## Carregamento

- Repositório público: os `.woff2` **não** são versionados (restrição da licença ITF). As fontes vêm da CSS API do Fontshare, com `preconnect`.
- As folhas são carregadas sem bloquear a renderização (`media="print"` + `onload`), com `<noscript>` de fallback. Isso cortou ~840ms de bloqueio no Lighthouse.
- Fallback com métricas da Arial ajustadas (calculadas com `fontkit` sobre um texto pt-BR) para CLS zero na troca:

| Família | size-adjust | ascent | descent | line-gap |
|---|---|---|---|---|
| Cabinet Fallback | 97,27% | 89,44% | 28,79% | 9,25% |
| Switzer Fallback | 101,28% | 96,76% | 24,68% | 8,89% |

Resultado medido: CLS 0 em todas as execuções do Lighthouse.

## Escala

Tokens no `@theme` do Tailwind (`text-display-xl`, `text-display`, `text-h2`, `text-h3`, `text-lead`, `text-body`, `text-small`, `text-micro`), com line-height, tracking e peso por tamanho, conforme a tabela do prompt §7.4. Ajustes:

- `h3` com peso 500: a Cabinet em 600 fica pesada demais nesse tamanho.
- A headline do hero usa `display` (5 palavras, mas a coluna de texto tem 7/12 da largura; com `display-xl` ela ia para 3 linhas no desktop).

## Microtipografia aplicada

`font-synthesis: none`, `font-kerning`, `font-optical-sizing`, `text-wrap: balance` em h1 a h3, `pretty` em parágrafos, `hanging-punctuation` em citações, `tabular-nums lining-nums` em `[data-num]`, `.price`, `.stat`, `.acronym` com `case` e tracking +0,04em nos indexadores (CDI, IPCA...), aspas tipográficas nas citações, espaço não separável em "6 meses" e "o seu", números formatados com `Intl.NumberFormat("pt-BR")`, sentence case em todos os títulos.

## Ícones

Fonte Phosphor regular, **subset** com só os 49 glifos usados (`npm run icons` gera `src/assets/fonts/phosphor-subset.woff2`, 5,7 KB contra 147 KB da fonte inteira). Licença MIT.
