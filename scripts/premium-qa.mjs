import { chromium } from 'playwright-core'
import { build, preview } from 'vite'
import assert from 'node:assert/strict'

// Exercises the typography and motion contract; functional service cases remain
// in competition-qa.mjs. QA_PUBLIC_URL optionally verifies the deployed build.
let server
let base = process.env.QA_PUBLIC_URL
const findings = []
const errors = []
const passed = []
if (!base) {
  process.env.GITHUB_PAGES = 'true'
  await build({ logLevel: 'silent', build: { outDir: 'dist-premium-qa' } })
  server = await preview({ logLevel: 'silent', build: { outDir: 'dist-premium-qa' }, preview: { host: '127.0.0.1', port: 4177, strictPort: true } })
  base = 'http://127.0.0.1:4177/berkeley-humanoid-lite-intro/'
}
const browser = await chromium.launch({ executablePath: process.env.BHL_CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
page.on('pageerror', e => errors.push(e.message))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })

async function inspectLayout(width, label = 'home') {
  await page.setViewportSize({ width, height: 950 })
  await page.evaluate(() => document.fonts.ready)
  const layout = await page.evaluate(() => {
    const failures = []
    const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      const el = node.parentElement
      if (!node.textContent.trim() || !el || el.closest('svg, .hero-backword, .skip-link, [aria-hidden="true"]')) continue
      const range = document.createRange(); range.selectNodeContents(node)
      const rects = [...range.getClientRects()]
      if (!rects.length) continue
      let hidden = false
      for (let a = el; a; a = a.parentElement) {
        const s = getComputedStyle(a)
        if (s.display === 'none' || s.visibility === 'hidden') hidden = true
      }
      if (hidden) continue
      for (const r of rects) {
        if (r.width < 1 || r.height < 1) continue
        if (r.left < -2 || r.right > innerWidth + 2) {
          failures.push({ text: node.textContent.trim().slice(0, 60), reason: 'text outside viewport', left: r.left, right: r.right })
          break
        }
        for (let a = el; a && a.tagName !== 'MAIN'; a = a.parentElement) {
          const s = getComputedStyle(a)
          const ar = a.getBoundingClientRect()
          if (['hidden', 'clip'].includes(s.overflowX) && (r.left < ar.left - 3 || r.right > ar.right + 3)) {
            failures.push({ text: node.textContent.trim().slice(0, 60), reason: 'text horizontally clipped', ancestor: a.className })
            break
          }
          if (['hidden', 'clip'].includes(s.overflowY) && (r.top < ar.top - 3 || r.bottom > ar.bottom + 3)) {
            failures.push({ text: node.textContent.trim().slice(0, 60), reason: 'text vertically clipped', ancestor: a.className })
            break
          }
        }
      }
    }
    return { overflow: document.documentElement.scrollWidth - innerWidth, failures }
  })
  if (layout.overflow > 0 || layout.failures.length) findings.push({ width, label, ...layout })
  else passed.push(`${label} ${width}px: no viewport overflow or clipped text`)
}

try {
  assert.equal((await page.goto(base, { waitUntil: 'networkidle' })).status(), 200)
  await page.evaluate(() => document.fonts.ready)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument')
  const fontUsage = {}
  for (const selector of ['.hero-copy h1', '.hero-description', '.hero-topline', '.metric-card strong']) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector })
    fontUsage[selector] = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts
    assert.ok(fontUsage[selector].length && fontUsage[selector].every(f => f.glyphCount > 0), `${selector} must have rendered glyphs`)
  }
  console.log('Actual rendered fonts:', JSON.stringify(fontUsage, null, 2))
  assert.equal(await page.evaluate(() => document.fonts.status), 'loaded')
  passed.push('font loading complete; CDP confirms actual rendered font glyphs')
  for (const width of [320, 390, 768, 1024, 1440]) await inspectLayout(width)
  const reduced = await page.evaluate(() => ({
    invisibleHeadings: [...document.querySelectorAll('h1,h2,h3')].filter(el => {
      for (let a = el; a; a = a.parentElement) if (getComputedStyle(a).opacity === '0') return true
      return false
    }).map(el => el.textContent),
    runningAnimations: document.getAnimations().filter(a => a.playState === 'running').length,
  }))
  assert.deepEqual(reduced.invisibleHeadings, [], 'reduced motion must not hide headings')
  assert.equal(reduced.runningAnimations, 0, 'reduced motion must disable decorative animation')
  passed.push('reduced-motion preference: content visible and animations stopped')
  await page.screenshot({ path: 'preview-premium-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'preview-premium-mobile.png', fullPage: true })
  await page.goto(`${base}?view=report`, { waitUntil: 'networkidle' })
  for (const width of [320, 390, 768, 1024, 1440]) await inspectLayout(width, 'report')
  console.log('Layout inspection:', JSON.stringify(findings, null, 2))
  await page.getByRole('link', { name: '← 返回展厅' }).click()
  await page.locator('a[href="?view=technical#digital-twin"]').click()
  await page.locator('h1').waitFor({ state: 'visible' })
  assert.ok(await page.locator('h1').isVisible())
  await page.getByRole('link', { name: '← 返回 3S 智慧服务首页' }).click()
  await page.locator('.hero-copy h1').waitFor({ state: 'visible' })
  assert.ok(await page.locator('.hero-copy h1').isVisible())
  passed.push('report and retained technical exhibition navigation')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const hero = page.locator('.hero-visual')
  await hero.scrollIntoViewIfNeeded()
  const box = await hero.boundingBox()
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .3)
  await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.hero-visual')).getPropertyValue('--pointer-x')) > 0)
  await page.mouse.move(1, 1)
  await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.hero-visual')).getPropertyValue('--pointer-x')) === 0)
  passed.push('fine-pointer parallax responds and resets after leaving hero')
  await page.locator('#service-console').scrollIntoViewIfNeeded()
  await page.waitForFunction(() => !document.querySelector('.hero-visual').classList.contains('motion-visible'))
  assert.equal(await hero.evaluate(el => getComputedStyle(el, '::before').animationPlayState), 'paused')
  await page.getByRole('button', { name: '启动巡检', exact: true }).click()
  await page.getByRole('button', { name: '注入关节温升', exact: true }).click()
  const warning = page.locator('.diagnosis.has-fault')
  await warning.scrollIntoViewIfNeeded()
  assert.equal(await warning.evaluate(el => getComputedStyle(el, '::before').animationPlayState), 'running')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  assert.equal(await warning.evaluate(el => getComputedStyle(el, '::before').animationPlayState), 'paused')
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForFunction(() => !document.querySelector('.service-console').classList.contains('motion-visible'))
  assert.equal(await warning.evaluate(el => getComputedStyle(el, '::before').animationPlayState), 'paused')
  passed.push('offscreen hero and warning animations pause; hidden-document handler pauses visible warning')
  const touchPage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await touchPage.goto(base, { waitUntil: 'networkidle' })
  await touchPage.locator('.hero-visual').dispatchEvent('pointermove', { clientX: 300, clientY: 400, pointerType: 'touch' })
  assert.equal(await touchPage.locator('.hero-visual').evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue('--pointer-x'))), 0)
  await touchPage.close()
  passed.push('touch pointer leaves robot parallax static')
  console.log(JSON.stringify({ base, passed, findings, errors }, null, 2))
  assert.deepEqual(findings, [], 'typography must remain within viewport and clipping bounds')
  assert.deepEqual(errors, [], 'no browser or HTTP errors')
} finally {
  await browser.close()
  if (server) await new Promise(resolve => server.httpServer.close(resolve))
}
