import test from 'node:test';
import assert from 'node:assert/strict';
import { readTokens, validateTokens, contrastRatio } from '../scripts/validate.mjs';

test('tokens Light e Dark seguem contrato e contraste mínimo', async () => {
  const tokens = await readTokens();
  assert.deepEqual(validateTokens(tokens), []);
  assert.match(tokens.typography.family, /^"Inter Variable"/);
});

test('fonte variável é auto-hospedada pelo pacote de tokens', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../src/fonts.css', import.meta.url), 'utf8');
  assert.match(css, /@fontsource-variable\/inter\/wght\.css/);
});

test('contraste é calculado segundo luminância relativa', () => {
  assert.ok(Math.abs(contrastRatio('#000000', '#FFFFFF') - 21) < 0.001);
  assert.ok(contrastRatio('#FFFFFF', '#FFFFFF') === 1);
});

test('tokens com divergência entre temas são rejeitados', async () => {
  const tokens = await readTokens();
  delete tokens.semantic.dark['bg-canvas'];
  assert.match(validateTokens(tokens).join(' '), /mesmas chaves/);
});

test('cores ilegíveis em botões são rejeitadas', async () => {
  const tokens = await readTokens();
  tokens.semantic.dark['action-primary'] = '#EFF6FF';
  assert.match(validateTokens(tokens).join(' '), /Contraste insuficiente/);
});

test('cores financeiras legíveis em superfícies dos dois temas', async () => {
  const tokens = await readTokens();
  for(const theme of ['light','dark']) {
    const themeTokens=tokens.semantic[theme];
    for(const surface of ['bg-canvas','bg-surface']){
      for(const semantic of ['finance-positive','finance-negative','finance-neutral','finance-transfer']){
        assert.ok(contrastRatio(themeTokens[semantic],themeTokens[surface])>=4.5,`${theme} ${semantic}/${surface}`);
      }
    }
  }
});
test('o CSS gerado permite temas explícitos em containers isolados', async () => {
  const {execFileSync}=await import('node:child_process');
  const {readFile}=await import('node:fs/promises');
  const {fileURLToPath}=await import('node:url');
  const {dirname,resolve}=await import('node:path');
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  execFileSync(process.execPath,[resolve(root,'scripts/build.mjs')],{cwd:root});
  const css=await readFile(resolve(root,'dist/theme.css'),'utf8');
  assert.match(css,/\:root, \[data-theme="light"\]/);
  assert.match(css,/\[data-theme="dark"\]/);
  const tokens=await readTokens();
  for(const key of Object.keys(tokens.semantic.light)){
    assert.equal((css.match(new RegExp('--color-'+key+':','g'))||[]).length,2,`Token CSS em Light e Dark: ${key}`);
  }
});
