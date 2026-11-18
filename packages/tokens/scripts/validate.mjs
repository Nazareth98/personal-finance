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
      ['text-secondary', 'bg-subtle', 4.5],
      ['text-accent', 'bg-canvas', 4.5],
      ['text-accent', 'bg-subtle', 4.5],
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

  const elevationLight = Object.keys(tokens?.elevation?.light || {}).sort().join('|');
  if (!elevationLight || elevationLight !== Object.keys(tokens?.elevation?.dark || {}).sort().join('|')) {
    problems.push('Elevação Light e Dark devem ter as mesmas chaves.');
  }
  for (const [theme, values] of Object.entries(tokens?.elevation || {})) {
    for (const [name, value] of Object.entries(values)) {
      if (typeof value !== 'string' || !/^[0-9a-z.,()\s-]+$/i.test(value)) problems.push(`Elevação inválida em ${theme}/${name}`);
    }
  }
  const layers = tokens?.zIndex || {};
  if (!Object.values(layers).every(Number.isInteger)) problems.push('z-index deve ser inteiro.');
  // Toast precisa ficar acima de menus, que ficam acima do cabeçalho fixo.
  if (!(layers.sticky < layers.dropdown && layers.dropdown < layers.toast)) problems.push('Camadas devem respeitar sticky < dropdown < toast.');

  // Movimento (D-041): entrar nunca passa de 320 ms; durações crescem de instant a slow.
  const durations = tokens?.motion?.duration || {};
  const order = ['instant', 'fast', 'base', 'slow'];
  if (!order.every(name => Number.isInteger(durations[name]) && durations[name] > 0)) problems.push('Durações de movimento devem ser inteiros positivos em ms.');
  else if (!order.every((name, index) => index === 0 || durations[order[index - 1]] < durations[name]) || durations.slow > 320) {
    problems.push('Durações devem respeitar instant < fast < base < slow ≤ 320 ms.');
  }
  for (const [name, value] of Object.entries(tokens?.motion?.easing || {})) {
    if (typeof value !== 'string' || !/^cubic-bezier\([0-9.,\s-]+\)$/.test(value)) problems.push(`Curva de movimento inválida: ${name}`);
  }
  if (!['standard', 'enter', 'exit'].every(name => tokens?.motion?.easing?.[name])) problems.push('Curvas standard, enter e exit são obrigatórias.');

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
