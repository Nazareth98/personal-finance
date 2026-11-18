import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// DESIGN.md alimenta o Claude Design; precisa refletir exatamente os tokens versionados.
const tokens = JSON.parse(await readFile('packages/tokens/src/themes.json', 'utf8'));
const design = await readFile('DESIGN.md', 'utf8');
const frontmatter = design.split('---')[1] ?? '';
const { light, dark } = tokens.semantic;

for (const [name, value] of Object.entries(light)) {
  const match = frontmatter.match(new RegExp(`\n  ${name}: "(#[0-9A-Fa-f]{6})"`));
  assert.equal(match?.[1]?.toUpperCase(), value.toUpperCase(), `DESIGN.md frontmatter: ${name}`);
}
const covered = new Set();
for (const row of design.matchAll(/^\| ((?:`[^`]+`(?:, )?)+) \| `(#[0-9A-Fa-f]{6})` \| `(#[0-9A-Fa-f]{6})` \|/gm)) {
  for (const name of row[1].match(/`([^`]+)`/g).map(item => item.slice(1, -1))) {
    covered.add(name);
    assert.equal(row[2].toUpperCase(), light[name]?.toUpperCase(), `DESIGN.md Light: ${name}`);
    assert.equal(row[3].toUpperCase(), dark[name]?.toUpperCase(), `DESIGN.md Dark: ${name}`);
  }
}
assert.deepEqual(Object.keys(light).filter(name => !covered.has(name)), [], 'DESIGN.md: tokens fora da tabela de temas');
for (const [name, value] of Object.entries(tokens.elevation.light)) {
  const token = name === 'backdrop' ? 'overlay-backdrop' : `shadow-${name}`;
  assert.ok(design.includes(`| \`${token}\` |`) && design.includes(`\`${value}\``) && design.includes(`\`${tokens.elevation.dark[name]}\``), `DESIGN.md elevação: ${token}`);
}
for (const [name, value] of Object.entries(tokens.zIndex)) assert.ok(design.includes(`\`${name}\` ${value}`), `DESIGN.md camada: ${name}`);

console.log('✓ DESIGN.md sincronizado com themes.json.');
