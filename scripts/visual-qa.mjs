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
  const lab = targetPage.locator('#digital-twin #model-studio')
  await lab.waitFor({ state: 'visible', timeout: MODEL_TIMEOUT })
  await targetPage.locator('#digital-twin .viewer canvas').waitFor({ state: 'visible', timeout: MODEL_TIMEOUT })
  await targetPage.waitForFunction(
    () => Number(document.querySelector('#digital-twin .viewer')?.dataset.modelHeight) > 0.5,
    undefined,
    { timeout: MODEL_TIMEOUT },
  )
  await targetPage.waitForTimeout(400)
  return lab
}

const readModelReport = (targetPage) => targetPage.evaluate(() => {
  const lab = document.querySelector('#digital-twin #model-studio')
  const viewer = document.querySelector('#digital-twin .viewer')
  const canvas = viewer?.querySelector('canvas')
  const canvasRect = canvas?.getBoundingClientRect()
  const resourcePaths = performance.getEntriesByType('resource').map((entry) => {
    try {
      return new URL(entry.name).pathname
    } catch {
      return entry.name
    }
  })
  const meshPaths = [...new Set(resourcePaths.filter((path) => path.includes('/meshes-gzip/') && path.endsWith('.stl.gz')))]
  const motionButtons = [...document.querySelectorAll('#digital-twin .twin-motion-list button')]

  return {
    loaded: Number(viewer?.dataset.modelHeight) > 0.5,
    errorVisible: Boolean(lab?.querySelector('.twin-error')),
    canvasCount: viewer?.querySelectorAll('canvas').length ?? 0,
    canvas: canvas ? {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvasRect?.width,
      clientHeight: canvasRect?.height,
      accessibleName: viewer?.getAttribute('aria-label'),
    } : null,
    urdfRequested: resourcePaths.some((path) => path.endsWith('/berkeley_humanoid_lite.urdf')),
    uniqueMeshRequestCount: meshPaths.length,
    motionButtonCount: motionButtons.length,
    motionButtonsEnabled: motionButtons.every((button) => !button.disabled),
    caption: document.querySelector('#digital-twin .twin-model-caption strong')?.textContent?.trim(),
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
await page.locator('.safety-interlude').screenshot({ path: 'preview-safety.png' })
await page.locator('.site-footer').screenshot({ path: 'preview-footer.png' })

await page.locator('.digital-twin-section').scrollIntoViewIfNeeded()
await waitForDigitalTwin(page)
const desktopModel = await readModelReport(page)
await page.locator('#digital-twin #model-studio').screenshot({ path: 'preview-digital-twin.png' })

const waveButton = page.locator('#digital-twin .twin-motion-list').getByRole('button', { name: /招手/ })
await waveButton.click()
await page.waitForFunction(
  () => document.querySelector('#digital-twin .twin-motion-head strong')?.textContent?.includes('WAVE SEQUENCE'),
)
const motionState = {
  sequence: await page.locator('#digital-twin .twin-motion-head strong').textContent(),
  activeButton: await page.locator('#digital-twin .twin-motion-list button.is-active').textContent(),
}

const explodeButton = page.locator('#digital-twin .twin-primary')
await explodeButton.click()
await page.waitForFunction(
  () => document.querySelector('#digital-twin #model-studio')?.classList.contains('is-exploded'),
)
const explodedState = {
  status: await page.locator('#digital-twin .twin-motion-head strong').textContent(),
  caption: await page.locator('#digital-twin .twin-model-caption strong').textContent(),
  buttonText: await explodeButton.textContent(),
  exploded: await page.locator('#digital-twin #model-studio').evaluate((element) => element.classList.contains('is-exploded')),
}

await explodeButton.click()
await page.waitForFunction(
  () => !document.querySelector('#digital-twin #model-studio')?.classList.contains('is-exploded'),
)
const restoredState = {
  status: await page.locator('#digital-twin .twin-motion-head strong').textContent(),
  caption: await page.locator('#digital-twin .twin-model-caption strong').textContent(),
  buttonText: await explodeButton.textContent(),
  exploded: await page.locator('#digital-twin #model-studio').evaluate((element) => element.classList.contains('is-exploded')),
}

const resetViewButton = page.locator('#digital-twin').getByRole('button', { name: '重置视角' })
const resetViewEnabled = await resetViewButton.isEnabled()
const cameraDistanceBeforeReset = Number(await page.locator('#digital-twin .viewer').getAttribute('data-camera-distance'))
await resetViewButton.click()
await page.waitForTimeout(300)
const resetViewState = {
  enabled: resetViewEnabled,
  modelStillLoaded: Number(await page.locator('#digital-twin .viewer').getAttribute('data-model-height')) > 0.5,
  cameraDistanceBeforeReset,
  cameraDistanceAfterReset: Number(await page.locator('#digital-twin .viewer').getAttribute('data-camera-distance')),
  canvasStillVisible: await page.locator('#digital-twin .viewer canvas').isVisible(),
}

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
    modelBoundary: read('#digital-twin .twin-boundary'),
    iotArchitecture: read('.iot-architecture__truth'),
    smartService: read('.service-truth-bar'),
  }
})

