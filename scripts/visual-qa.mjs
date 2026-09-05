import { chromium } from 'playwright-core'
import { build, preview } from 'vite'

await build({ logLevel: 'silent' })
const server = await preview({
  logLevel: 'silent',
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
})
const baseUrl = 'http://127.0.0.1:4174/?view=technical'
const MODEL_TIMEOUT = 120_000
const IOT_LAYER_EXPECTATIONS = [
  { id: 'sense', label: '感知层', title: '可靠感知', metric: '22 AXES', step: 'STEP 01 / 05' },
  { id: 'control', label: '控制层', title: '嵌入式节点', metric: 'STM32', step: 'STEP 02 / 05' },
  { id: 'bus', label: '网络层', title: '四路 CAN', metric: '4 × CAN', step: 'STEP 03 / 05' },
  { id: 'edge', label: '边缘层', title: '计算留在机器人本体', metric: 'INTEL N95', step: 'STEP 04 / 05' },
  { id: 'twin', label: '展示层', title: '浏览器', metric: 'URDF + STL', step: 'STEP 05 / 05' },
]
const SERVICE_SCENARIO_EXPECTATIONS = [
  { id: 'normal', label: '常规巡检', terminal: 'monitoring', diagnosis: '各项指标处于演示阈值内' },
  { id: 'thermal', label: '关节温升', terminal: 'diagnosed', diagnosis: '持续温升触发关节热风险' },
  { id: 'can', label: 'CAN 波动', terminal: 'diagnosed', diagnosis: '通信丢包触发支路异常' },
  { id: 'pose', label: '姿态偏移', terminal: 'diagnosed', diagnosis: '机身倾角触发稳定性风险' },
]
const GUIDE_EXPECTATIONS = [
  { id: 'core', label: '核心机身', focus: 'FOCUS / CORE' },
  { id: 'leftArm', label: '左臂', focus: 'FOCUS / LEFTARM' },
  { id: 'rightArm', label: '右臂', focus: 'FOCUS / RIGHTARM' },
  { id: 'leftLeg', label: '左腿', focus: 'FOCUS / LEFTLEG' },
  { id: 'rightLeg', label: '右腿', focus: 'FOCUS / RIGHTLEG' },
]

const browser = await chromium.launch({
  executablePath:
    process.env.BHL_CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
})

