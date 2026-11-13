import test from 'node:test';
import assert from 'node:assert/strict';
import {parseThemePreference,resolveTheme} from './theme.ts';

test('tema não definido acompanha a preferência do sistema', () => {
  assert.equal(parseThemePreference(null),'system');
  assert.equal(parseThemePreference('anything'),'system');
  assert.equal(resolveTheme('system',true),'dark');
  assert.equal(resolveTheme('system',false),'light');
});
test('preferência manual prevalece sobre sistema e mantém valores legados', () => {
  assert.equal(parseThemePreference('dark'),'dark');
  assert.equal(parseThemePreference('light'),'light');
  assert.equal(resolveTheme('dark',false),'dark');
  assert.equal(resolveTheme('light',true),'light');
});
