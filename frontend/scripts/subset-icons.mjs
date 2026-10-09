// Gera src/assets/fonts/phosphor-subset.woff2 só com os glifos usados em src/components/icons.tsx.
// Rode depois de adicionar um ícone novo: npm run icons
import { readFile, writeFile } from 'node:fs/promises';
import subsetFont from 'subset-font';

const source = await readFile(new URL('../src/components/icons.tsx', import.meta.url), 'utf8');
const codepoints = [...source.matchAll(/:\s*0x([0-9a-f]{4,5})/gi)].map((m) => parseInt(m[1], 16));
const text = String.fromCodePoint(...new Set(codepoints));

const font = await readFile(new URL('../node_modules/@phosphor-icons/web/src/regular/Phosphor.ttf', import.meta.url));
const subset = await subsetFont(font, text, { targetFormat: 'woff2' });
await writeFile(new URL('../src/assets/fonts/phosphor-subset.woff2', import.meta.url), subset);
console.log(`phosphor-subset.woff2: ${codepoints.length} glifos, ${subset.length} bytes`);
