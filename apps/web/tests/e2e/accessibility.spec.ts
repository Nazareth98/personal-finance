import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages=['overview','transactions','accounts','cards','budgets','savings','reports'];
for(const slug of pages){
  test(`WCAG A/AA no template ${slug}`,async ({page})=>{
    await page.goto(`/#${slug}`);
    await expect(page.locator('main h1')).toBeVisible();
    const scan=await new AxeBuilder({page})
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])
      .analyze();
    expect(scan.violations,JSON.stringify(scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),null,2)).toEqual([]);
  });
}