const showcaseRemoved = await page.evaluate(() => ({
  dockCount: document.querySelectorAll('.presentation-dock').length,
  headerButtonCount: document.querySelectorAll('.header-showcase').length,
  textPresent: document.body.textContent?.includes('55 秒系统展演') ?? false,
  manualEntryPresent: [...document.querySelectorAll('button')].some((button) => button.textContent?.includes('查看物联网信号链路')),
}))

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
const closedMenuItemVisible = await mobile.locator('.site-nav button').first().isVisible()
await mobile.locator('.menu-toggle').click()
const mobileMenuOpen = await mobile.locator('.site-nav').evaluate((element) => element.classList.contains('is-open'))
await mobile.waitForFunction(() => document.activeElement === document.querySelector('.site-nav button'))
const menuFocusedItem = await mobile.evaluate(() => document.activeElement?.textContent?.replace(/\s+/g, ' ').trim())
await mobile.keyboard.press('Escape')
const menuClosedAfterEscape = await mobile.locator('.site-nav').evaluate((element) => !element.classList.contains('is-open'))
const focusReturnedToToggle = await mobile.locator('.menu-toggle').evaluate((element) => document.activeElement === element)

await mobile.locator('.digital-twin-section').scrollIntoViewIfNeeded()
await waitForDigitalTwin(mobile)
const mobileModel = await readModelReport(mobile)
const mobileTouchAction = await mobile.locator('#digital-twin .viewer canvas').evaluate((canvas) => canvas.style.touchAction)
await mobile.locator('#digital-twin #model-studio').screenshot({ path: 'preview-mobile-3d.png' })

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
  buildSectionRemoved: await page.locator('#build, .build-section, .deep-dive').count() === 0,
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
  desktopModelLoads: desktopModel.loaded === true
    && desktopModel.errorVisible === false
    && desktopModel.urdfRequested === true
    && desktopModel.uniqueMeshRequestCount === 26
    && desktopModel.caption === '22-DOF MOTION',
  desktopCanvasRenders: desktopModel.canvasCount === 1
    && desktopModel.canvas?.width > 0
    && desktopModel.canvas?.height > 0
    && desktopModel.canvas?.clientWidth > 0
    && desktopModel.canvas?.clientHeight > 0
    && desktopModel.canvas?.accessibleName?.includes('3S 人形服务机器人'),
  motionButtonsReady: desktopModel.motionButtonCount === 6 && desktopModel.motionButtonsEnabled === true,
  motionButtonInteractionWorks: motionState.sequence?.includes('WAVE SEQUENCE')
    && motionState.activeButton?.includes('招手'),
  explodedViewWorks: explodedState.status?.includes('ASSEMBLY EXPLODED')
    && explodedState.caption?.includes('EXPLODED VIEW')
    && explodedState.buttonText?.includes('重新组装')
    && explodedState.exploded === true,
  explodedViewRestores: restoredState.status?.includes('WAVE SEQUENCE')
    && restoredState.caption?.includes('22-DOF MOTION')
    && restoredState.buttonText?.includes('探索结构')
    && restoredState.exploded === false,
  resetViewWorks: resetViewState.enabled === true
    && resetViewState.modelStillLoaded === true
    && resetViewState.cameraDistanceBeforeReset > 0
    && resetViewState.cameraDistanceAfterReset > 0
    && resetViewState.canvasStillVisible === true,
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
    && truthLabels.modelBoundary.visible === true
    && truthLabels.modelBoundary.text?.includes('程序化姿态与结构拆解演示')
    && truthLabels.modelBoundary.text?.includes('非实机遥测或物理性能验证')
    && truthLabels.iotArchitecture.visible === true
    && truthLabels.iotArchitecture.text?.includes('不连接真实机器人')
    && truthLabels.iotArchitecture.text?.includes('不生成虚假遥测')
    && truthLabels.iotArchitecture.text?.includes('PROGRAMMATIC VISUALIZATION')
    && truthLabels.smartService.visible === true
    && truthLabels.smartService.text?.includes('浏览器本地模拟数据')
    && truthLabels.smartService.text?.includes('不连接实机')
    && truthLabels.smartService.text?.includes('NO REAL WORK ORDER'),
  automaticShowcaseRemoved: showcaseRemoved.dockCount === 0
    && showcaseRemoved.headerButtonCount === 0
    && showcaseRemoved.textPresent === false
    && showcaseRemoved.manualEntryPresent === true,
  desktopHasNoHorizontalOverflow: Math.max(desktopReport.bodyWidth, desktopReport.documentWidth) <= desktopReport.viewportWidth,
  mobileHasNoHorizontalOverflow: Math.max(mobileReport.bodyWidth, mobileReport.documentWidth) <= mobileReport.viewportWidth,
  mobileUsesUnifiedViewer: mobileModel.loaded === true
    && mobileModel.errorVisible === false
    && mobileModel.urdfRequested === true
    && mobileModel.uniqueMeshRequestCount === 26
    && mobileModel.motionButtonCount === 6,
  mobileCanvasRenders: mobileModel.canvasCount === 1
    && mobileModel.canvas?.width > 0
    && mobileModel.canvas?.height > 0
    && mobileModel.canvas?.clientWidth > 0
    && mobileModel.canvas?.clientHeight > 0,
  mobileTouchKeepsPageScrollable: mobileTouchAction === 'pan-y',
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
    motionState,
    explodedState,
    restoredState,
    resetViewState,
    iotTabCount,
    iotLayerStates,
    truthLabels,
    showcaseRemoved,
    mobileTouchAction,
    closedMenuItemVisible,
    mobileMenuOpen,
    menuFocusedItem,
    menuClosedAfterEscape,
    focusReturnedToToggle,
  },
  desktopModel,
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
