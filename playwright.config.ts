import {defineConfig,devices} from '@playwright/test';

const themes=['light','dark'] as const;
const sizes={
  mobile:{width:390,height:844},
  tablet:{width:768,height:1024},
  desktop:{width:1440,height:900},
} as const;

export default defineConfig({
  testDir:'./apps/web/tests/e2e',
  testMatch:'*.spec.ts',
  fullyParallel:true,
  forbidOnly:!!process.env.CI,
  retries:process.env.CI?1:0,
  workers:process.env.CI?1:undefined,
  reporter:process.env.CI?[['list'],['html',{open:'never',outputFolder:'playwright-report'}]]:'list',
  timeout:30_000,
  expect:{
    timeout:10_000,
    toHaveScreenshot:{animations:'disabled',caret:'hide',scale:'css',threshold:0.2,maxDiffPixelRatio:0.002},
  },
  snapshotPathTemplate:'{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  use:{
    baseURL:'http://127.0.0.1:5173',
    channel:process.env.PLAYWRIGHT_CHANNEL||undefined,
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    reducedMotion:'reduce',
    locale:'pt-BR',
    timezoneId:'America/Sao_Paulo',
    deviceScaleFactor:1,
  },
  projects:Object.entries(sizes).flatMap(([size,viewport])=>
    themes.map(theme=>({
      name:`${size}-${theme}`,
      use:{...devices['Desktop Chrome'],viewport,colorScheme:theme,deviceScaleFactor:1},
    }))
  ),
  webServer:process.env.PLAYWRIGHT_EXTERNAL_SERVER?undefined:{
    command:'node apps/web/node_modules/vite/bin/vite.js apps/web --mode test --host 127.0.0.1',
    url:'http://127.0.0.1:5173',
    reuseExistingServer:!process.env.CI,
    timeout:120_000,
  },
});
