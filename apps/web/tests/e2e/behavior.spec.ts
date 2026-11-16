import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('temas explícitos prevalecem sobre preferência do sistema',async ({page})=>{
  await page.goto('/#overview');
  await page.evaluate(()=>localStorage.setItem('pf-theme','dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  const appearance=page.getByRole('group',{name:'Aparência'});
  const lightTheme=appearance.getByRole('button',{name:'Tema claro'});
  await expect(appearance.getByRole('button',{name:'Tema escuro'})).toHaveAttribute('aria-pressed','true');
  await lightTheme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.reload();
  await expect(lightTheme).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('navegação entre nove templates funciona com histórico hash',async ({page})=>{
  await page.goto('/#overview');
  for(const {slug,title,navigationTitle=title} of [
    {slug:'transactions',title:'Transações'},
    {slug:'accounts',title:'Contas'},
    {slug:'cards',title:'Cartões e faturas'},
    {slug:'budgets',title:'Orçamentos'},
    {slug:'savings',title:'Caixinhas'},
    {slug:'connections',title:'Conexões bancárias',navigationTitle:'Conexões'},
    {slug:'review',title:'Revisão de categorias',navigationTitle:'Revisão'},
    {slug:'reports',title:'Relatórios'},
  ]){
    await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('link',{name:new RegExp(navigationTitle,'i')}).click();
    await expect(page).toHaveURL(new RegExp(`#${slug}$`));
    await expect(page.getByRole('heading',{name:title,exact:true,level:1})).toBeVisible();
  }
});

test('sidebar pode ser recolhida e expandida no desktop',async ({page},testInfo)=>{
  if(!testInfo.project.name.startsWith('desktop'))test.skip();
  await page.goto('/#overview');
  const sidebar=page.locator('.sidebar');
  const collapse=page.getByRole('button',{name:'Recolher menu'});
  await collapse.focus();
  await page.keyboard.press('Enter');
  await expect(sidebar).toHaveClass(/is-collapsed/);
  await expect(page.getByRole('button',{name:'Expandir menu'})).toHaveAttribute('aria-expanded','false');
  const scan=await new AxeBuilder({page}).include('.sidebar').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Visão geral',exact:true})).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#transactions$/);
  await page.getByRole('button',{name:'Expandir menu'}).focus();
  await page.keyboard.press('Enter');
  await expect(sidebar).not.toHaveClass(/is-collapsed/);
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
