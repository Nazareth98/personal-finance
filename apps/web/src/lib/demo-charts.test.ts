import test from 'node:test';
import assert from 'node:assert/strict';
import {demoCashFlow,cumulativeNet,expenseCategorySlices} from './demo-charts.ts';
import {demoTransactions} from './demo-transactions.ts';
import {percentage,signedRatio,categoryPercentages} from '../../../../packages/ui/src/lib/chart-data.ts';
test('percentual para gráfico nunca converte o valor financeiro completo em number',()=>{
  assert.equal(percentage(50n,200n),25);
  assert.equal(percentage(200n,100n),100);
  assert.equal(percentage(0n,0n),0);
  assert.equal(percentage(900719925474099300n,1801439850948198600n),50);
});
test('normaliza a série inclusive quando há saldos negativos',()=>{
  assert.equal(signedRatio(-50n,-100n,100n),.25);
  assert.equal(signedRatio(0n,0n,0n),.5);
  assert.equal(signedRatio(999n,-100n,100n),1);
});
test('distingue receitas de transferências em tendência acumulada',()=>{
  const trend=cumulativeNet([{label:'A',incomeCents:25000n,expenseCents:5000n},{label:'B',incomeCents:0n,expenseCents:30000n}]);
  assert.deepEqual(trend.map(p=>p.valueCents),[20000n,-10000n]);
  assert.equal(cumulativeNet(demoCashFlow).length,6);
});
test('fatias de despesas preservam total e ignoram transferências',()=>{
  const slices=expenseCategorySlices(demoTransactions);
  assert.equal(slices.reduce((n,s)=>n+s.valueCents,0n),205868n);
  assert.ok(slices.every(s=>s.valueCents>0n));
  assert.equal(categoryPercentages([{label:'A',valueCents:1n},{label:'B',valueCents:3n}])[0].percent,25);
});
