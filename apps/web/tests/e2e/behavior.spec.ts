import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('temas explícitos prevalecem sobre preferência do sistema',async ({page})=>{
  await page.goto('/#overview');
  await page.evaluate(()=>localStorage.setItem('pf-theme','dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  const themeToggle=page.locator('.theme-toggle');
  await expect(themeToggle).toHaveAccessibleName('Ativar tema claro');
  await themeToggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await expect(themeToggle).toHaveAccessibleName('Ativar tema escuro');
  await page.reload();
  await expect(page.getByRole('button',{name:'Ativar tema escuro'})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('navegação entre dez templates funciona com histórico hash',async ({page})=>{
  await page.goto('/#overview');
  for(const {slug,title,navigationTitle=title} of [
    {slug:'transactions',title:'Transações'},
    {slug:'accounts',title:'Contas'},
    {slug:'cards',title:'Cartões e faturas',navigationTitle:'Cartões'},
    {slug:'budgets',title:'Orçamentos'},
    {slug:'savings',title:'Caixinhas'},
    {slug:'categories',title:'Categorias'},
    {slug:'connections',title:'Conexões bancárias',navigationTitle:'Conexões'},
    {slug:'review',title:'Revisão de categorias',navigationTitle:'Revisão'},
    {slug:'reports',title:'Relatórios'},
    {slug:'glossary',title:'Como funciona'},
  ]){
    const link=page.getByRole('navigation',{name:'Navegação principal'}).getByRole('link',{name:new RegExp(navigationTitle,'i')});
    if(await link.count())await link.click();
    else{
      await page.getByRole('button',{name:'Mais'}).click();
      await page.getByRole('dialog',{name:'Mais telas'}).getByRole('link',{name:new RegExp(navigationTitle,'i')}).click();
      await expect(page.getByRole('dialog',{name:'Mais telas'})).toBeHidden();
    }
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
  // D-038: a ação principal fica logo abaixo do cabeçalho da sidebar, antes da navegação.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:/^Nova movimentação/})).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Visão geral',exact:true})).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#transactions$/);
  await page.getByRole('button',{name:'Expandir menu'}).focus();
  await page.keyboard.press('Enter');
  await expect(sidebar).not.toHaveClass(/is-collapsed/);
});

test('sidebar não rola lateralmente em hover, foco ou ao recolher',async ({page},testInfo)=>{
  if(!testInfo.project.name.startsWith('desktop'))test.skip();
  await page.goto('/#overview');
  const navigation=page.getByRole('navigation',{name:'Navegação principal'});
  const overflow=()=>navigation.evaluate(element=>element.scrollWidth-element.clientWidth);
  const links=navigation.getByRole('link');
  for(const state of ['expandido','recolhido']){
    for(let index=0;index<await links.count();index+=1){
      await links.nth(index).hover();
      expect(await overflow(),`${state}: hover no link ${index}`).toBeLessThanOrEqual(0);
      await links.nth(index).focus();
      expect(await overflow(),`${state}: foco no link ${index}`).toBeLessThanOrEqual(0);
    }
    if(state==='expandido'){
      await page.getByRole('button',{name:'Recolher menu'}).click();
      expect(await overflow(),'durante a transição').toBeLessThanOrEqual(0);
      await expect(page.locator('.sidebar')).toHaveClass(/is-collapsed/);
    }
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
  const navigation=await page.getByRole('navigation',{name:'Navegação principal'}).evaluate(element=>({
    clientWidth:element.clientWidth,
    scrollWidth:element.scrollWidth,
  }));
  expect(navigation.scrollWidth).toBeLessThanOrEqual(navigation.clientWidth+1);
});

test('barra inferior e folha “Mais” no mobile funcionam por teclado',async ({page},testInfo)=>{
  if(!testInfo.project.name.startsWith('mobile'))test.skip();
  await page.goto('/#overview');
  const navigation=page.getByRole('navigation',{name:'Navegação principal'});
  await expect(navigation.getByRole('link')).toHaveCount(4);
  const box=await navigation.boundingBox();
  expect(box!.y+box!.height).toBeGreaterThan(page.viewportSize()!.height-2);
  const more=navigation.getByRole('button',{name:'Mais'});
  await more.focus();
  await page.keyboard.press('Enter');
  const sheet=page.getByRole('dialog',{name:'Mais telas'});
  await expect(sheet).toBeVisible();
  await expect(more).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(more).toBeFocused();
  const scan=await new AxeBuilder({page}).include('.bottom-nav').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  expect(scan.violations).toEqual([]);
  await more.click();
  await sheet.getByRole('link',{name:'Contas'}).click();
  await expect(page).toHaveURL(/#accounts$/);
  await expect(sheet).toBeHidden();
  await expect(more).toHaveClass(/is-active/);
});

test('barra inferior segue a ordem de uso diário',async ({page},testInfo)=>{
  if(!testInfo.project.name.startsWith('mobile'))test.skip();
  await page.goto('/#overview');
  await expect(page.getByRole('navigation',{name:'Navegação principal'}).getByRole('link')).toHaveText(['Visão geral','Transações','Revisão','Cartões']);
});

test('diálogo rola só o corpo; cabeçalho e ações ficam fixos',async ({page})=>{
  await page.setViewportSize({width:page.viewportSize()!.width,height:420});
  await page.goto('/#overview');
  await page.getByRole('button',{name:/^Nova movimentação/}).first().click();
  const dialog=page.getByRole('dialog',{name:/Nova movimentação/});
  const body=dialog.locator('.ui-dialog__body');
  const submit=dialog.getByRole('button',{name:'Validar demonstração'});
  expect(await body.evaluate(element=>element.scrollHeight>element.clientHeight)).toBe(true);
  await expect(dialog.locator('.ui-dialog__footer')).toContainText('Validar demonstração');
  await dialog.evaluate(element=>Promise.all(element.getAnimations({subtree:true}).map(animation=>animation.finished)));
  const before=await submit.boundingBox();
  await body.evaluate(element=>{element.scrollTop=element.scrollHeight;});
  expect(await submit.boundingBox()).toEqual(before);
  expect(await dialog.evaluate(element=>element.scrollHeight<=element.clientHeight+1)).toBe(true);
});

test('gráfico destaca o período por mouse e teclado e liga a tabela de valores',async ({page})=>{
  await page.goto('/#overview');
  const plot=page.getByRole('group',{name:/use as setas/}).first();
  await expect(plot).toBeVisible();
  const group=plot.locator(':scope > *').nth(1);
  await group.hover();
  await expect(group).toHaveClass(/is-active/);
  await expect(plot.locator('.ui-chart-tooltip')).toHaveCount(1);
  await page.mouse.move(0,0);
  await expect(plot.locator('.ui-chart-tooltip')).toHaveCount(0);
  await plot.focus();
  await page.keyboard.press('Home');
  await expect(plot.locator(':scope > *').first()).toHaveClass(/is-active/);
  await page.keyboard.press('ArrowRight');
  await expect(plot.locator(':scope > *').nth(1)).toHaveClass(/is-active/);
  const figure=page.locator('figure',{has:plot});
  const toggle=figure.getByRole('button',{name:'Ver valores'});
  if(await toggle.count()){
    await toggle.click();
    await expect(figure.getByRole('button',{name:'Ocultar valores'})).toHaveAttribute('aria-expanded','true');
  }
  const table=figure.getByRole('table');
  await expect(table).toBeVisible();
  await table.locator('tbody tr').nth(2).hover();
  await expect(plot.locator(':scope > *').nth(2)).toHaveClass(/is-active/);
});

test('abrir diálogo com a página rolada não desloca a sidebar fixa',async ({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('desktop'),'sidebar fixa só no desktop');
  await page.setViewportSize({width:1280,height:600});
  await page.goto('/#overview');
  await page.evaluate(()=>window.scrollTo(0,400));
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(0);
  const sidebar=page.locator('.sidebar');
  const before=await sidebar.boundingBox();
  await page.getByRole('button',{name:/^Nova movimentação/}).first().click();
  await expect(page.getByRole('dialog',{name:/Nova movimentação/})).toBeVisible();
  expect(await page.evaluate(()=>getComputedStyle(document.body).overflowY)).toBe('visible');
  expect((await sidebar.boundingBox())?.y).toBe(before?.y);
  expect(await page.evaluate(()=>window.scrollY)).toBeGreaterThan(0);
});

test('ajuda da tela abre, leva ao termo no glossário e o “i” explica o rótulo',async ({page})=>{
  await page.goto('/#budgets');
  await page.getByRole('button',{name:'Ajuda desta tela'}).click();
  const help=page.getByRole('dialog',{name:'Sobre Orçamentos'});
  await expect(help).toBeVisible();
  await expect(help.getByRole('heading',{name:'Como calculamos'})).toBeVisible();
  await help.getByRole('link',{name:'Folga'}).click();
  await expect(page).toHaveURL(/#glossary\?termo=folga$/);
  await expect(page.getByRole('heading',{name:'Como funciona',level:1})).toBeVisible();
  await expect(page.locator('#termo-folga')).toHaveClass(/is-target/);
  await page.getByLabel('Buscar termo').fill('caixinha');
  await expect(page.locator('.glossary dt')).toHaveText(['Aporte e resgate','Caixinha']);
  await page.goto('/#savings');
  const info=page.getByRole('button',{name:'O que é Saldo nas caixinhas'});
  await info.click();
  await expect(info).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('.ui-infotip__bubble')).toContainText('o dinheiro só muda de lugar');
  await page.keyboard.press('Escape');
  await expect(info).toHaveAttribute('aria-expanded','false');
});
