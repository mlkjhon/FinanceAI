# Auditoria (fase 1)

Skills usadas: `redesign-existing-projects`, `improve-animations`, `find-animation-opportunities`, `review-animations`.
Commit de base: `ee37bb3`.

## 1. Stack

| Item | Antes | Observação |
|---|---|---|
| Framework | React 19.2 + Vite 5.4 (SPA, sem RSC) | `AnimateView` exige React 19.3+: não usado |
| Roteamento | TanStack Router 1.120 (file-based) | 404 existia em `/404` mas não estava ligado como not-found |
| Estilo | Tailwind v4 (`@tailwindcss/vite`) | Dois CSS globais em conflito (`index.css` do template + `styles.css`) |
| Animação | `framer-motion` 12 | Migrado para `motion` 14 (`motion/react`, `motion/react-m`) |
| Ícones | `lucide-react` (SVG) | Substituído por fonte Phosphor (subset woff2) |
| UI primitives | nenhuma | Base UI (`@base-ui/react`) para o tooltip (pick-ui-library) |
| Gráficos | Recharts + SVG à mão | Donuts e anel de meta viraram CSS; Recharts segue nas telas internas (ver PREFLIGHT) |

## 2. Paleta extraída

Nenhuma cor nova foi criada. Tons derivados usam `color-mix(in oklab, ...)` sobre cores existentes.

| Hex | Nome semântico | Onde aparece | Papel |
|---|---|---|---|
| `#ffffff` | `--color-bg` | fundo da página e cards | fundo |
| `#111827` | `--color-ink` (era `finance-bg-dark` / gray-900) | títulos e texto principal | texto |
| `#4b5563` | `--color-ink-soft` (gray-600) | corpo | texto |
| `#6b7280` | `--color-ink-muted` (gray-500) | legendas | texto |
| `#e5e7eb` | `--color-line` (gray-200) | bordas | borda |
| `#f9fafb` | `--color-surface` (gray-50) | seções e FAQ | superfície |
| `#047857` | `--color-accent` (era `finance-primary-hover`) | CTAs, links, blocos de destaque | **accent único** |
| `#10B981` | `--color-brand` / `finance-primary` | logo, gráficos | marca (preenchimento) |
| `#059669` | `finance-secondary` | gráficos do app | marca |
| `#34D399` | `finance-accent` | "AI" do logo, brilhos | marca (decorativo) |
| `#EF4444` | `finance-error` | erros do app | estado |
| `#aa3bff` | `--accent` do template Vite | `index.css` | **removido** (resto de boilerplate, nunca foi da marca) |

### Matriz de contraste (WCAG)

| Par | Frente | Fundo | Razão | Resultado |
|---|---|---|---|---|
| ink / bg | #111827 | #ffffff | 17,74 | AAA |
| ink-soft / bg | #4b5563 | #ffffff | 7,56 | AAA |
| ink-muted / bg | #6b7280 | #ffffff | 4,83 | AA |
| ink-muted / surface | #6b7280 | #f9fafb | 4,63 | AA |
| accent / bg | #047857 | #ffffff | 5,48 | AA |
| branco / accent | #ffffff | #047857 | 5,48 | AA |
| branco 90% / accent | #e6f2ee | #047857 | 4,78 | AA |
| ink / tint do bento | #111827 | #e3f9f1 | ~16,8 | AAA |
| branco / primary (CTA antigo) | #ffffff | #10B981 | 2,54 | **falha** → CTA passou para `#047857` (cor existente) |
| gray-400 / bg (legendas antigas) | #9ca3af | #ffffff | 2,54 | **falha** → trocado por gray-500/600 |
| branco 80% / accent | #cde4dd | #047857 | 4,11 | **falha** (achado do Lighthouse) → branco 90% |
| accent claro / bg ("AI" do logo) | #34D399 | #ffffff | 1,92 | logotipo: isento pela WCAG 1.4.3; mantido por R6 |

## 3. Arquitetura de informação

Antes (rota `/`): Navbar, Hero, Features (6 cards), Como funciona (3 passos), Depoimentos (3), CTA, Footer. Nenhuma seção tinha ID ou âncora.

| CTA | Destino | Intenção |
|---|---|---|
| Começar gratuitamente | `/auth` | cadastro |
| Ver demonstração | `/dashboard` (redireciona para `/auth` sem token) | demo |
| Criar conta grátis (CTA final) | `/auth` | cadastro (duplicava a intenção) |
| Entrar (navbar) | `/auth` | login |
| Política de Privacidade / Termos de Uso | `#` | links mortos |

Formulários na landing: nenhum. Eventos de analytics: nenhum encontrado no código.

