import {expect,test} from '@playwright/test';

test.beforeEach(async ({page},info)=>{
  const theme=info.project.name.endsWith('-dark')?'dark':'light';
  await page.addInitScript(value=>localStorage.setItem('pf-theme',value),theme);
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
});

for(const {route,button,feedback,name} of [
  {route:'overview',button:'Simular loading do gráfico',feedback:'Carregando fluxo de caixa',name:'chart-loading'},
  {route:'overview',button:'Simular erro do gráfico',feedback:'Erro ao carregar o fluxo de caixa',name:'chart-error'},
  {route:'transactions',button:'Simular loading',feedback:'Carregando movimentações demonstrativas',name:'table-loading'},
  {route:'transactions',button:'Simular erro na tabela',feedback:'Erro ao carregar movimentações',name:'table-error'},
]){
  test(`estado visual ${name}`,async ({page})=>{
    await page.goto(`/#${route}`);
    await page.getByRole('button',{name:button,exact:true}).click();
    await expect(page.getByText(feedback,{exact:true})).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);
    await page.mouse.move(0,0);
    await expect(page).toHaveScreenshot(`state-${name}.png`,{fullPage:true,animations:'disabled',caret:'hide'});
  });
}
