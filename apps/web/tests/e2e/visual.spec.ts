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
