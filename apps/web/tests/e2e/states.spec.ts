import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('gráfico: loading acessível, erro anunciado e recuperação por retry',async ({page})=>{
  await page.goto('/#overview');
  const graph=page.getByRole('figure',{name:'Comparativo de receitas e despesas'});
  await expect(graph).toBeVisible();
  await page.getByRole('button',{name:'Simular loading do gráfico'}).click();
  const loading=page.getByRole('status',{name:'Carregando fluxo de caixa'});
  await expect(loading).toBeVisible();
  await expect(loading).toHaveAttribute('aria-busy','true');
  await expect(graph).toHaveCount(0);
  await page.getByRole('button',{name:'Simular erro do gráfico'}).click();
  await expect(page.getByRole('alert').getByText('Erro ao carregar o fluxo de caixa')).toBeVisible();
  await expect(loading).toHaveCount(0);
  await page.getByRole('button',{name:'Tentar novamente'}).click();
  await expect(graph).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('tabela: loading e erro preservam filtros; retry restaura resultados',async ({page})=>{
  await page.goto('/#transactions');
  const query=page.getByRole('textbox',{name:'Pesquisar'});
  await query.fill('mercado');
  await expect(page.getByRole('table',{name:'Tabela de transações fictícias'})).toBeVisible();
  await page.getByRole('button',{name:'Simular loading'}).click();
  const loading=page.getByRole('status',{name:'Carregando movimentações demonstrativas'});
  await expect(loading).toHaveAttribute('aria-busy','true');
  await expect(page.getByRole('table',{name:'Tabela de transações fictícias'})).toHaveCount(0);
  await page.getByRole('button',{name:'Simular erro na tabela'}).click();
  await expect(page.getByRole('alert').getByText('Erro ao carregar movimentações')).toBeVisible();
  await page.getByRole('button',{name:'Tentar novamente'}).click();
  await expect(query).toHaveValue('mercado');
  await expect(page.getByRole('table',{name:'Tabela de transações fictícias'}).getByText('Mercado fictício')).toBeVisible();
});

test('loading e erro não criam violações WCAG A/AA',async ({page})=>{
  await page.goto('/#overview');
  for(const action of ['Simular loading do gráfico','Simular erro do gráfico']){
    await page.getByRole('button',{name:action}).click();
    const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    expect(scan.violations.map(v=>v.id),JSON.stringify(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})))).toEqual([]);
  }
});
