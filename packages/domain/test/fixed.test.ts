import assert from 'node:assert/strict';
import test from 'node:test';
import { fixedItemExpectedValue, fixedItemLastValue, fixedItemMonthStatus, similarWithoutFixed, suggestFixedItemName, type FixedItemLink } from '../src/index.ts';

const tx = (id: string, competence: string, amountCents: bigint, day = '10', description = 'ALUGUEL APTO 1203') =>
  ({ id, description, amountCents, eventDate: `${competence}-${day}`, competence });
const transactions = [tx('a', '2026-09', -180000n), tx('b', '2026-10', -180000n), tx('c', '2026-11', -185000n, '12'),
  tx('d', '2026-11', -4000n, '20', 'ALUGUEL APTO 1203'), tx('e', '2026-12', -185000n), tx('f', '2026-12', 50000n, '10', 'ALUGUEL APTO 1203')];
const links: FixedItemLink[] = ['a', 'b', 'c', 'd'].map(transactionId => ({ transactionId, fixedItemId: 'rent', linkedBy: 'owner' }));

test('fixo projeta o valor do último mês com vínculo, somando o que caiu no mesmo mês (D-084)', () => {
  assert.deepEqual(fixedItemLastValue('rent', links, transactions), { cents: 189000n, competence: '2026-11', count: 2 });
  assert.deepEqual(fixedItemLastValue('none', links, transactions), { cents: 0n });
});

test('situação do fixo no mês: feito, pendente até o dia habitual + 3, depois atrasado', () => {
  assert.equal(fixedItemMonthStatus('rent', links, transactions, '2026-11', '2026-11-25'), 'done');
  assert.equal(fixedItemMonthStatus('rent', links, transactions, '2026-12', '2026-12-14'), 'pending');
  assert.equal(fixedItemMonthStatus('rent', links, transactions, '2026-12', '2026-12-16'), 'late');
  assert.equal(fixedItemMonthStatus('rent', links, transactions, '2027-01', '2026-12-16'), 'pending');
  assert.equal(fixedItemMonthStatus('none', links, transactions, '2026-12', '2026-12-30'), 'pending');
});

test('iguais sem fixo: mesma descrição normalizada e mesmo sinal', () => {
  assert.deepEqual(similarWithoutFixed(transactions[4]!, transactions, links).map(item => item.id), []);
  assert.deepEqual(similarWithoutFixed(transactions[0]!, transactions, []).map(item => item.id), ['b', 'c', 'd', 'e']);
});

test('nome sugerido sem números longos', () => {
  assert.equal(suggestFixedItemName('ALUGUEL APTO 1203'), 'Aluguel Apto');
  assert.equal(suggestFixedItemName('PIX ENVIADO - CONCESSIONARIA DE ENERGIA'), 'Pix Enviado Concessionaria de Energia');
});

test('mês em curso não vira base: salário em duas partes usa o último mês completo (D-084)', () => {
  const salary = [tx('s1', '2026-10', 309000n, '15', 'SALARIO'), tx('s2', '2026-10', 256700n, '29', 'SALARIO'), tx('s3', '2026-11', 252600n, '12', 'SALARIO')];
  const salaryLinks: FixedItemLink[] = ['s1', 's2', 's3'].map(transactionId => ({ transactionId, fixedItemId: 'salary', linkedBy: 'auto_similar' }));
  assert.equal(fixedItemLastValue('salary', salaryLinks, salary, '2026-11').cents, 565700n);
  assert.equal(fixedItemExpectedValue('salary', salaryLinks, salary, '2026-11', '2026-11'), 565700n);
  assert.equal(fixedItemExpectedValue('salary', salaryLinks, salary, '2027-01', '2026-11'), 565700n);
  assert.equal(fixedItemExpectedValue('salary', salaryLinks, salary, '2026-10', '2026-11'), 565700n);
  assert.equal(fixedItemMonthStatus('salary', salaryLinks, salary, '2026-11', '2026-11-25'), 'partial');
  const only = [tx('n1', '2026-11', 252600n, '12', 'SALARIO')];
  assert.equal(fixedItemExpectedValue('salary', [{ transactionId: 'n1', fixedItemId: 'salary', linkedBy: 'owner' }], only, '2026-12', '2026-11'), 252600n);
});
