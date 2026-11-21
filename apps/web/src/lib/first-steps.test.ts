import test from 'node:test';
import assert from 'node:assert/strict';
import type { LedgerData } from '../ledger/contracts';
import type { ConnectionsData } from '../integrations/contracts';
import { buildFirstSteps } from './first-steps.ts';
import { glossary, richParts, screenHelp, termSlug } from './help-content.ts';

const empty = { accounts: [], categories: [], budgets: [], savingsBoxes: [], savingsMovements: [], transactions: [], links: [], classifications: [],
  semanticOverrides: [], reviewHistory: [], creditCards: [], cardStatements: [], cardStatementEntries: [], cardInstallments: [] } as unknown as LedgerData;
const noConnections: ConnectionsData = { connections: [], runs: [], credentials: { configured: false } };
const done = (steps: ReturnType<typeof buildFirstSteps>) => steps.filter(step => step.done).map(step => step.id);

test('instância nova: nada concluído, revisão não conta como feita sem lançamentos', () => {
  assert.deepEqual(done(buildFirstSteps(empty, noConnections, 0)), []);
});

test('chaves no servidor contam como Pluggy conectado quando já há banco', () => {
  const connections = { ...noConnections, connections: [{ id: 'c', institutionName: 'Banco', status: 'ready' }] } as ConnectionsData;
  assert.deepEqual(done(buildFirstSteps(empty, connections, 0)), ['pluggy', 'banks']);
});

test('cartões só contam quando todo cartão tem configuração', () => {
  const ledger = { ...empty, accounts: [{ id: 'a', type: 'credit_card' }, { id: 'b', type: 'credit_card' }], creditCards: [{ id: 'x', accountId: 'a', closingDay: 1, dueDay: 8 }] } as unknown as LedgerData;
  assert.equal(buildFirstSteps(ledger, noConnections, 0).find(step => step.id === 'cards')?.done, false);
  const full = { ...ledger, creditCards: [...ledger.creditCards, { id: 'y', accountId: 'b', closingDay: 1, dueDay: 8 }] } as LedgerData;
  assert.equal(buildFirstSteps(full, noConnections, 0).find(step => step.id === 'cards')?.done, true);
});

test('revisão concluída só com lançamentos e fila vazia', () => {
  const ledger = { ...empty, transactions: [{ id: 't' }] } as unknown as LedgerData;
  assert.equal(buildFirstSteps(ledger, noConnections, 3).find(step => step.id === 'review')?.done, false);
  assert.equal(buildFirstSteps(ledger, noConnections, 0).find(step => step.id === 'review')?.done, true);
  const reviewed = { ...ledger, reviewHistory: [{ id: 'h' }] } as unknown as LedgerData;
  assert.equal(buildFirstSteps(reviewed, noConnections, 5).find(step => step.id === 'review')?.done, true, 'já revisou um: passo feito mesmo com fila');
});

test('todo termo citado nas telas existe no glossário e tem âncora única', () => {
  const terms = new Set(glossary.map(entry => entry.term));
  for (const help of Object.values(screenHelp)) for (const term of help.terms) assert.ok(terms.has(term), term);
  const slugs = glossary.map(entry => termSlug(entry.term));
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(termSlug('Competência'), 'competencia');
});

test('negrito vira partes sem HTML', () => {
  assert.deepEqual(richParts('**Saldo** = a + b'), [{ text: 'Saldo', strong: true }, { text: ' = a + b', strong: false }]);
});

test('toda natureza escolhível tem explicação em linguagem simples', async () => {
  const { natureHints } = await import('./help-content.ts');
  for (const nature of ['income', 'expense', 'own_transfer', 'card_payment', 'savings_contribution', 'savings_withdrawal', 'adjustment', 'transfer', 'adjustment_expense', 'adjustment_income'])
    assert.ok(natureHints[nature]?.length > 20, nature);
});
