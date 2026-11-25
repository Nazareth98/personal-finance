import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDateBR, maskDateBR, parseDateBR, weekdayLabel } from '../../../../packages/ui/src/components/date-format.ts';

test('DateField: máscara, leitura e formato brasileiro (D-082)', () => {
  assert.equal(maskDateBR('25112026'), '25/11/2026');
  assert.equal(maskDateBR('2a5/1'), '25/1');
  assert.equal(parseDateBR('25/11/2026'), '2026-11-25');
  assert.equal(parseDateBR('31/02/2026'), '');
  assert.equal(parseDateBR('25/11/26'), '');
  assert.equal(formatDateBR('2026-01-05'), '05/01/2026');
  assert.equal(formatDateBR('2026-13-01'), '');
  assert.equal(weekdayLabel('2026-11-20'), 'sexta, 20 de novembro de 2026');
});
