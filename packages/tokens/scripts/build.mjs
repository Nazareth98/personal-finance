import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { validateTokens } from './validate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(await readFile(resolve(root, 'src/themes.json'), 'utf8'));
const problems = validateTokens(tokens);
if (problems.length) throw new Error(problems.join('\n'));
const light = tokens.semantic.light;
const dark = tokens.semantic.dark;

const keys = Object.keys(light).sort();
if (keys.join('|') !== Object.keys(dark).sort().join('|')) {
  throw new Error('Light e Dark precisam expor exatamente os mesmos tokens.');
}
const elevation = (values) => Object.entries(values).map(([key, value]) => key === 'backdrop'
  ? `  --overlay-backdrop: ${value};` : `  --shadow-${key}: ${value};`);
const declarations = (values, theme) => [...keys.map((key) => `  --color-${key}: ${values[key]};`), ...elevation(tokens.elevation[theme])].join('\n');
const geometry = [
  ...Object.entries(tokens.spacing).map(([k, value]) => `  --spacing-${k}: ${value}px;`),
  ...Object.entries(tokens.radius).map(([k, value]) => `  --radius-${k}: ${value}px;`),
  ...Object.entries(tokens.controlHeight).map(([k, value]) => `  --control-height-${k}: ${value}px;`),
  ...Object.entries(tokens.typography.scale).map(([k, value]) => `  --font-size-${k}: ${value}px;`),
  ...Object.entries(tokens.zIndex).map(([k, value]) => `  --z-${k}: ${value};`),
  ...Object.entries(tokens.motion.duration).map(([k, value]) => `  --motion-${k}: ${value}ms;`),
  ...Object.entries(tokens.motion.easing).map(([k, value]) => `  --ease-${k}: ${value};`),
  `  --font-family-sans: ${tokens.typography.family};`
].join('\n');
const css = [
  '/* Gerado por packages/tokens/scripts/build.mjs. Não edite manualmente. */',
  ':root, [data-theme="light"] {', declarations(light, 'light'), geometry, '  color-scheme: light;', '}',
  '[data-theme="dark"] {', declarations(dark, 'dark'), '  color-scheme: dark;', '}',
  ''
].join('\n');
await mkdir(resolve(root, 'dist'), { recursive: true });
await writeFile(resolve(root, 'dist/theme.css'), css);
console.log('Corporate UI: Light/Dark CSS gerado.');