## 4. Inventário de SVG

| Arquivo | Ocorrência | Substituto |
|---|---|---|
| 17 arquivos | imports de `lucide-react` | `src/components/icons.tsx` (fonte Phosphor) |
| `src/assets/react.svg`, `vite.svg` | boilerplate | removidos |
| `public/favicon.svg`, `public/icons.svg` | favicon do template | `favicon.ico` + PNG 32/180/192/512 |
| `SplashScreen.tsx` | logo, gráfico de partículas, ícone de check | glifo da fonte, barras CSS com `scaleY`, glifo |
| `auth.tsx` | círculos decorativos | `span` com `border-radius` |
| `bancos.tsx` | lixeira x2, spinner x2 | glifo `trash`, `.spinner` CSS |
| `dashboard.tsx`, `categorias.tsx` | donut | `DonutRing` (conic-gradient + máscara) |
| `goals.tsx` | anel de progresso | `ProgressRing` (conic-gradient) |
| Recharts (dashboard, entradas-saídas, evolução, investimento) | SVG gerado pela lib | **não substituído** (ver PREFLIGHT) |

## 5. Tipografia atual

Space Grotesk (títulos) + DM Sans (corpo), via `<link>` do Google Fonts (bloqueante). `index.css` ainda forçava `system-ui` e `18px/145%` no `:root`. Tamanhos fixos (`text-4xl sm:text-6xl lg:text-7xl`), tracking padrão, sem `text-wrap`, sem tabular nums, gradiente no texto do hero.

## 6. Animações atuais (review)

| Before | After | Why |
|---|---|---|
| `Navbar.tsx` `initial={{ y: -60 }}` no load | nav estática | Navegação não anima no load; atrasa a orientação |
| `initial={{ opacity: 0, y: 30 }}` + `delay: index * 0.1` | variants com `delayChildren: stagger(0.06)` e string `transform` | 100ms por item é longo; `y` roda no main thread |
| `whileHover={{ y: -5 }}` nos cards | removido; tilt só com ponteiro fino | Hover sem gate de `(hover: hover)` gruda no toque |
| `transition-all duration-300` em `.finance-card` | `transition: box-shadow 200ms, border-color 200ms` | `all` anima propriedades fora da GPU |
| `scale: 0` nos pontos do splash | barras com `scaleY(0.2)` | Nada surge do zero |
| `ease: 'easeInOut'` no NeuralWave | `[0.77, 0, 0.175, 1]` | Curva embutida fraca |
| rAF + `setState` no contador do splash | `useMotionValue` + `animate` | rAF tocando estado re-renderiza a árvore a cada frame |
| Root inteiro em `opacity: 0 → 1` | landing sem fade; app com `.route-fade` CSS | Esconder tudo atrasa o LCP |
| Splash de 3s em toda primeira visita | não aparece em `/` | Bloqueava o LCP da landing por 3s |
| Drawer mobile com `x` e spring 25/200 | `transform` string, `--ease-drawer` 400ms, saída 200ms | Aceleração por hardware e saída mais rápida que a entrada |

## 7. Oportunidades de motion (find-animation-opportunities)

Viraram o catálogo M01 a M31 (MOTION-INVENTORY.md). **Não animar** (rejeitados):

- Navegação no load (rejeitado: frequência alta, orientação).
- Parágrafos de corpo (rejeitado: o fade-up em todo bloco é o default genérico).
- Links do footer no load, logos individualmente, digitação nos inputs, atalhos de teclado, hover em listas longas, troca de tema.
- Gráficos de dados do dashboard (rejeitado: dado que o usuário lê não se move por estilo).
- Valor do simulador a cada tecla (só anima na troca de frequência).

## 8. AI tells presentes

- Gradiente em texto grande ("com inteligência").
- Três colunas iguais (features e depoimentos).
- Eyebrow com ícone "Powered by Inteligência Artificial".
- Linha de avatares "A", "B", "C" + número redondo "+2.400" dentro do hero.
- Numeração decorativa "01 / 02 / 03" nos passos.
- Estrelas douradas em todos os depoimentos.
- Copy: "Tudo que você precisa para prosperar", "transformar sua relação com o dinheiro", "Comece sua transformação financeira".
- Accent roxo `#aa3bff` esquecido no CSS do template.
- Sombras em preto puro.

## 9. Dials do site atual

`DESIGN_VARIANCE` 4 (tudo centrado e simétrico), `MOTION_INTENSITY` 4 (fade-ups genéricos), `VISUAL_DENSITY` 4.

## 10. Modo de redesign

Overhaul visual com preservação de cor, conteúdo, IA e SEO.
