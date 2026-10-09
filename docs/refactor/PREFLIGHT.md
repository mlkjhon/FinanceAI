# Pre-flight (taste §14) e gate de entrega

Medições feitas sobre o build de produção (`vite build` + `vite preview`) com Chrome headless e Lighthouse 12.

## Checklist taste §14

- [x] Brief inference declarado (PLAN.md).
- [x] Dials explícitos e justificados (6 / 8 / 4).
- [x] Design system: estética honesta (Tailwind v4 + Base UI só para tooltip).
- [x] Modo de redesign detectado e auditoria feita (AUDIT.md).
- [x] Zero em-dash e en-dash em `src` (grep = 0).
- [x] Page Theme Lock: tema claro único. Os blocos verdes (bento IA, resultado do simulador, CTA final) são cartões de accent, não seções invertidas.
- [x] Color Consistency Lock: accent único `#047857`.
- [x] Shape Consistency Lock: pill / 16px / 10px.
- [x] Button Contrast Check: todos os CTAs ≥ 5,48:1.
- [x] CTA sem quebra de linha no desktop.
- [x] Form Contrast Check: label acima do input, input branco sobre verde, erro em branco com ícone.
- [x] Serif: nenhuma.
- [N/A] Paleta premium-consumer: N/A por R1 (cores existentes mantidas).
- [x] Itálico com descendentes: nenhum itálico em display.
- [x] Hero cabe na viewport: headline 2 linhas no desktop, subtexto 18 palavras, CTA visível sem scroll (conferido em 1440×900 e 390×844).
- [x] Hero top padding ≤ `pt-24`.
- [x] Hero com 3 elementos de texto (headline, subtexto, CTAs). Eyebrow, prova social e avatares saíram do hero.
- [x] Eyebrows: 0 (limite: ceil(12/3) = 4).
- [x] Sem split-header (FAQ tem título à esquerda e o accordion interativo à direita: razão composicional real).
- [x] Zigzag: no máximo 2 splits seguidos.
- [x] Uma label por intenção: "Começar gratuitamente" (cadastro) no hero e no CTA final; "Entrar" (login); "Ver demonstração" (demo).
- [N/A] Logo wall: não há clientes reais; o marquee mostra indexadores reais.
- [x] Bento com variação real: accent com gradiente radial, 2 imagens, 2 tints, 1 liso.
- [x] Copy Self-Audit: removidos "Tudo que você precisa", "transformar sua relação com o dinheiro", "transformação financeira".
- [x] Motion motivado (MOTION-INVENTORY.md).
- [x] Um único marquee.
- [x] Nav em uma linha, 64px (72px no desktop).
- [x] 9 famílias de layout em 12 seções, sem repetição.
- [x] Bento: 6 itens, 6 células.
- [x] Listas longas: FAQ em accordion, indexadores em marquee.
- [x] Imagens reais (fotografia), sem screenshot falso de div e sem SVG decorativo. **Provisórias**, ver "Pendências".
- [x] Sem pills sobre imagens, créditos inventados, footer com versão, faixa de cidade/clima, scroll cue, numeração de seção, dots decorativos (os dots do marquee foram removidos).
- [x] Citações com no máximo 3 linhas no desktop, aspas tipográficas.
- [x] Motion declarado = motion entregue (23 de 31 verificados em tela).
- [x] Pan horizontal e sticky com Motion nativo (sem GSAP, por decisão do prompt §3.2).
- [x] Sem `addEventListener('scroll')`.
- [x] Reduced motion em todos os 31.
- [N/A] Dark mode: N/A por R1. O tema nunca esteve ativo (variante presa a `.never-dark`); as classes `dark:` mortas foram removidas.
- [x] Mobile collapse explícito por seção.
- [x] `min-h-[100svh]` no hero, `100dvh` no app; zero `h-screen`.
- [x] `useEffect` com cleanup (inView, ResizeObserver, animate, matchMedia, timers).
- [x] Estados de loading (shimmer), vazio (simulador com 0) e erro (formulário).
- [x] Ícones de uma família só (Phosphor regular, via fonte).
- [ ] **Core Web Vitals no mobile:** ver abaixo.

## Checagens automáticas (prompt §13.3)

Todas retornam 0 em `src`, `public` e `package.json`: `<svg`/`.svg`/`image/svg`, bibliotecas de ícones SVG, `—`/`–`, `addEventListener('scroll')`, `transition: all`/`transition-all`, `scale(0)`, `easeIn`/`ease-in`, `framer-motion`, `h-screen`, fontes proibidas (com `-w` para não casar `setInterval`).

## Performance (Lighthouse 12, build de produção)

| Perfil | Performance | LCP | CLS | TBT | A11y | Best practices | SEO |
|---|---|---|---|---|---|---|---|
| Desktop | 96 | 1,1 s | 0 | 0 ms | 97 | 100 | 100 |
| Mobile (simulado: 4G lento, CPU 4×), mediana de 4 execuções | ~71 | ~4,1 s (3,3 a 4,4) | 0 | ~380 ms | 97 | 100 | 100 |

**R8 não está cumprido no mobile simulado.** O LCP é a imagem do hero; ela baixa em ~20ms, mas só pinta depois que o JS principal (176 KB gz: React, Motion, TanStack Router e Query) executa, porque o app é um SPA renderizado no cliente. Já feito para reduzir: code-splitting por rota (recharts, Pluggy e telas do app fora da landing), simulador e Base UI sob demanda, zod fora do bundle principal, subset dos ícones (147 KB → 5,7 KB), fontes sem bloquear renderização, splash e fade do root fora da landing. O próximo passo que resolve de fato é **pré-renderizar a rota `/` em HTML estático no build** (SSG + `hydrateRoot`), para a headline e a imagem pintarem antes do JS.

Acessibilidade 97: o único item é o "AI" do logo em `#34D399` (1,92:1). Logotipos são isentos pela WCAG 1.4.3 e o logo é preservado por R6.

## Verificações feitas

- Screenshots de scroll completo em 1440×900 (motion completo e reduzido) e 390×844.
- Interação automatizada: simulador (toggle, setas, digitação, tooltip com `transform-origin` no gatilho), FAQ, carrossel por teclado, formulário (erro e envio → `/auth?tab=register&email=...` com o e-mail preenchido), rota inexistente → 404. Zero erros de console.
- break-ui: 320px sem overflow; 390px com texto a 200% sem overflow (corrigidos: controles do carrossel, grid do FAQ, quebra de palavra longa na headline, header). Limite conhecido: 320px com texto a 200% ainda passa 62px.

## Pendências que precisam de humano ou aparelho

- Câmera lenta no painel Animations (10% e 25%) e revisão "no dia seguinte".
- iPhone/Safari e Android/Chrome: drag do carrossel, sticky (M16, M18), header (M06/M07), safe areas.
- Recharts nas telas internas (dashboard, entradas e saídas, evolução do saldo, detalhe do investimento) ainda gera SVG pela biblioteca. Trocar exige reescrever esses gráficos em canvas ou CSS; ficou fora do escopo da landing.
