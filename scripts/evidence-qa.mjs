import { chromium } from 'playwright-core'
import { build, preview } from 'vite'
import assert from 'node:assert/strict'
let server
let base = process.env.QA_PUBLIC_URL
if (!base) {
  process.env.GITHUB_PAGES = 'true'
  await build({ logLevel: 'silent' })
  server = await preview({ preview: { host: '127.0.0.1', port: 4178, strictPort: true } })
  base = 'http://127.0.0.1:4178/berkeley-humanoid-lite-intro/'
}
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.locator('.evidence-card').first().waitFor()
  assert.equal(await page.locator('.evidence-card').count(), 8)
  const paths = new Set()
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    for (const card of await page.locator('.evidence-card').all()) {
      await card.scrollIntoViewIfNeeded()
      await card.locator('img').evaluate(img => img.decode())
      paths.add(await card.locator('img').getAttribute('src'))
      await card.click()
      const modal = page.locator('.photo-dialog')
      await modal.waitFor({ state: 'visible' })
      await modal.locator('img').evaluate(img => img.decode())
      assert.ok((await modal.locator('img').getAttribute('src')).includes('-1280.webp'))
      await page.keyboard.press('Escape')
      await modal.waitFor({ state: 'hidden' })
      assert.equal(await card.evaluate(el => document.activeElement === el), true)
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}`)
  }
  assert.equal(paths.size, 8)
  assert.deepEqual(errors, [])
  console.log('PASS: 8 unique photos, thumbnails and full-size images load, modal closes/restores focus; 1440/768/390/320px no overflow')
} finally {
  await browser.close()
  if (server) await new Promise(resolve => server.httpServer.close(resolve))
}
