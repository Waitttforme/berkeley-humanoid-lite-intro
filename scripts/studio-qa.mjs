import { chromium } from 'playwright-core'
import { build, preview } from 'vite'
import assert from 'node:assert/strict'
let server;let base=process.env.QA_PUBLIC_URL
if(!base){process.env.GITHUB_PAGES='true';await build({logLevel:'silent'});server=await preview({preview:{host:'127.0.0.1',port:4180,strictPort:true}});base='http://127.0.0.1:4180/berkeley-humanoid-lite-intro/'}
const browser=await chromium.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true})
const errors=[]
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}})
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)})
 await page.goto(base,{waitUntil:'networkidle'});await page.locator('#model-studio').scrollIntoViewIfNeeded()
 assert.equal(await page.locator('.studio-canvas canvas').count(),0)
 assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.endsWith('.gz')).length),0)
 await page.getByRole('button',{name:'加载交互模型',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('.studio-canvas')?.dataset.loaded==='true',null,{timeout:120000})
 assert.equal(await page.locator('.studio-canvas canvas').count(),1)
 for(const [id,label] of [['wave','招手'],['squat','下蹲'],['walk','步行'],['combat','姿态展示'],['attention','复位']]){
  await page.locator('.studio-controls').getByRole('button',{name:label,exact:true}).click()
  await page.waitForFunction(id=>document.querySelector('.studio-canvas')?.dataset.motion===id,id)
  await page.waitForTimeout(350)
  assert.ok(await page.locator('.studio-canvas').evaluate(el=>Number(el.dataset.footError)<.00001))
 }
 await page.getByRole('button',{name:'展开结构',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.studio-canvas')?.dataset.exploded==='true')
 await page.getByRole('button',{name:'重新组装',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.studio-canvas')?.dataset.exploded==='false')
 await page.getByRole('button',{name:'暂停动作',exact:true}).click();assert.ok(await page.getByRole('button',{name:'继续动作',exact:true}).isVisible())
 await page.getByRole('button',{name:'重置视角',exact:true}).click()
 assert.equal(await page.evaluate(()=>new Set(performance.getEntriesByType('resource').filter(e=>e.name.includes('/meshes-gzip/')).map(e=>e.name)).size),26)
 for(const name of ['整机视图','侧向视图','拆解视图']){await page.locator('.studio-views').getByRole('button',{name,exact:true}).click();await page.locator('.studio-reference figure img').evaluate(img=>img.decode())}
 await page.locator('#model-studio').screenshot({path:'preview-studio-desktop.png'})
 for(const width of [768,390,320]){await page.setViewportSize({width,height:950});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
 await page.locator('#model-studio').screenshot({path:'preview-studio-mobile.png'})
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'})
 await mobile.goto(base,{waitUntil:'networkidle'});await mobile.getByRole('button',{name:'加载交互模型',exact:true}).click();await mobile.waitForFunction(()=>document.querySelector('.studio-canvas')?.dataset.loaded==='true',null,{timeout:120000})
 assert.equal(await mobile.locator('.studio-canvas canvas').evaluate(e=>e.style.touchAction),'pan-y')
 await mobile.close()
 const failed=await browser.newPage({viewport:{width:1000,height:900}})
 await failed.route('**/humanoid/**',route=>route.abort())
 await failed.goto(base,{waitUntil:'networkidle'});await failed.getByRole('button',{name:'加载交互模型',exact:true}).click()
 await failed.locator('.studio-error').waitFor({state:'visible'})
 await failed.unroute('**/humanoid/**')
 await failed.getByRole('button',{name:'重试加载',exact:true}).click()
 await failed.waitForFunction(()=>document.querySelector('.studio-canvas')?.dataset.loaded==='true',null,{timeout:120000})
 await failed.close();assert.deepEqual(errors,[])
 console.log('PASS studio: lazy loading, 26 compressed meshes, five actions + idle, foot anchoring, explode/reassemble, pause, reset, three renders, mobile load and responsive layout')
}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve))}
