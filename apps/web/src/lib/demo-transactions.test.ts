import test from 'node:test';
import assert from 'node:assert/strict';
import { demoTransactions,filterTransactions,formatCentsBRL,totalsFromTransactions } from './demo-transactions.ts';
import { sortRows,paginateRows } from '../../../../packages/ui/src/lib/table-data.ts';

test('formatação usa bigint e preserva centavos mesmo em montantes enormes',()=>{
  assert.equal(formatCentsBRL(123456n),'R$ 1.234,56');
  assert.equal(formatCentsBRL(-1n),'-R$ 0,01');
  assert.equal(formatCentsBRL(900719925474099300n),'R$ 9.007.199.254.740.993,00');
});
test('busca ignora acentos e filtra tipo sem modificar dados originais',()=>{
  const rows=filterTransactions(demoTransactions,{query:'transferencia',kind:'transfer',category:'all'});
  assert.equal(rows.length,2);
  assert.equal(demoTransactions.length,12);
});
test('transferências são excluídas dos totais de consumo e receita',()=>{
  const totals=totalsFromTransactions(demoTransactions);
  assert.equal(totals.income,627000n);
  assert.equal(totals.expense,205868n);
});
test('ordenação bigint exata, estável e paginação defensiva',()=>{
  const data=[{id:'b',value:10n},{id:'a',value:2n},{id:'c',value:2n}];
  const cols=[{key:'value',header:'Valor',cell:(row:typeof data[number])=>String(row.value),sortable:true,sortValue:(row:typeof data[number])=>row.value}];
  const ordered=sortRows(data,{key:'value',direction:'asc'},cols);
  assert.deepEqual(ordered.map(x=>x.id),['a','c','b']);
  assert.deepEqual(paginateRows(ordered,2,2).map(x=>x.id),['b']);
  assert.deepEqual(paginateRows(ordered,0,2),[]);
});
