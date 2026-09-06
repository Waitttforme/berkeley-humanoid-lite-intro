import { chromium } from 'playwright-core'
import { build, preview } from 'vite'
import assert from 'node:assert/strict'

let server
let base = process.env.QA_PUBLIC_URL
if (!base) {
  process.env.GITHUB_PAGES = 'true'
  await build({ logLevel: 'silent' })
  server = await preview({ logLevel: 'silent', preview: { host: '127.0.0.1', port: 4175, strictPort: true } })
  base = 'http://127.0.0.1:4175/berkeley-humanoid-lite-intro/'
}
const browser = await chromium.launch({ executablePath: process.env.BHL_CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
const errors = []
const passed = []
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
page.on('pageerror', e => errors.push(e.message))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })
const click = text => page.getByRole('button', { name: text, exact: true }).click()
const phase = async expected => { await page.waitForFunction(p => document.querySelector('#service-console')?.dataset.phase === p, expected) }
const overflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'viewport must not overflow')
try {
  const response = await page.goto(base, { waitUntil: 'networkidle' })
  assert.equal(response.status(), 200)
  await page.screenshot({ path: 'preview-3s-desktop.png', fullPage: true })
  await page.screenshot({ path: 'preview-3s-hero.png' })
  await overflow()
  for (const id of ['thermal', 'can', 'pose']) {
    await page.locator('#scenario').selectOption(id)
    await click('启动巡检'); await phase('running')
    await page.waitForFunction(() => document.querySelector('.metric-heading')?.textContent.includes('2 组'))
    await click(`注入${{ thermal: '关节温升', can: '通信异常', pose: '姿态偏移' }[id]}`); await phase('alert')
    if (id === 'thermal') {
      await page.locator('#service-console').screenshot({ path: 'preview-3s-console.png' })
      await click('查看左膝状态')
      assert.ok((await page.locator('.metric-card').first().innerText()).includes('43.0'))
      await click('查看右膝状态')
    }
    await click('确认暂停任务'); await phase('adjusted')
    await click('生成维护工单'); await phase('ticketed')
    assert.equal(await page.getByRole('button', { name: '执行复检', exact: true }).isDisabled(), true)
    for (const cb of await page.locator('.work-order input').all()) await cb.check()
    await page.getByLabel('复检样本', { exact: true }).selectOption('fault')
    await click('执行复检')
    assert.ok(await page.locator('.failure-note').isVisible())
    await phase('ticketed')
    await page.getByLabel('复检样本', { exact: true }).selectOption('recovered')
    await click('执行复检'); await phase('verified')
    await click('归档并恢复任务'); await phase('closed')
    const downloadPromise = page.waitForEvent('download')
    await click('导出本轮记录')
    const download = await downloadPromise
    const stream = await download.createReadStream()
    let body = ''; for await (const chunk of stream) body += chunk
    const record = JSON.parse(body)
    assert.equal(record.dataSource, 'browser-simulation')
    assert.equal(record.phase, 'closed')
    assert.ok(record.events.some(e => e.message.includes('复检未通过')))
    await click('开始新一轮')
    passed.push(`${id}: fault, task pause, work order, failed recheck, recovery, archive, export`)
  }
  await page.reload({ waitUntil: 'networkidle' })
  assert.ok((await page.locator('.history summary').innerText()).includes('3 条'))
  passed.push('archive persists after reload')
  await click('启动巡检'); await click('无异常，完成常规巡检'); await phase('closed')
  await click('开始新一轮')
  await click('自动演示完整闭环'); await phase('running')
  await click('暂停自动讲解')
  await page.waitForTimeout(3100); await phase('running')
  await click('自动演示完整闭环'); await phase('closed')
  passed.push('normal archive; automatic walkthrough pause/resume and completion')
  await page.getByRole('button', { name: /02 \/ 整机集成/ }).click()
  assert.ok(await page.locator('dialog').isVisible())
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('dialog').isVisible(), false)
  passed.push('evidence photo modal opens and closes via Escape')
  for (const width of [900, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(base, { waitUntil: 'networkidle' })
    await overflow()
    if (width === 390) {
      await page.screenshot({ path: 'preview-3s-mobile.png', fullPage: true })
      await click('打开导航'); await page.getByRole('link', { name: '交互演示', exact: true }).click()
      assert.equal(await page.getByRole('button', { name: '打开导航' }).getAttribute('aria-expanded'), 'false')
      await click('启动巡检'); await click('注入关节温升'); await click('确认暂停任务'); await click('生成维护工单')
      await overflow()
      await page.locator('#service-console').screenshot({ path: 'preview-3s-mobile-console.png' })
    }
    passed.push(`${width}px viewport: no horizontal overflow`)
  }
  await page.goto(`${base}?view=report`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.report-page section').count(), 10)
  await page.emulateMedia({ media: 'print' })
  assert.equal(await page.locator('.report-tools').isVisible(), false)
  await page.emulateMedia({ media: 'screen' })
  await overflow()
  passed.push('technical report: all sections, print layout, mobile')
  await page.goto(`${base}?view=technical#digital-twin`, { waitUntil: 'networkidle' })
  await page.locator('.hero-copy h1').waitFor({ state: 'visible' })
  assert.ok(await page.locator('.hero-copy h1').isVisible())
  assert.equal(new URL(page.url()).searchParams.has('view'), false)
  assert.equal(new URL(page.url()).hash, '#model-studio')
  const legacyTargetBox = await page.locator('#model-studio').boundingBox()
  assert.ok(legacyTargetBox && legacyTargetBox.y >= 0 && legacyTargetBox.y <= 120)
  assert.equal(await page.getByText('进入技术展厅', { exact: true }).count(), 0)
  passed.push('legacy technical exhibition URL redirects to the main digital model')
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ base, passed, errors }, null, 2))
} finally {
  await browser.close()
  if (server) await new Promise(resolve => server.httpServer.close(resolve))
}
