import {expect,test} from '@playwright/test';

type PageName='overview'|'transactions'|'accounts'|'cards'|'budgets'|'savings'|'reports';
const templates:{slug:PageName;title:string}[]=[
  {slug:'overview',title:'Visão geral'},
  {slug:'transactions',title:'Transações'},
  {slug:'accounts',title:'Contas'},
  {slug:'cards',title:'Cartões e faturas'},
  {slug:'budgets',title:'Orçamentos'},
  {slug:'savings',title:'Caixinhas'},
  {slug:'reports',title:'Relatórios'},
];

test.beforeEach(async ({page},testInfo)=>{
  const theme=testInfo.project.name.endsWith('-dark')?'dark':'light';
  await page.addInitScript(value=>localStorage.setItem('pf-theme',value),theme);
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
});

for(const {slug,title} of templates){
  test(`template ${slug} — snapshot fullPage`,async ({page},testInfo)=>{
    const theme=testInfo.project.name.endsWith('-dark')?'dark':'light';
    await page.goto(`/#${slug}`);
    await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
    await expect(page.getByRole('heading',{name:title,level:1,exact:true})).toBeVisible();
    await expect(page.getByRole('navigation',{name:'Navegação principal'}).getByRole('link',{name:new RegExp(title,'i')})).toHaveAttribute('aria-current','page');
    await page.evaluate(()=>document.fonts.ready);
    await page.mouse.move(0,0);
    await expect(page).toHaveScreenshot(`${slug}.png`,{
      fullPage:true,
      animations:'disabled',
      caret:'hide',
    });
  });
}
