import { chromium } from 'playwright-core'
import { build, preview } from 'vite'
import assert from 'node:assert/strict'

let server
let base = process.env.QA_PUBLIC_URL
if (!base) {
  process.env.GITHUB_PAGES = 'true'
  await build({ logLevel: 'silent' })
  server = await preview({ preview: { host: '127.0.0.1', port: 4180, strictPort: true } })
  base = 'http://127.0.0.1:4180/berkeley-humanoid-lite-intro/'
}

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
})
const errors = []

const waitForModel = async (page) => {
  await page.locator('#model-studio').scrollIntoViewIfNeeded()
  await page.locator('.twin-loader').waitFor({ state: 'detached', timeout: 120000 })
  await page.locator('.viewer canvas').waitFor({ state: 'visible' })
  await page.waitForFunction(() => Number(document.querySelector('.viewer')?.dataset.modelHeight) > 0.5)
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`)
  })
  await page.goto(base, { waitUntil: 'networkidle' })
  await waitForModel(page)

  assert.equal(await page.locator('.viewer canvas').count(), 1)
  assert.equal(await page.locator('.twin-motion-list button').count(), 6)
  assert.equal(await page.locator('.twin-poster.is-hidden').count(), 1)

  for (const label of ['招手', '下蹲', '步行', '姿态展示', '复位']) {
    const button = page.locator('.twin-motion-list').getByRole('button', { name: new RegExp(label) })
    await button.click()
    await page.waitForFunction(
      (accessibleName) => [...document.querySelectorAll('.twin-motion-list button')]
        .some((element) => element.getAttribute('aria-pressed') === 'true' && element.textContent?.includes(accessibleName)),
      label,
    )
    await page.waitForTimeout(350)
    if (label === '下蹲') {
      assert.ok(await page.locator('.viewer').evaluate((element) => Math.abs(Number(element.dataset.footError)) < 0.00001))
    }
  }

  await page.getByRole('button', { name: /探索结构/ }).click()
  await page.locator('#model-studio.is-exploded').waitFor()
  await page.getByRole('button', { name: /重新组装/ }).click()
  await page.locator('#model-studio:not(.is-exploded)').waitFor()

  assert.ok(Number(await page.locator('.viewer').getAttribute('data-camera-distance')) > 0)
  await page.getByRole('button', { name: '重置视角', exact: true }).click()
  await page.waitForTimeout(250)
  assert.ok(Number(await page.locator('.viewer').getAttribute('data-camera-distance')) > 0)

  const compressedMeshes = await page.evaluate(() => new Set(
    performance.getEntriesByType('resource')
      .filter((entry) => entry.name.includes('/meshes-gzip/'))
      .map((entry) => entry.name),
  ).size)
  assert.equal(compressedMeshes, 26)
  assert.equal(await page.getByText(/55\s*秒系统展演/).count(), 0)
  assert.equal(await page.getByRole('button', { name: /暂停动作|继续动作/ }).count(), 0)

  await page.locator('#model-studio').screenshot({ path: 'preview-studio-desktop.png' })
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  }
  await page.locator('#model-studio').screenshot({ path: 'preview-studio-mobile.png' })

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  })
  await mobile.goto(base, { waitUntil: 'networkidle' })
  await waitForModel(mobile)
  assert.equal(await mobile.locator('.viewer canvas').evaluate((element) => element.style.touchAction), 'pan-y')
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await mobile.close()

  assert.deepEqual(errors, [])
  console.log('PASS studio: original classmate viewer, 26 compressed meshes, six motions, foot anchoring, explode/reassemble, reset, reduced-motion touch support, responsive layout, and no autoplay showcase')
} finally {
  await browser.close()
  if (server) await new Promise((resolve) => server.httpServer.close(resolve))
}
