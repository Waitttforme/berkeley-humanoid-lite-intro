import { chromium } from 'playwright-core'
import { build, preview } from 'vite'
import assert from 'node:assert/strict'
let server;let base=process.env.QA_PUBLIC_URL
if(!base){process.env.GITHUB_PAGES='true';await build({logLevel:'silent'});server=await preview({preview:{host:'127.0.0.1',port:4180,strictPort:true}});base='http://127.0.0.1:4180/berkeley-humanoid-lite-intro/'}
const browser=await chromium.launch({executablePath:process.env.BHL_CHROME_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const errors=[]
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}})
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)})
 await page.goto(base,{waitUntil:'networkidle'});await page.locator('#overview').scrollIntoViewIfNeeded()
 await page.waitForFunction(()=>document.querySelector('.studio-canvas')?.dataset.loaded==='true',null,{timeout:120000})
 assert.equal(await page.locator('.studio-canvas canvas').count(),1)
 for(const [id,label] of [['wave','招手'],['squat','下蹲'],['walk','步行'],['combat','战斗'],['attention','立正']]){
  await page.locator('.twin-motion-list').getByRole('button',{name:new RegExp(label)}).click()
  await page.waitForFunction(id=>document.querySelector('.studio-canvas')?.dataset.motion===id,id)
  await page.waitForTimeout(350)
  if(id==='squat')assert.ok(await page.locator('.studio-canvas').evaluate(el=>Math.abs(Number(el.dataset.footError))<.00001))
 }
 await page.getByRole('button',{name:/探索结构/}).click();await page.waitForFunction(()=>document.querySelector('.studio-canvas')?.dataset.exploded==='true')
 await page.waitForFunction(()=>Number(document.querySelector('.studio-canvas')?.dataset.explosionSpread)>.2)
 await page.getByRole('button',{name:/重新组装/}).click();await page.waitForFunction(()=>document.querySelector('.studio-canvas')?.dataset.exploded==='false')
 await page.waitForFunction(()=>Number(document.querySelector('.studio-canvas')?.dataset.explosionSpread)<.005)
 await page.getByRole('button',{name:'暂停动作',exact:true}).click();assert.ok(await page.getByRole('button',{name:'继续动作',exact:true}).isVisible())
 await page.getByRole('button',{name:'重置视角',exact:true}).click()
 assert.equal(await page.evaluate(()=>new Set(performance.getEntriesByType('resource').filter(e=>e.name.includes('/meshes-gzip/')).map(e=>e.name)).size),26)
 await page.locator('#overview').screenshot({path:'preview-studio-desktop.png'})
 for(const width of [768,390,320]){await page.setViewportSize({width,height:950});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
 await page.locator('#overview').screenshot({path:'preview-studio-mobile.png'})
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'})
 await mobile.goto(base,{waitUntil:'networkidle'});await mobile.waitForFunction(()=>document.querySelector('.studio-canvas')?.dataset.loaded==='true',null,{timeout:120000})
 assert.equal(await mobile.locator('.studio-canvas canvas').evaluate(e=>e.style.touchAction),'pan-y')
 await mobile.close()
 const failed=await browser.newPage({viewport:{width:1000,height:900}})
 await failed.route('**/humanoid/**',route=>route.abort())
 await failed.goto(base,{waitUntil:'networkidle'})
 await failed.locator('.twin-error').waitFor({state:'visible'})
 await failed.unroute('**/humanoid/**')
 await failed.getByRole('button',{name:'重试加载',exact:true}).click()
 await failed.waitForFunction(()=>document.querySelector('.studio-canvas')?.dataset.loaded==='true',null,{timeout:120000})
 await failed.close();assert.deepEqual(errors,[])
 console.log('PASS studio: immersive twin stage, 26 compressed meshes, five actions + idle, foot anchoring, explode/reassemble, pause, reset, mobile load and responsive layout')
}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve))}
