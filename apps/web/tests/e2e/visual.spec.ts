import {expect,test} from '@playwright/test';

type PageName='overview'|'transactions'|'accounts'|'cards'|'budgets'|'savings'|'categories'|'connections'|'review'|'reports';
const templates:{slug:PageName;title:string;navigationTitle?:string}[]=[
  {slug:'overview',title:'Visão geral'},
  {slug:'transactions',title:'Transações'},
  {slug:'accounts',title:'Contas'},
  {slug:'cards',title:'Cartões e faturas',navigationTitle:'Cartões'},
  {slug:'budgets',title:'Orçamentos'},
  {slug:'savings',title:'Caixinhas'},
  {slug:'categories',title:'Categorias'},
  {slug:'connections',title:'Conexões bancárias',navigationTitle:'Conexões'},
  {slug:'review',title:'Revisão de categorias',navigationTitle:'Revisão'},
  {slug:'reports',title:'Relatórios'},
];

test.beforeEach(async ({page},testInfo)=>{
  const theme=testInfo.project.name.endsWith('-dark')?'dark':'light';
  await page.addInitScript(value=>localStorage.setItem('pf-theme',value),theme);
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
});

for(const {slug,title,navigationTitle=title} of templates){
  test(`template ${slug} — snapshot fullPage`,async ({page},testInfo)=>{
    const theme=testInfo.project.name.endsWith('-dark')?'dark':'light';
    await page.goto(`/#${slug}`);
    await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
    await expect(page.getByRole('heading',{name:title,level:1,exact:true})).toBeVisible();
    // No mobile, telas secundárias ficam em “Mais”, que passa a indicar a tela atual.
    const navigation=page.getByRole('navigation',{name:'Navegação principal'});
    const link=navigation.getByRole('link',{name:new RegExp(navigationTitle,'i')});
    if(await link.count())await expect(link).toHaveAttribute('aria-current','page');
    else await expect(navigation.getByRole('button',{name:'Mais'})).toHaveClass(/is-active/);
    await page.evaluate(()=>document.fonts.ready);
    await page.mouse.move(0,0);
    await expect(page).toHaveScreenshot(`${slug}.png`,{
      fullPage:true,
      animations:'disabled',
      caret:'hide',
    });
  });
}

test('modal Nova movimentação — snapshot (folha inferior no mobile)',async ({page})=>{
  await page.clock.setFixedTime(new Date('2026-11-18T12:00:00-03:00'));
  await page.goto('/#overview');
  await expect(page.getByRole('heading',{name:'Visão geral',level:1})).toBeVisible();
  await page.getByRole('button',{name:/^Nova movimentação/}).filter({visible:true}).first().click();
  const dialog=page.getByRole('dialog',{name:'Nova movimentação'});
  await expect(dialog).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  await expect(page).toHaveScreenshot('dialog-new-entry.png',{animations:'disabled',caret:'hide'});
});

