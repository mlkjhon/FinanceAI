# Inventário de motion

Tokens: `frontend/src/lib/motion-tokens.ts` (JS) e `:root` em `frontend/src/styles.css` (CSS).
Provider: `LazyMotion features={domMax} strict` + `MotionConfig reducedMotion="user"`, só na landing.

Status:
- **tela**: verificado em Chrome headless (screenshots de scroll em 1440 e 390, ou teste de interação automatizado).
- **código**: implementado e compilado, mas depende de mouse real ou de olho humano (hover, magnético, tilt), então não dá para afirmar a sensação só por screenshot.

| ID | Nome (`animation-vocabulary`) | Elemento | Gatilho | Propósito | Frequência | API Motion | Valores | Tier | Fallback reduced | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| M01 | Reveal (clip) + Stagger | headline do hero | load | hierarquia: a promessa é lida primeiro | rara | `variants`, `delayChildren: stagger()` | `translateY(110%→0)`, 0,8s, `ease.out`, 40ms/palavra, início 50ms | S | sem transform | tela |
| M02 | Fade in + Stagger (orquestração) | subtexto e CTAs | load | narrativa: da promessa para a ação | rara | `variants`, `stagger(0.06, {startDelay: .35})` | opacity, `translateY(12px)`, `blur(4px)`, 0,6s | A | só opacity | tela |
| M03 | Reveal (clip-path) + counter-scale | mídia do hero | load | continuidade com a headline | rara | `initial/animate` | `inset(6%)→0` 1,0s `inOut`; img `scale(1.12→1)` 1,4s | S | estático | tela |
| M04 | Scroll-driven animation | hero inteiro | scroll | transição espacial para a próxima seção | ocasional | `useScroll` + `useTransform` | img scale 1→1,08; texto y 0→-60, opacity 1→0 em [0, .6] | A | valores estáticos | tela |
| M05 | Scroll-driven (barra de progresso) | topo da página | scroll | orientação | contínua | `useScroll` + `useSpring` | `scaleX`, spring 100/30 | S | mantida (é informação) | tela |
| M06 | Slide (direction-aware) | header | direção do scroll | devolver espaço sem perder acesso | ocasional | `useMotionValueEvent` | `translateY(-100%)` após 120px, `spring.snappy`; volta com foco no header | S | troca por opacity | tela |
| M07 | Fade (material translúcido) | camada do header | scroll | separar chrome só quando há sobreposição | contínua | `useTransform(scrollY,[0,64],[0,1])` | opacity da camada com `blur(12px) saturate(160%)` | B | fundo sólido (`prefers-reduced-transparency`) | tela |
| M08 | Shared element transition | pill da nav | hover/foco | feedback espacial entre itens | dezenas/dia | `LayoutGroup`, `layoutId="nav-pill"` | `spring.snappy`, saída 150ms | B | troca sem deslizar | código |
| M09 | Rolling label | CTA primário | hover/focus-visible | feedback de intenção | ocasional | CSS | 2 cópias, `translateY`, 220ms `--ease-out` | S | instantâneo | código |
| M10 | Press / tap feedback | todo `.pressable` | `:active` | confirmar o toque | dezenas/dia | CSS | `scale(0.97)`, 160ms | S | sem scale | código |
| M11 | Magnetic | CTA primário (único) | ponteiro | atrair o olhar para a ação | ocasional | `useMotionValue` + `useSpring` | 25% da distância, ±8px, 150/15/0,1 | A | desligado | código |
| M12 | Marquee | indexadores | constante | amplitude sem ocupar altura | ambiente | CSS + `inView()` + `usePageInView` | 40s linear, track duplicado 1x, pausa fora da tela, aba oculta e hover | S | lista estática | tela |
| M13 | Skew (velocity) | wrapper do marquee | velocidade do scroll | ligar a faixa ao gesto | ambiente | `useVelocity` + `useSpring` | ±6° em ±2000px/s, 300/40 | S | desligado | código |
| M14 | Reveal (clip) por linha | títulos de seção | scroll | hierarquia ao entrar no capítulo | ocasional | `SplitReveal onScroll` | 0,55s, `amount: .6`, uma vez | S | sem transform | tela |
| M15 | Scroll-driven word reveal | manifesto | scroll | ritmo de leitura guiado | rara | `useTransform` por palavra | opacity 0,15→1, janela de 0,2 | S | texto 100% | tela |
| M16 | Sticky scroll + shared element | Como funciona | scroll | explicar passo a passo | rara | `useScroll`, `useMotionValueEvent`, `layoutId="step-indicator"` | 300vh, grid 5fr/7fr, inativos 0,4 | B | grade estática / lista no mobile | tela |
| M17 | Crossfade com blur | mídia dos passos | troca de passo | trocar estado sem "dois objetos" | rara | `AnimatePresence mode="popLayout"` | `blur(6px)`, `scale(1.03→1)`, 0,45s | A | só opacity | tela |
| M18 | Horizontal scroll (sticky pan) | módulos | scroll | amplitude num gesto | rara | `useScroll` + `useTransform(fn)` + `frame.read` | 300vh, distância medida do trilho | A | scroll-snap | tela |
| M19 | Reveal (clip-path) | imagem do Open Finance | scroll | peso para a imagem-chave | rara | `useScroll` + `useTransform` | `inset(0 50%)→0`, img scale 1,15→1 | S | estático | tela |
| M20 | Stagger (scale in) | células do bento | scroll | ler o grid como sistema | rara | `whileInView`, `stagger(0.06)` | opacity, `translateY(16px) scale(.98)`, 0,55s | S | só opacity | tela |
| M21 | 3D tilt + spotlight | células do bento | ponteiro | materialidade, convite à exploração | ocasional | `useSpring`, `useMotionTemplate` | ±5°, 200/20, gradiente 280px | C (área do card) | desligado | código |
| M22 | Number ticker | 16 / 13 / 6 | scroll | ênfase em dados reais | rara | `animate(mv)` + `useTransform` | 1,2s `ease.out`, `Intl.NumberFormat` | S | valor final direto | tela |
| M23 | Drag + momentum + rubber-banding | depoimentos | gesto, setas, botões | manipulação direta | ocasional | `drag`, `animate(x, {velocity})`, `project()` | elastic 0,12, spring 260/28, d=0,998 | A | `x.set` direto | tela (teclado) |
| M24 | Shared element + direction-aware | simulador | toggle | mostrar mudança de estado e valor | ocasional | `layoutId="freq-pill"`, `AnimatePresence custom` | `translateY(±60%)`, 0,25s | B | sem deslize | tela |
| M25 | Origin-aware (scale in) | tooltips | hover/foco | contexto sob demanda | ocasional | Base UI Tooltip + CSS | `scale(.97)`, 125ms, `--transform-origin`, `[data-instant]` | S | só opacity | tela |
| M26 | Accordion + morph (mais → fechar) | FAQ | clique | revelar resposta mantendo contexto | ocasional | `AnimatePresence` height | 0,3s height, 0,2s opacity, barras giram 45° | D (pequeno) | instantâneo | tela |
| M27 | Shake + morph de botão | formulário final | envio | feedback de estado completo | rara | `useAnimate`, `layout`, `mode="wait"` | shake 0,32s; anel de foco 150ms; rótulo → spinner → "Pronto" | A | sem shake | tela |
| M28 | Direction-aware underline | links do footer | hover/focus | affordance de link | dezenas/dia | CSS | `scaleX`, origem direita → esquerda, 200ms | S | instantâneo | código |
| M29 | Reveal (clip-path circle) | bloco do CTA final | scroll | clímax antes da conversão | rara | `useScroll` + `useTransform` | `circle(0%→150% at 50% 100%)` | S | bloco aberto | tela |
| M30 | Parallax (reveal por baixo) | footer + wordmark | scroll | fechamento com profundidade | rara | sticky + `useScroll` | y 30%→0, opacity 0,3→1 | A | estático | tela |
| M31 | Skeleton / shimmer | todas as imagens | carregamento | status enquanto carrega | ocasional | CSS `[data-loading]` | 1,4s linear, removido no `onLoad`/`onError` | S | placeholder estático | código |

Total: 31 implementados; 23 verificados em tela, 8 verificados em código (dependem de ponteiro real).

## O que NÃO anima

Navegação no load, parágrafos de corpo, links do footer no load, logos individualmente, digitação nos inputs (o valor do simulador atualiza sem animação; só rola na troca de frequência), atalhos de teclado (as setas do carrossel movem com a mesma spring do botão, sem animação extra), hover em listas longas, troca de tema (não existe), gráficos de dados das telas internas.

## Motion ambiente

Só M12, M13 e M31, como pede o prompt. M12 e M31 pausam fora da tela ou somem quando a imagem carrega.
