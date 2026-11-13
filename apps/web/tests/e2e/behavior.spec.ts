import {expect,test} from '@playwright/test';

test('temas explícitos prevalecem sobre preferência do sistema',async ({page})=>{
  await page.goto('/#overview');
  await page.evaluate(()=>localStorage.setItem('pf-theme','dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  const select=page.getByRole('combobox',{name:'Aparência'});
  await select.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.reload();
  await expect(select).toHaveValue('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('navegação entre sete templates funciona com histórico hash',async ({page})=>{
  await page.goto('/#overview');
  for(const [slug,title] of [
    ['transactions','Transações'],
    ['accounts','Contas'],
    ['cards','Cartões e faturas'],
    ['budgets','Orçamentos'],
    ['savings','Caixinhas'],
    ['reports','Relatórios'],
  ]){
    await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('link',{name:new RegExp(title,'i')}).click();
    await expect(page).toHaveURL(new RegExp(`#${slug}$`));
    await expect(page.getByRole('heading',{name:title,exact:true,level:1})).toBeVisible();
  }
});

test('mobile não tem overflow horizontal do documento',async ({page},testInfo)=>{
  if(!testInfo.project.name.startsWith('mobile'))test.skip();
  await page.goto('/#reports');
  await expect(page.getByRole('heading',{name:'Relatórios',level:1})).toBeVisible();
  const dimensions=await page.evaluate(()=>({
    clientWidth:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth+1);
});
