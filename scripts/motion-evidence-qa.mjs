import { chromium } from 'playwright-core'
import { build, createServer, preview } from 'vite'
import assert from 'node:assert/strict'

let server
let base = process.env.QA_PUBLIC_URL
if (!base) {
  process.env.GITHUB_PAGES = 'true'
  const skipBuild = process.env.QA_SKIP_BUILD === 'true'
  if (!skipBuild) await build({ logLevel: 'silent' })
  server = skipBuild
    ? await createServer({ server: { host: '127.0.0.1', port: 4179, strictPort: true } })
    : await preview({ preview: { host: '127.0.0.1', port: 4179, strictPort: true } })
  if (skipBuild) await server.listen()
  base = skipBuild ? 'http://127.0.0.1:4179/' : 'http://127.0.0.1:4179/berkeley-humanoid-lite-intro/'
}
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  await page.goto(base, { waitUntil: 'networkidle' })
  const section = page.locator('.motion-evidence')
  await section.scrollIntoViewIfNeeded()
  assert.equal(await section.locator('video').count(), 4)
  assert.equal(await section.locator('video[preload="none"]').count(), 4)
  assert.equal(await section.locator('.motion-record__play').count(), 4)
  await section.screenshot({ path: 'preview-motion-evidence-desktop.png' })
  assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').filter(entry => /robot-motion-\d{2}.*\.mp4/.test(entry.name)).length), 0)
  for (const video of await section.locator('video').all()) {
    assert.match(await video.getAttribute('poster'), /robot-motion-\d{2}-poster(?:-[\w-]+)?\.webp$/)
    assert.match(await video.locator('source').getAttribute('src'), /robot-motion-\d{2}(?:-[\w-]+)?\.mp4$/)
  }
  await page.getByRole('button', { name: '播放实机快速亮相' }).click()
  await page.waitForFunction(() => !document.querySelector('.motion-record video')?.paused)
  await page.getByRole('button', { name: '播放整机动作验证' }).click()
  await page.waitForFunction(() => {
    const videos = [...document.querySelectorAll('.motion-record video')]
    return videos[0].paused && !videos[1].paused
  })
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}`)
  }
  await page.setViewportSize({ width: 390, height: 900 })
  await section.screenshot({ path: 'preview-motion-evidence-mobile.png' })
  assert.deepEqual(errors, [])
  console.log('PASS motion evidence: four self-owned videos, poster-first loading, exclusive playback, and responsive layout')
} finally {
  await browser.close()
  if (server) await server.close()
}