const errors = []
const makePage = async (viewport) => {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`[console] ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`[pageerror] ${error.stack || error.message}`))
  page.on('requestfailed', (request) => {
    const isExpectedAbort = request.failure()?.errorText?.includes('ERR_ABORTED')
      && /\.mp4(?:$|[?#])/i.test(request.url())
    if (!isExpectedAbort && !request.url().includes('fonts.googleapis.com') && !request.url().includes('fonts.gstatic.com')) {
      errors.push(`[requestfailed] ${request.url()} — ${request.failure()?.errorText}`)
    }
  })
  return page
}

const waitForDigitalTwin = async (targetPage) => {
  const lab = targetPage.locator('.digital-twin-lab')
  await lab.waitFor({ state: 'attached', timeout: MODEL_TIMEOUT })
  await targetPage.waitForFunction(
    () => document.querySelector('.digital-twin-lab')?.getAttribute('data-model-loaded') === 'true',
    undefined,
    { timeout: MODEL_TIMEOUT },
  )
  await targetPage.locator('.twin-viewer canvas').waitFor({ state: 'visible', timeout: MODEL_TIMEOUT })
  await targetPage.waitForTimeout(400)
  return lab
}

const readModelReport = (targetPage) => targetPage.evaluate(() => {
  const lab = document.querySelector('.digital-twin-lab')
  const canvas = document.querySelector('.twin-viewer canvas')
  const canvasRect = canvas?.getBoundingClientRect()
  const resourcePaths = performance.getEntriesByType('resource').map((entry) => {
    try {
      return new URL(entry.name).pathname
    } catch {
      return entry.name
    }
  })
  const stlPaths = [...new Set(resourcePaths.filter((path) => path.endsWith('.stl')))]
  const motionButtons = [...document.querySelectorAll('.motion-list button')]

  return {
    loaded: lab?.getAttribute('data-model-loaded') === 'true',
    errorVisible: Boolean(document.querySelector('.twin-error')),
    canvasCount: document.querySelectorAll('.twin-viewer canvas').length,
    canvas: canvas ? {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvasRect?.width,
      clientHeight: canvasRect?.height,
      accessibleName: canvas.getAttribute('aria-label'),
    } : null,
    urdfRequested: resourcePaths.some((path) => path.endsWith('/berkeley_humanoid_lite.urdf')),
    uniqueStlRequestCount: stlPaths.length,
    motionButtonCount: motionButtons.length,
    motionButtonsEnabled: motionButtons.every((button) => !button.disabled),
    caption: document.querySelector('.twin-stage__caption strong')?.textContent?.trim(),
  }
})

const page = await makePage({ width: 1440, height: 1050 })
const response = await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.locator('[data-reveal]').evaluateAll((elements) => elements.forEach((element) => {
  element.classList.add('is-visible')
  element.dataset.revealed = 'true'
}))
await page.waitForTimeout(800)
await page.screenshot({ path: 'preview-desktop.png', fullPage: true })
await page.locator('.hero').screenshot({ path: 'preview-hero.png' })
await page.locator('.manifesto').screenshot({ path: 'preview-manifesto.png' })
await page.locator('.smart-service-section').screenshot({ path: 'preview-smart-service-standby.png' })
await page.locator('.capabilities-section').screenshot({ path: 'preview-capabilities.png' })
await page.locator('.design-section').screenshot({ path: 'preview-design.png' })
await page.locator('.actuator-section').screenshot({ path: 'preview-actuator.png' })
await page.locator('.morphology-section').screenshot({ path: 'preview-morphology.png' })
for (let index = 0; index < 4; index += 1) {
  await page.locator('.morph-tabs button').nth(index).click()
  await page.locator('.morphology-stage').screenshot({ path: `preview-morphology-${index + 1}.png` })
}
await page.locator('.morph-tabs button').first().click()
await page.locator('.stack-section').screenshot({ path: 'preview-stack.png' })
await page.locator('.build-section').screenshot({ path: 'preview-build.png' })
await page.locator('.safety-interlude').screenshot({ path: 'preview-safety.png' })
await page.locator('.site-footer').screenshot({ path: 'preview-footer.png' })

await page.locator('.digital-twin-section').scrollIntoViewIfNeeded()
await waitForDigitalTwin(page)
const desktopModel = await readModelReport(page)
await page.locator('.digital-twin-lab').screenshot({ path: 'preview-digital-twin.png' })

const waveButton = page.getByRole('group', { name: '机器人动作选择' }).getByRole('button', { name: /招手/ })
await waveButton.click()
await page.waitForFunction(
  () => document.querySelector('.twin-stage__head small')?.textContent?.includes('WAVE SEQUENCE'),
)
const motionState = {
  sequence: await page.locator('.twin-stage__head small').textContent(),
  activeButton: await page.locator('.motion-list button.is-active').textContent(),
}

const explodeButton = page.locator('.twin-control-deck__head > button')
await explodeButton.click()
await page.waitForFunction(
  () => document.querySelector('.twin-stage__head small')?.textContent?.includes('ASSEMBLY / EXPLODED'),
)
const explodedState = {
  status: await page.locator('.twin-stage__head small').textContent(),
  caption: await page.locator('.twin-stage__caption strong').textContent(),
  buttonText: await explodeButton.textContent(),
  buttonActive: await explodeButton.evaluate((button) => button.classList.contains('is-active')),
}

await explodeButton.click()
await page.waitForFunction(
  () => document.querySelector('.twin-stage__head small')?.textContent?.includes('RESET SEQUENCE'),
)
const restoredState = {
  status: await page.locator('.twin-stage__head small').textContent(),
  caption: await page.locator('.twin-stage__caption strong').textContent(),
  buttonText: await explodeButton.textContent(),
  buttonActive: await explodeButton.evaluate((button) => button.classList.contains('is-active')),
}

const resetViewButton = page.getByRole('button', { name: '重置三维视角' })
const resetViewEnabled = await resetViewButton.isEnabled()
await resetViewButton.click()
const resetViewState = {
  enabled: resetViewEnabled,
  modelStillLoaded: await page.locator('.digital-twin-lab').getAttribute('data-model-loaded'),
  canvasStillVisible: await page.locator('.twin-viewer canvas').isVisible(),
}

const guideButtons = page.locator('.twin-guide__list > button')
const guideButtonCount = await guideButtons.count()
const guideStates = []
for (let index = 0; index < GUIDE_EXPECTATIONS.length; index += 1) {
  const expected = GUIDE_EXPECTATIONS[index]
  const button = guideButtons.nth(index)
  await button.click()
  await page.waitForFunction(
    ({ buttonIndex, label, focus }) => {
      const buttons = [...document.querySelectorAll('.twin-guide__list > button')]
      return buttons[buttonIndex]?.classList.contains('is-active')
        && buttons[buttonIndex]?.getAttribute('aria-pressed') === 'true'
        && document.querySelector('.twin-guide__detail strong')?.textContent?.includes(label)
        && document.querySelector('.twin-guide__detail small')?.textContent?.includes(focus)
    },
    { buttonIndex: index, label: expected.label, focus: expected.focus },
  )
  guideStates.push(await page.evaluate((buttonIndex) => {
    const buttons = [...document.querySelectorAll('.twin-guide__list > button')]
    const buttonElement = buttons[buttonIndex]
    return {
      buttonText: buttonElement?.textContent?.replace(/\s+/g, ' ').trim(),
      active: buttonElement?.classList.contains('is-active'),
      ariaPressed: buttonElement?.getAttribute('aria-pressed'),
      activeButtonCount: buttons.filter((item) => item.classList.contains('is-active')).length,
      pressedButtonCount: buttons.filter((item) => item.getAttribute('aria-pressed') === 'true').length,
      focus: document.querySelector('.twin-guide__detail small')?.textContent?.trim(),
      title: document.querySelector('.twin-guide__detail strong')?.textContent?.trim(),
    }
  }, index))
}
await page.locator('.twin-guide').screenshot({ path: 'preview-structure-guide.png' })

await page.locator('.anatomy-item').nth(2).click()
const activeAnatomy = await page.locator('.anatomy-item.is-active h3').textContent()
const anatomyStageVisibleAfterInteraction = await page.locator('.anatomy-stage').evaluate((element) => (
  Number.parseFloat(getComputedStyle(element).opacity) > 0.9
))
await page.locator('.stack-node').nth(4).click()
const activeStack = await page.locator('.stack-console__copy h3').textContent()
const stackConsoleVisibleAfterInteraction = await page.locator('.stack-console').evaluate((element) => (
  Number.parseFloat(getComputedStyle(element).opacity) > 0.9
))
await page.locator('.morph-tabs button').nth(1).click()
const activeMorphology = await page.locator('.morphology-stage__name').textContent()
await page.locator('.deep-dive summary').click()
const deepDiveOpen = await page.locator('.deep-dive').evaluate((element) => element.open)

await page.locator('.iot-showcase-section').scrollIntoViewIfNeeded()
const iotTabs = page.getByRole('tablist', { name: '物联网系统分层' }).getByRole('tab')
const iotTabCount = await iotTabs.count()
const iotLayerStates = []
for (let index = 0; index < IOT_LAYER_EXPECTATIONS.length; index += 1) {
  const expected = IOT_LAYER_EXPECTATIONS[index]
  await iotTabs.nth(index).click()
  await page.waitForFunction(
    ({ tabIndex, layerId, title, metric }) => {
      const tabs = [...document.querySelectorAll('.iot-node-rail [role="tab"]')]
      const consoleElement = document.querySelector('.iot-layer-console')
      return tabs[tabIndex]?.getAttribute('aria-selected') === 'true'
        && consoleElement?.classList.contains(`is-layer-${layerId}`)
        && consoleElement?.querySelector('.iot-layer-console__copy h3')?.textContent?.includes(title)
        && consoleElement?.querySelector('.iot-layer-console__evidence strong')?.textContent?.includes(metric)
    },
    { tabIndex: index, layerId: expected.id, title: expected.title, metric: expected.metric },
  )
  iotLayerStates.push(await page.evaluate((tabIndex) => {
    const tabs = [...document.querySelectorAll('.iot-node-rail [role="tab"]')]
    const consoleElement = document.querySelector('.iot-layer-console')
    return {
      tabText: tabs[tabIndex]?.textContent?.replace(/\s+/g, ' ').trim(),
      ariaSelected: tabs[tabIndex]?.getAttribute('aria-selected'),
      selectedTabCount: tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true').length,
      consoleClass: consoleElement?.className,
      step: consoleElement?.querySelector('.iot-layer-console__copy > small')?.textContent?.trim(),
      title: consoleElement?.querySelector('.iot-layer-console__copy h3')?.textContent?.trim(),
      metric: consoleElement?.querySelector('.iot-layer-console__evidence strong')?.textContent?.trim(),
    }
  }, index))
}
await page.locator('.iot-architecture').screenshot({ path: 'preview-iot-architecture.png' })
const iotArchitectureVisibleAfterInteraction = await page.locator('.iot-architecture').evaluate((element) => (
  Number.parseFloat(getComputedStyle(element).opacity) > 0.9
))

await page.locator('.smart-service-section').scrollIntoViewIfNeeded()
const serviceConsole = page.locator('.smart-service-console')
const serviceTabs = page.getByRole('tablist', { name: '3S 智慧服务场景' }).getByRole('tab')
const serviceTabCount = await serviceTabs.count()
const serviceScenarioStates = []
for (let index = 0; index < SERVICE_SCENARIO_EXPECTATIONS.length; index += 1) {
  const expected = SERVICE_SCENARIO_EXPECTATIONS[index]
  await serviceTabs.nth(index).click()
  const standby = await serviceConsole.getAttribute('data-state')
  await page.locator('.service-primary').click()
  const sampling = await serviceConsole.getAttribute('data-state')
  await page.waitForFunction(
    ({ scenarioId, terminal }) => {
      const consoleElement = document.querySelector('.smart-service-console')
      return consoleElement?.getAttribute('data-scenario') === scenarioId
        && consoleElement?.getAttribute('data-state') === terminal
    },
    { scenarioId: expected.id, terminal: expected.terminal },
    { timeout: 5_000 },
  )
  const terminal = await serviceConsole.getAttribute('data-state')
  const diagnosis = await page.locator('.service-diagnosis h3').textContent()
  if (expected.id === 'thermal') {
    await page.locator('.smart-service-section').screenshot({ path: 'preview-smart-service.png' })
  }

  let ticketed = null
  let verifying = null
  let closed = null
  let ticket = null
  if (expected.id === 'normal') {
    await page.locator('.service-primary').click()
    closed = await serviceConsole.getAttribute('data-state')
    ticket = await page.locator('.service-ticket small').textContent()
  } else {
    await page.locator('.service-primary').click()
    ticketed = await serviceConsole.getAttribute('data-state')
    ticket = await page.locator('.service-ticket small').textContent()
    await page.locator('.service-primary').click()
    verifying = await serviceConsole.getAttribute('data-state')
    await page.waitForFunction(
      () => document.querySelector('.smart-service-console')?.getAttribute('data-state') === 'closed',
      undefined,
      { timeout: 5_000 },
    )
    closed = await serviceConsole.getAttribute('data-state')
  }

  serviceScenarioStates.push({
    id: expected.id,
    standby,
    sampling,
    terminal,
    diagnosis: diagnosis?.trim(),
    ticketed,
    verifying,
    closed,
    ticket: ticket?.trim(),
    selectedCount: await serviceTabs.evaluateAll((tabs) => tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true').length),
  })
}
await page.locator('.service-reset').click()
const serviceResetState = {
  scenario: await serviceConsole.getAttribute('data-scenario'),
  state: await serviceConsole.getAttribute('data-state'),
  ticket: await page.locator('.service-ticket small').textContent(),
}

const truthLabels = await page.evaluate(() => {
  const read = (selector) => {
    const element = document.querySelector(selector)
    const rect = element?.getBoundingClientRect()
    return {
      text: element?.textContent?.replace(/\s+/g, ' ').trim(),
      visible: Boolean(rect && rect.width > 0 && rect.height > 0),
    }
  }
  return {
    digitalTwin: read('.twin-truth-note'),
    modelSource: read('.twin-source'),
    iotArchitecture: read('.iot-architecture__truth'),
    smartService: read('.service-truth-bar'),
  }
})

const showcaseButton = page.locator('.header-showcase')
const showcaseButtonText = await showcaseButton.textContent()
await showcaseButton.click()
const showcaseDock = page.getByRole('complementary', { name: '比赛展演控制' })
await showcaseDock.waitFor({ state: 'visible' })
await page.waitForFunction(
  () => document.querySelector('.presentation-dock__status strong')?.textContent?.includes('01 / 平台定位'),
)
const showcaseStarted = await page.evaluate(() => ({
  status: document.querySelector('.presentation-dock__status strong')?.textContent?.trim(),
  note: document.querySelector('.presentation-dock__status small')?.textContent?.trim(),
  paused: document.querySelector('.presentation-dock')?.classList.contains('is-paused'),
  activeStepCount: document.querySelectorAll('.presentation-dock__steps .is-active').length,
  doneStepCount: document.querySelectorAll('.presentation-dock__steps .is-done').length,
  totalStepCount: document.querySelectorAll('.presentation-dock__steps i').length,
  actionCount: document.querySelectorAll('.presentation-dock__actions button').length,
}))
await page.screenshot({ path: 'preview-showcase.png', fullPage: false })

await page.getByRole('button', { name: '暂停自动展演' }).click()
await page.waitForFunction(
  () => document.querySelector('.presentation-dock')?.classList.contains('is-paused')
    && document.querySelector('.presentation-dock__actions button')?.getAttribute('aria-label') === '继续自动展演',
)
const showcasePaused = await page.evaluate(() => ({
  status: document.querySelector('.presentation-dock__status strong')?.textContent?.trim(),
  paused: document.querySelector('.presentation-dock')?.classList.contains('is-paused'),
  toggleLabel: document.querySelector('.presentation-dock__actions button')?.getAttribute('aria-label'),
}))

await page.getByRole('button', { name: '继续自动展演' }).click()
await page.waitForFunction(
  () => !document.querySelector('.presentation-dock')?.classList.contains('is-paused')
    && document.querySelector('.presentation-dock__actions button')?.getAttribute('aria-label') === '暂停自动展演',
)
const showcaseContinued = await page.evaluate(() => ({
  status: document.querySelector('.presentation-dock__status strong')?.textContent?.trim(),
  paused: document.querySelector('.presentation-dock')?.classList.contains('is-paused'),
  toggleLabel: document.querySelector('.presentation-dock__actions button')?.getAttribute('aria-label'),
}))

await page.getByRole('button', { name: '暂停自动展演' }).click()
await page.waitForFunction(
  () => document.querySelector('.presentation-dock')?.classList.contains('is-paused'),
)
await page.getByRole('button', { name: '进入下一个展演章节' }).click()
await page.waitForFunction(
  () => document.querySelector('.presentation-dock__status strong')?.textContent?.includes('02 / 信号链路'),
)
const showcaseNext = await page.evaluate(() => ({
  status: document.querySelector('.presentation-dock__status strong')?.textContent?.trim(),
  paused: document.querySelector('.presentation-dock')?.classList.contains('is-paused'),
  activeStepCount: document.querySelectorAll('.presentation-dock__steps .is-active').length,
  doneStepCount: document.querySelectorAll('.presentation-dock__steps .is-done').length,
}))

await page.screenshot({ path: 'preview-showcase-02.png', fullPage: false })
for (let targetIndex = 2; targetIndex < 8; targetIndex += 1) {
  await page.getByRole('button', { name: '进入下一个展演章节' }).click()
  await page.waitForFunction(
    (expectedIndex) => document.querySelectorAll('.presentation-dock__steps .is-done').length === expectedIndex,
    targetIndex,
  )
  await page.waitForTimeout(700)
  await page.screenshot({ path: `preview-showcase-${String(targetIndex + 1).padStart(2, '0')}.png`, fullPage: false })
}

await page.getByRole('button', { name: '继续自动展演' }).click()
await page.waitForFunction(
  () => document.querySelector('.presentation-dock')?.classList.contains('is-complete'),
  undefined,
  { timeout: 10_000 },
)
const showcaseComplete = await page.evaluate(() => ({
  status: document.querySelector('.presentation-dock__status strong')?.textContent?.trim(),
  complete: document.querySelector('.presentation-dock')?.classList.contains('is-complete'),
  replayLabel: document.querySelector('.presentation-dock__actions button')?.getAttribute('aria-label'),
  nextDisabled: document.querySelectorAll('.presentation-dock__actions button')[1]?.disabled,
  buildTop: Math.round(document.querySelector('.build-section')?.getBoundingClientRect().top ?? -1),
}))
await page.screenshot({ path: 'preview-showcase-complete.png', fullPage: false })

await page.getByRole('button', { name: '重新播放比赛展演' }).click()
await page.waitForFunction(
  () => document.querySelector('.presentation-dock__status strong')?.textContent?.includes('01 / 平台定位')
    && !document.querySelector('.presentation-dock')?.classList.contains('is-complete'),
)
const showcaseReplayed = await page.evaluate(() => ({
  status: document.querySelector('.presentation-dock__status strong')?.textContent?.trim(),
  complete: document.querySelector('.presentation-dock')?.classList.contains('is-complete'),
  paused: document.querySelector('.presentation-dock')?.classList.contains('is-paused'),
}))

await page.getByRole('button', { name: '退出比赛展演' }).click()
await showcaseDock.waitFor({ state: 'detached' })
const showcaseExited = await page.locator('.presentation-dock').count() === 0

await showcaseButton.click()
await showcaseDock.waitFor({ state: 'visible' })
await page.keyboard.press('Escape')
await showcaseDock.waitFor({ state: 'detached' })
const showcaseEscapeExited = await page.locator('.presentation-dock').count() === 0

const desktopReport = await page.evaluate(() => ({
  title: document.title,
  status: document.readyState,
  rootChildren: document.querySelector('#root')?.children.length,
  rootTextLength: document.querySelector('#root')?.textContent?.length,
  bodyHeight: document.body.scrollHeight,
  bodyWidth: document.body.scrollWidth,
  documentWidth: document.documentElement.scrollWidth,
  viewportWidth: window.innerWidth,
  heroImageLoaded: document.querySelector('.hero-robot img')?.complete,
  videoReady: document.querySelector('.walk-film video')?.readyState,
}))

const mobile = await makePage({ width: 390, height: 844 })
await mobile.goto(baseUrl, { waitUntil: 'networkidle' })
await mobile.locator('[data-reveal]').evaluateAll((elements) => elements.forEach((element) => {
  element.classList.add('is-visible')
  element.dataset.revealed = 'true'
}))
await mobile.waitForTimeout(800)
await mobile.screenshot({ path: 'preview-mobile.png', fullPage: false })
await mobile.locator('.smart-service-console').screenshot({ path: 'preview-mobile-smart-service.png' })
await mobile.locator('.capabilities-section').screenshot({ path: 'preview-mobile-capabilities.png' })
await mobile.locator('.anatomy-layout').screenshot({ path: 'preview-mobile-anatomy.png' })
await mobile.locator('.build-section').screenshot({ path: 'preview-mobile-build.png' })
const closedMenuItemVisible = await mobile.locator('.site-nav button').first().isVisible()
await mobile.locator('.menu-toggle').click()
const mobileMenuOpen = await mobile.locator('.site-nav').evaluate((element) => element.classList.contains('is-open'))
await mobile.waitForFunction(() => document.activeElement === document.querySelector('.site-nav button'))
const menuFocusedItem = await mobile.evaluate(() => document.activeElement?.textContent?.replace(/\s+/g, ' ').trim())
await mobile.keyboard.press('Escape')
const menuClosedAfterEscape = await mobile.locator('.site-nav').evaluate((element) => !element.classList.contains('is-open'))
const focusReturnedToToggle = await mobile.locator('.menu-toggle').evaluate((element) => document.activeElement === element)

await mobile.locator('.digital-twin-section').scrollIntoViewIfNeeded()
await mobile.locator('.twin-gate').waitFor({ state: 'visible', timeout: 30_000 })
await mobile.waitForFunction(
  () => {
    const poster = document.querySelector('.twin-gate img')
    return poster?.complete && poster.naturalWidth > 0
  },
  undefined,
  { timeout: 30_000 },
)
const mobileGateReport = await mobile.evaluate(() => {
  const poster = document.querySelector('.twin-gate img')
  const posterRect = poster?.getBoundingClientRect()
  const modelResources = performance.getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((url) => /\/humanoid\/.*(?:\.urdf|\.stl)(?:$|[?#])/i.test(url))
  return {
    loadedBeforeActivation: document.querySelector('.digital-twin-lab')?.getAttribute('data-model-loaded'),
    canvasCountBeforeActivation: document.querySelectorAll('.twin-viewer canvas').length,
    modelRequestCountBeforeActivation: modelResources.length,
    poster: poster ? {
      complete: poster.complete,
      naturalWidth: poster.naturalWidth,
      naturalHeight: poster.naturalHeight,
      width: posterRect?.width,
      height: posterRect?.height,
      alt: poster.alt,
    } : null,
    launchButtonVisible: Boolean(document.querySelector('.twin-gate button')?.getBoundingClientRect().width),
    launchButtonText: document.querySelector('.twin-gate button')?.textContent?.replace(/\s+/g, ' ').trim(),
  }
})
await mobile.locator('.digital-twin-lab').screenshot({ path: 'preview-mobile-3d-poster.png' })

await mobile.getByRole('button', { name: /启动 3D 展示/ }).click()
await waitForDigitalTwin(mobile)
const mobileModel = await readModelReport(mobile)
const mobileInteractionToggle = mobile.locator('.twin-interaction-toggle')
const mobileInteractionInitial = {
  visible: await mobileInteractionToggle.isVisible(),
  pressed: await mobileInteractionToggle.getAttribute('aria-pressed'),
  text: await mobileInteractionToggle.textContent(),
  canvasTouchAction: await mobile.locator('.twin-viewer canvas').evaluate((canvas) => canvas.style.touchAction),
}
await mobile.locator('.digital-twin-lab').screenshot({ path: 'preview-mobile-3d.png' })
await mobileInteractionToggle.click()
const mobileInteractionActive = {
  pressed: await mobileInteractionToggle.getAttribute('aria-pressed'),
  text: await mobileInteractionToggle.textContent(),
  canvasTouchAction: await mobile.locator('.twin-viewer canvas').evaluate((canvas) => canvas.style.touchAction),
}
await mobileInteractionToggle.click()
const mobileInteractionExited = {
  pressed: await mobileInteractionToggle.getAttribute('aria-pressed'),
  text: await mobileInteractionToggle.textContent(),
  canvasTouchAction: await mobile.locator('.twin-viewer canvas').evaluate((canvas) => canvas.style.touchAction),
}

const mobileReport = await mobile.evaluate(() => ({
  bodyHeight: document.body.scrollHeight,
  bodyWidth: document.body.scrollWidth,
  documentWidth: document.documentElement.scrollWidth,
  viewportWidth: window.innerWidth,
  heroHeading: document.querySelector('.hero h1')?.textContent?.replace(/\s+/g, ' ').trim(),
  heroImage: document.querySelector('.hero-robot img')?.getBoundingClientRect().toJSON(),
  visibleMetricCount: [...document.querySelectorAll('.hero-metric')].filter((element) => {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }).length,
}))

const assertions = {
  sourceSectionRemoved: await page.locator('#source, .source-section').count() === 0,
  httpOk: response?.status() === 200,
  titleUpdated: desktopReport.title.includes('Berkeley Humanoid Lite'),
  heroMediaLoaded: desktopReport.heroImageLoaded === true && desktopReport.videoReady >= 2,
  anatomyInteractionWorks: activeAnatomy?.includes('CAN 2.0'),
  interactiveExhibitsRemainVisible: anatomyStageVisibleAfterInteraction === true
    && stackConsoleVisibleAfterInteraction === true
    && iotArchitectureVisibleAfterInteraction === true,
  stackInteractionWorks: activeStack?.includes('机器人本体'),
  morphologyInteractionWorks: activeMorphology?.includes('四足'),
  deepDiveOpens: deepDiveOpen === true,
  desktopModelLoads: desktopModel.loaded === true
    && desktopModel.errorVisible === false
    && desktopModel.urdfRequested === true
    && desktopModel.uniqueStlRequestCount === 26
    && desktopModel.caption === '22-JOINT MODEL LOADED',
  desktopCanvasRenders: desktopModel.canvasCount === 1
    && desktopModel.canvas?.width > 0
    && desktopModel.canvas?.height > 0
    && desktopModel.canvas?.clientWidth > 0
    && desktopModel.canvas?.clientHeight > 0
    && desktopModel.canvas?.accessibleName?.includes('Berkeley Humanoid Lite'),
  motionButtonsReady: desktopModel.motionButtonCount === 5 && desktopModel.motionButtonsEnabled === true,
  motionButtonInteractionWorks: motionState.sequence?.includes('WAVE SEQUENCE')
    && motionState.activeButton?.includes('招手'),
  explodedViewWorks: explodedState.status?.includes('ASSEMBLY / EXPLODED')
    && explodedState.caption?.includes('EXPLODED ASSEMBLY')
    && explodedState.buttonText?.includes('重新组装')
    && explodedState.buttonActive === true,
  explodedViewRestores: restoredState.status?.includes('RESET SEQUENCE')
    && restoredState.caption?.includes('22-JOINT MODEL LOADED')
    && restoredState.buttonText?.includes('展开结构')
    && restoredState.buttonActive === false,
  resetViewWorks: resetViewState.enabled === true
    && resetViewState.modelStillLoaded === 'true'
    && resetViewState.canvasStillVisible === true,
  structureGuideHasFiveModules: guideButtonCount === GUIDE_EXPECTATIONS.length,
  structureGuideHighlightsEachModule: guideStates.length === GUIDE_EXPECTATIONS.length
    && guideStates.every((state, index) => state.active === true
      && state.ariaPressed === 'true'
      && state.activeButtonCount === 1
      && state.pressedButtonCount === 1
      && state.buttonText?.includes(GUIDE_EXPECTATIONS[index].label)
      && state.focus === GUIDE_EXPECTATIONS[index].focus
      && state.title === GUIDE_EXPECTATIONS[index].label),
  iotArchitectureHasFiveLayers: iotTabCount === IOT_LAYER_EXPECTATIONS.length,
  iotArchitectureSwitchesAllLayers: iotLayerStates.length === IOT_LAYER_EXPECTATIONS.length
    && iotLayerStates.every((state, index) => state.ariaSelected === 'true'
      && state.selectedTabCount === 1
      && state.tabText?.includes(IOT_LAYER_EXPECTATIONS[index].label)
      && state.consoleClass?.includes(`is-layer-${IOT_LAYER_EXPECTATIONS[index].id}`)
      && state.step === IOT_LAYER_EXPECTATIONS[index].step
      && state.title?.includes(IOT_LAYER_EXPECTATIONS[index].title)
      && state.metric?.includes(IOT_LAYER_EXPECTATIONS[index].metric)),
  smartServiceHasFourScenarios: serviceTabCount === SERVICE_SCENARIO_EXPECTATIONS.length,
  smartServiceRunsEveryScenario: serviceScenarioStates.length === SERVICE_SCENARIO_EXPECTATIONS.length
    && serviceScenarioStates.every((state, index) => state.id === SERVICE_SCENARIO_EXPECTATIONS[index].id
      && state.standby === 'standby'
      && state.sampling === 'sampling'
      && state.terminal === SERVICE_SCENARIO_EXPECTATIONS[index].terminal
      && state.diagnosis?.includes(SERVICE_SCENARIO_EXPECTATIONS[index].diagnosis)
      && state.closed === 'closed'
      && state.selectedCount === 1
      && (state.id === 'normal'
        ? state.ticket?.startsWith('CHK-')
        : state.ticketed === 'ticketed' && state.verifying === 'verifying' && state.ticket?.startsWith('SVC-'))),
  smartServiceResetWorks: serviceResetState.scenario === 'normal'
    && serviceResetState.state === 'standby'
    && serviceResetState.ticket?.includes('LOCAL SERVICE RECORD'),
  truthLabelsAreExplicit: truthLabels.digitalTwin.visible === true
    && truthLabels.digitalTwin.text?.includes('OFFLINE DIGITAL MODEL')
    && truthLabels.digitalTwin.text?.includes('当前未接入实机遥测或控制')
    && truthLabels.digitalTwin.text?.includes('NOT LIVE DATA')
    && truthLabels.modelSource.visible === true
    && truthLabels.modelSource.text?.includes('NOT LIVE TELEMETRY')
    && truthLabels.modelSource.text?.includes('OFFICIAL ASSETS')
    && truthLabels.modelSource.text?.includes('CC BY-SA 4.0')
    && truthLabels.iotArchitecture.visible === true
    && truthLabels.iotArchitecture.text?.includes('不连接真实机器人')
    && truthLabels.iotArchitecture.text?.includes('不生成虚假遥测')
    && truthLabels.iotArchitecture.text?.includes('PROGRAMMATIC VISUALIZATION')
    && truthLabels.smartService.visible === true
    && truthLabels.smartService.text?.includes('浏览器本地模拟数据')
    && truthLabels.smartService.text?.includes('不连接实机')
    && truthLabels.smartService.text?.includes('NO REAL WORK ORDER'),
  showcaseStartsInOneClick: showcaseButtonText?.includes('SHOWCASE')
    && showcaseStarted.status?.includes('01 / 平台定位')
    && showcaseStarted.paused === false
    && showcaseStarted.activeStepCount === 1
    && showcaseStarted.doneStepCount === 0
    && showcaseStarted.totalStepCount === 8
    && showcaseStarted.actionCount === 3,
  showcasePauses: showcasePaused.status?.includes('01 / 平台定位')
    && showcasePaused.paused === true
    && showcasePaused.toggleLabel === '继续自动展演',
  showcaseContinues: showcaseContinued.status?.includes('01 / 平台定位')
    && showcaseContinued.paused === false
    && showcaseContinued.toggleLabel === '暂停自动展演',
  showcaseAdvancesChapter: showcaseNext.status?.includes('02 / 信号链路')
    && showcaseNext.paused === true
    && showcaseNext.activeStepCount === 1
    && showcaseNext.doneStepCount === 1,
  showcaseCompletesWithoutAutoExit: showcaseComplete.status?.includes('08 / 展演完成')
    && showcaseComplete.complete === true
    && showcaseComplete.replayLabel === '重新播放比赛展演'
    && showcaseComplete.nextDisabled === true
    && showcaseComplete.buildTop >= 0
    && showcaseComplete.buildTop < 140,
  showcaseReplayWorks: showcaseReplayed.status?.includes('01 / 平台定位')
    && showcaseReplayed.complete === false
    && showcaseReplayed.paused === false,
  showcaseExitButtonWorks: showcaseExited === true,
  showcaseEscapeWorks: showcaseEscapeExited === true,
  desktopHasNoHorizontalOverflow: Math.max(desktopReport.bodyWidth, desktopReport.documentWidth) <= desktopReport.viewportWidth,
  mobileHasNoHorizontalOverflow: Math.max(mobileReport.bodyWidth, mobileReport.documentWidth) <= mobileReport.viewportWidth,
  mobileUsesDeferredModelPoster: mobileGateReport.loadedBeforeActivation === 'false'
    && mobileGateReport.canvasCountBeforeActivation === 0
    && mobileGateReport.modelRequestCountBeforeActivation === 0
    && mobileGateReport.poster?.complete === true
    && mobileGateReport.poster?.naturalWidth > 0
    && mobileGateReport.poster?.width > 0
    && mobileGateReport.poster?.height > 0
    && mobileGateReport.launchButtonVisible === true
    && mobileGateReport.launchButtonText?.includes('启动 3D 展示'),
  mobileModelLoadsAfterActivation: mobileModel.loaded === true
    && mobileModel.errorVisible === false
    && mobileModel.urdfRequested === true
    && mobileModel.uniqueStlRequestCount === 26
    && mobileModel.caption === '22-JOINT MODEL LOADED',
  mobileCanvasRendersAfterActivation: mobileModel.canvasCount === 1
    && mobileModel.canvas?.width > 0
    && mobileModel.canvas?.height > 0
    && mobileModel.canvas?.clientWidth > 0
    && mobileModel.canvas?.clientHeight > 0,
  mobileInteractionCanExit: mobileInteractionInitial.visible === true
    && mobileInteractionInitial.pressed === 'false'
    && mobileInteractionInitial.text?.includes('启用 3D 交互')
    && mobileInteractionInitial.canvasTouchAction === 'pan-y'
    && mobileInteractionActive.pressed === 'true'
    && mobileInteractionActive.text?.includes('退出 3D 交互')
    && mobileInteractionActive.canvasTouchAction === 'none'
    && mobileInteractionExited.pressed === 'false'
    && mobileInteractionExited.text?.includes('启用 3D 交互')
    && mobileInteractionExited.canvasTouchAction === 'pan-y',
  allMetricsRenderOnMobile: mobileReport.visibleMetricCount === 4,
  closedMenuItemsAreHidden: closedMenuItemVisible === false,
  mobileMenuOpens: mobileMenuOpen === true,
  firstMenuItemReceivesFocus: menuFocusedItem?.startsWith('项目') === true,
  escapeClosesMenu: menuClosedAfterEscape === true,
  escapeReturnsFocus: focusReturnedToToggle === true,
}
const failedAssertions = Object.entries(assertions)
  .filter(([, passed]) => !passed)
  .map(([name]) => name)

console.log(JSON.stringify({
  httpStatus: response?.status(),
  interactions: {
    activeAnatomy,
    activeStack,
    activeMorphology,
    deepDiveOpen,
    motionState,
    explodedState,
    restoredState,
    resetViewState,
    guideButtonCount,
    guideStates,
    iotTabCount,
    iotLayerStates,
    truthLabels,
    showcaseButtonText,
    showcaseStarted,
    showcasePaused,
    showcaseContinued,
    showcaseNext,
    showcaseComplete,
    showcaseReplayed,
    showcaseExited,
    showcaseEscapeExited,
    mobileInteractionInitial,
    mobileInteractionActive,
    mobileInteractionExited,
    closedMenuItemVisible,
    mobileMenuOpen,
    menuFocusedItem,
    menuClosedAfterEscape,
    focusReturnedToToggle,
  },
  desktopModel,
  mobileGate: mobileGateReport,
  mobileModel,
  desktop: desktopReport,
  mobile: mobileReport,
  assertions,
  failedAssertions,
  errors,
}, null, 2))

await browser.close()
await new Promise((resolve, reject) => {
  server.httpServer.close((error) => (error ? reject(error) : resolve()))
})
if (errors.length || failedAssertions.length) process.exitCode = 1
