import test from 'node:test';
import assert from 'node:assert/strict';
import {demoTransactions,filterTransactions,formatCentsBRL,totalsFromTransactions} from './demo-transactions.ts';
import {sortRows,paginateRows} from '../../../../packages/ui/src/lib/table-data.ts';
test('formata BRL em bigint com precisão inteira',()=>{assert.equal(formatCentsBRL(123456n),'R$ 1.234,56');assert.equal(formatCentsBRL(-1n),'-R$ 0,01');});
test('filtro textual sem acentos e sem mutações',()=>{assert.equal(filterTransactions(demoTransactions,{query:'transferencia',kind:'transfer',category:'all'}).length,2);assert.equal(demoTransactions.length,12);});
test('transferências não entram no consumo ou renda',()=>{assert.deepEqual(totalsFromTransactions(demoTransactions),{income:627000n,expense:205868n});});
test('ordenação monetária e paginação estáveis',()=>{
const rows=[{id:'b',amount:10n},{id:'a',amount:2n},{id:'c',amount:2n}];
const cols=[{key:'amount',header:'Valor',sortable:true,sortValue:(r:typeof rows[number])=>r.amount,cell:(r:typeof rows[number])=>String(r.amount)}];
const sorted=sortRows(rows,{key:'amount',direction:'asc'},cols);
assert.deepEqual(sorted.map(r=>r.id),['a','c','b']);assert.deepEqual(paginateRows(sorted,2,2).map(r=>r.id),['b']);
});
