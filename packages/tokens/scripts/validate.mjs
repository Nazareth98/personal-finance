import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(first, second) {
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const validHex = /^#[0-9A-Fa-f]{6}$/;
export function validateTokens(tokens) {
  const problems = [];
  const light = tokens?.semantic?.light || {};
  const dark = tokens?.semantic?.dark || {};
  const namesLight = Object.keys(light).sort();
  const namesDark = Object.keys(dark).sort();
  if (namesLight.join('|') !== namesDark.join('|')) problems.push('Light e Dark devem ter as mesmas chaves.');

  for (const [theme, values] of Object.entries({ light, dark })) {
    for (const [name, value] of Object.entries(values)) {
      if (!validHex.test(value)) problems.push(`Cor inválida em ${theme}/${name}: ${String(value)}`);
    }
    const pairs = [
      ['text-primary', 'bg-canvas', 4.5],
      ['text-secondary', 'bg-canvas', 4.5],
      ['text-primary', 'bg-surface', 4.5],
      ['text-secondary', 'bg-surface', 4.5],
      ['text-on-action', 'action-primary', 4.5],
      ['text-on-action', 'action-hover', 4.5],
      ['text-on-danger', 'status-danger', 4.5],
      ['finance-positive', 'bg-canvas', 4.5],
      ['finance-negative', 'bg-canvas', 4.5],
      ['finance-neutral', 'bg-canvas', 4.5],
      ['finance-transfer', 'bg-canvas', 4.5],
      ['finance-positive', 'bg-surface', 4.5],
      ['finance-negative', 'bg-surface', 4.5],
      ['finance-neutral', 'bg-surface', 4.5],
      ['finance-transfer', 'bg-surface', 4.5],
      ['status-danger', 'bg-surface', 4.5],
      ['status-success', 'bg-surface', 4.5],
      ['status-warning', 'bg-surface', 4.5]
    ];
    for (const [foreground, background, minimum] of pairs) {
      const a = values[foreground], b = values[background];
      if (!a || !b || !validHex.test(a) || !validHex.test(b)) {
        problems.push(`Par de contraste ausente ou inválido: ${theme} ${foreground}/${background}`);
      } else if (contrastRatio(a, b) < minimum) {
        problems.push(`Contraste insuficiente (${contrastRatio(a,b).toFixed(2)}:1): ${theme} ${foreground} sobre ${background}`);
      }
    }
  }

  for (const category of ['spacing', 'radius', 'controlHeight']) {
    for (const [name, value] of Object.entries(tokens?.[category] || {})) {
      if (!Number.isFinite(value) || value < 0) problems.push(`Valor geométrico inválido: ${category}/${name}`);
    }
  }
  return problems;
}

export async function readTokens() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  return JSON.parse(await readFile(resolve(root, 'src/themes.json'), 'utf8'));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = validateTokens(await readTokens());
  if (problems.length) {
    for (const problem of problems) console.error('✗', problem);
    process.exitCode = 1;
  } else {
    console.log('✓ Tokens Light/Dark e contraste de texto validado.');
  }
}
