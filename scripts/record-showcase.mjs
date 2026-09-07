import { spawn } from 'node:child_process'
import { mkdir, copyFile, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { build, preview } from 'vite'
import ffmpegPath from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(root, 'video-output')
const rawDir = path.join(outputDir, 'raw')
const frameDir = path.join(outputDir, 'keyframes')
const dryRun = process.argv.includes('--dry-run')
const speedArgument = process.argv.find(argument => argument.startsWith('--speed='))
const speed = dryRun ? 0.035 : Number(speedArgument?.split('=')[1] || 1)
const targetDurationLimit = 190
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, Math.max(dryRun ? 25 : 0, milliseconds * speed)))
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', windowsHide: true })
  child.on('error', reject)
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${path.basename(command)} exited with ${code}`)))
})

await mkdir(rawDir, { recursive: true })
await mkdir(frameDir, { recursive: true })
process.env.GITHUB_PAGES = 'true'
await build({ logLevel: 'info' })
const server = await preview({ logLevel: 'error', preview: { host: '127.0.0.1', port: 4188, strictPort: true } })
const baseUrl = 'http://127.0.0.1:4188/berkeley-humanoid-lite-intro/?recording=1'
const errors = []
let browser
let context

try {
  browser = await chromium.launch({
    executablePath: process.env.BHL_CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required'],
  })
  const contextStartedAt = Date.now()
  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    ...(dryRun ? {} : { recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } } }),
  })
  await context.addInitScript(() => localStorage.removeItem('3s-service-history'))
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(`[pageerror] ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') errors.push(`[console] ${message.text()}`) })
  page.on('requestfailed', request => {
    const expectedVideoAbort = request.failure()?.errorText?.includes('ERR_ABORTED') && /\.mp4(?:$|[?#])/i.test(request.url())
    if (!expectedVideoAbort) errors.push(`[requestfailed] ${request.url()} — ${request.failure()?.errorText}`)
  })
  const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 })
  if (!response?.ok()) throw new Error(`Recording page returned ${response?.status()}`)
  await page.waitForFunction(() => window.__RECORDING_OVERLAY_READY__ === true)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => [...document.querySelectorAll('.hero img, #model-studio img')].every(image => image.complete && image.naturalWidth > 0))

  // Warm WebGL, all meshes, video decoders and fonts behind the opening title card.
  await page.locator('#model-studio').scrollIntoViewIfNeeded()
  await page.locator('#model-studio .viewer canvas').waitFor({ state: 'visible', timeout: 120_000 })
  await page.waitForFunction(() => Number(document.querySelector('#model-studio .viewer')?.dataset.modelHeight) > 0.5, undefined, { timeout: 120_000 })
  await page.locator('#evidence').scrollIntoViewIfNeeded()
  await page.evaluate(async () => {
    const videos = [...document.querySelectorAll('.motion-evidence video')]
    await Promise.all(videos.map(video => new Promise(resolve => {
      video.muted = true
      video.preload = 'auto'
      if (video.readyState >= 2) return resolve()
      const done = () => { video.removeEventListener('loadeddata', done); video.removeEventListener('error', done); resolve() }
      video.addEventListener('loadeddata', done, { once: true })
      video.addEventListener('error', done, { once: true })
      video.load()
    })))
  })
  await page.evaluate(() => {
    document.querySelectorAll('.reveal-pending').forEach(element => element.classList.remove('reveal-pending'))
    window.scrollTo(0, 0)
  })
  await wait(600)

  const video = dryRun ? null : page.video()
  const contentStartedAt = Date.now()
  const cue = detail => page.evaluate(value => window.dispatchEvent(new CustomEvent('recording:cue', { detail: value })), detail)
  const scroll = async (selector, block = 'center') => {
    await page.locator(selector).first().evaluate((element, position) => element.scrollIntoView({ behavior: 'smooth', block: position }), block)
    await wait(900)
  }
  const pulse = async locator => {
    const box = await locator.boundingBox()
    if (box) await page.evaluate(point => window.dispatchEvent(new CustomEvent('recording:pulse', { detail: point })), { x: box.x + box.width / 2, y: box.y + box.height / 2 })
  }
  const click = async locator => { await pulse(locator); await locator.click(); await wait(250) }
  const waitForPhase = phase => page.waitForFunction(value => document.querySelector('#service-console')?.dataset.phase === value, phase)

  // 00–08 / Opening
  await cue({ chapter: '3S / INTERNET OF THINGS', title: '人形机器人智慧运维与任务服务系统', subtitle: '从机器会动，走向状态可知、服务可追溯', truth: '可运行软件演示 / 物联网技术创新', progress: 0, fullscreen: true, outro: false, effect: 'boot' })
  await wait(3500)
  await cue({ chapter: '01 / PROJECT VISION', title: '机器会动，链路更应可见', subtitle: '端 → 边 → 服务 · 三类异常 · 六步服务闭环', truth: 'HUMANOID SMART SERVICE SYSTEM', progress: 4, fullscreen: false })
  await scroll('#overview', 'start'); await wait(3600)

  // 08–109 / Full-length self-owned physical robot footage
  await cue({ chapter: '02 / PHYSICAL ROBOT', title: '实物运动验证', subtitle: '四段项目自有现场影像，全部从第一帧完整播放', truth: '项目自有影像 / 非实时遥测', progress: 6, fullscreen: true, effect: 'physical' })
  await wait(1200)
  await scroll('#motion-evidence')
  const footage = [
    ['实机快速亮相', '新增短片快速建立实体机器人印象'],
    ['整机动作验证', '观察整机运动过程与机构协同'],
    ['运动调试记录', '记录调试阶段的动作表现'],
    ['实体机器人工作片段', '呈现实物平台已有动态工作过程'],
  ]
  await page.locator('.motion-section').evaluate(element => element.classList.add('is-film-focus'))
  for (const [index, [title, subtitle]] of footage.entries()) {
    const record = page.locator('.motion-record').nth(index)
    await page.locator('.motion-record').evaluateAll((records, activeIndex) => records.forEach((item, itemIndex) => item.classList.toggle('is-film-active', itemIndex === activeIndex)), index)
    await scroll(`.motion-record:nth-of-type(${index + 1})`)
    await cue({ chapter: `02 / FULL FOOTAGE 0${index + 1}`, title, subtitle: `${subtitle} · 完整保留原始时长`, truth: '项目自有影像 / 完整播放 / 非性能结论', progress: 8 + index * 14, fullscreen: false, effect: 'physical' })
    await record.locator('video').evaluate((videoElement, fast) => new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Physical footage playback timed out')), fast ? 5000 : 60000)
      const finish = () => { window.clearTimeout(timeout); videoElement.removeEventListener('ended', finish); resolve() }
      videoElement.muted = true
      videoElement.currentTime = fast && Number.isFinite(videoElement.duration) ? Math.max(0, videoElement.duration - .12) : 0
      videoElement.addEventListener('ended', finish, { once: true })
      videoElement.play().catch(reject)
    }), dryRun)
    await wait(350)
  }
  await page.locator('.motion-section').evaluate(element => element.classList.remove('is-film-focus'))
  await page.locator('.motion-record').evaluateAll(records => records.forEach(item => item.classList.remove('is-film-active')))

  // Problem and system story continue after the complete physical footage.
  await cue({ chapter: '03 / THE CHALLENGE', title: '从设备运行，到服务管理', subtitle: '统一状态、任务、维护和复检记录', truth: '问题背景 / 实验室巡检场景', progress: 62, fullscreen: false })
  await scroll('.problems'); await wait(6100)

  // 15–34 / Digital model
  await cue({ chapter: '04 / DIGITAL MODEL', title: '让整机结构真正可见', subtitle: '22 自由度 · 26 个结构网格 · 6 种程序化姿态', truth: '程序化姿态演示 / 非实机遥测', progress: 66, fullscreen: false, effect: 'model' })
  await scroll('#model-studio'); await wait(1700)
  const motionButtons = page.locator('#model-studio .twin-motion-list button')
  await click(motionButtons.nth(1)); await wait(3000)
  await cue({ chapter: '04 / MOTION STUDIO', title: '姿态切换与关节协同', subtitle: '招手、下蹲、步行和复位均由数字样机实时渲染', truth: '22-DOF MOTION / THREE.JS', progress: 70, fullscreen: false })
  await click(motionButtons.nth(2)); await wait(2700)
  const canvas = page.locator('#model-studio .viewer canvas')
  const canvasBox = await canvas.boundingBox()
  if (canvasBox) {
    await page.mouse.move(canvasBox.x + canvasBox.width * .54, canvasBox.y + canvasBox.height * .48)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + canvasBox.width * .68, canvasBox.y + canvasBox.height * .45, { steps: dryRun ? 2 : 42 })
    await page.mouse.up()
  }
  await wait(1400)
  await cue({ chapter: '04 / STRUCTURE SCAN', title: '从外形进入完整装配关系', subtitle: '展开结构，再重新组装为可理解的数字终端', truth: '26 MESHES / OFFLINE DIGITAL MODEL', progress: 74, fullscreen: false })
  const explode = page.locator('#model-studio .twin-primary')
  await click(explode); await wait(3600); await click(explode); await wait(1300)

  // 34–47 / Architecture
  await cue({ chapter: '05 / SYSTEM ARCHITECTURE', title: '端、边、服务协同', subtitle: '感知与执行、通信汇聚、边缘处理和智慧服务逐层衔接', truth: '架构说明 / 非实时链路', progress: 78, fullscreen: false, effect: 'data' })
  await scroll('#solution'); await wait(1100)
  const layerButtons = page.locator('.architecture button')
  for (const [index, title, subtitle, progress] of [
    [0, '可靠感知每一个关节', '编码器、电流与独立 IMU 形成设备状态输入', 80],
    [2, '四路 CAN 汇聚分布式节点', '关节状态帧与 USB IMU 在机载计算侧汇合', 82],
    [4, '让状态进入智慧服务', '规则诊断连接任务调整、维护工单与复检归档', 84],
  ]) {
    await click(layerButtons.nth(index))
    await cue({ chapter: '05 / FIVE-LAYER SYSTEM', title, subtitle, truth: '输入 → 机制 → 输出 / 可解释', progress, fullscreen: false })
    await wait(3100)
  }

  // 47–70 / Real service state machine
  await cue({ chapter: '06 / SMART SERVICE DEMO', title: '一次可追溯的异常处置', subtitle: '以关节温升为例，演示从感知到服务归档的完整闭环', truth: '浏览器本地模拟数据 / 不连接实机', progress: 86, fullscreen: false })
  await scroll('#demo', 'start'); await wait(900)
  await page.locator('#scenario').selectOption('thermal')
  const primary = () => page.locator('#service-console .primary-actions .button.primary')
  await click(primary()); await waitForPhase('running'); await wait(1500)
  await cue({ chapter: '06 / SENSING', title: '状态采样正在运行', subtitle: '温度、电流、CAN 丢包率与机身倾角进入统一状态快照', truth: '1 秒 / 样本 · 演示规则 v1', progress: 88, fullscreen: false })
  await click(primary()); await waitForPhase('alert'); await wait(2200)
  await cue({ chapter: '06 / DIAGNOSIS', title: '关节温升触发可解释规则', subtitle: '局部琥珀提示定位右膝，诊断同时保留其他指标对照', truth: '演示阈值 / 未经实机标定', progress: 90, fullscreen: false, effect: 'alert' })
  await click(primary()); await waitForPhase('adjusted'); await wait(1200)
  await click(primary()); await waitForPhase('ticketed'); await wait(1600)
  await cue({ chapter: '06 / MAINTENANCE ORDER', title: '异常与维护动作保持同一上下文', subtitle: '任务暂停后生成工单，三项检查完成后才允许复检', truth: '本地处置记录 / 不发送外部工单', progress: 92, fullscreen: false })
  for (const checkbox of await page.locator('.work-order input[type="checkbox"]').all()) await checkbox.check()
  await page.locator('.recheck-select select').selectOption('fault')
  await click(primary()); await wait(1500)
  await cue({ chapter: '06 / RECHECK GATE', title: '复检未通过，系统拒绝归档', subtitle: '故障仍在时任务继续暂停，服务流程不能被跳过', truth: '状态机约束 / 失败路径验证', progress: 93, fullscreen: false })
  await page.locator('.recheck-select select').selectOption('recovered')
  await click(primary()); await waitForPhase('verified'); await wait(1300)
  await click(primary()); await waitForPhase('closed'); await wait(1300)
  await cue({ chapter: '06 / SERVICE ARCHIVE', title: '复检通过，任务恢复并完成归档', subtitle: '采样、告警、处置与复检形成可导出的事件链', truth: '完整服务闭环 / JSON 可导出', progress: 94, fullscreen: false, effect: 'success' })
  await wait(1600)

  // Engineering stills remain separate from the complete footage chapter.
  await cue({ chapter: '07 / ENGINEERING EVIDENCE', title: '从数字模型回到真实工程对象', subtitle: '装配与联调照片构成可核验的研制过程记录', truth: '项目实物照片 / 非性能结论', progress: 94, fullscreen: false })
  await scroll('#evidence', 'start'); await wait(1100)
  const photo = page.locator('.evidence-card').nth(4)
  await click(photo); await wait(1800); await page.keyboard.press('Escape'); await wait(600)
  await scroll('#outcomes'); await cue({ chapter: '08 / APPLICATION VALUE', title: '状态可知 · 服务可追溯', subtitle: '面向实验室巡检、教学实训与机器人研发运维', truth: '软件演示 → 实机适配 → 小规模试点', progress: 97, fullscreen: false }); await wait(1800)
  await cue({ chapter: '3S / HUMANOID SMART SERVICE', title: '人形机器人智慧运维与任务服务系统', subtitle: '物联网技术创新 · 可运行软件演示', truth: 'END / 2026', progress: 100, fullscreen: true, outro: true, effect: 'outro' })
  await wait(4700)

  const contentEndedAt = Date.now()
  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`)
  if (dryRun) {
    console.log(`Dry run passed in ${((contentEndedAt - contentStartedAt) / 1000).toFixed(2)}s`)
    await page.close()
    await context.close()
  } else {
    await page.close()
    await context.close()
    const generatedPath = await video.path()
    const rawPath = path.join(rawDir, '3S-showcase-raw.webm')
    await copyFile(generatedPath, rawPath)
    const trimStart = Math.max(0, (contentStartedAt - contextStartedAt) / 1000)
    const outputDuration = Math.min(targetDurationLimit, (contentEndedAt - contentStartedAt) / 1000)
    const silentPath = path.join(outputDir, '3S人形机器人_比赛展示视频_实机影像完整版_无音轨.mp4')
    const ffmpegArgs = ['-y', '-ss', trimStart.toFixed(3), '-i', rawPath, '-t', outputDuration.toFixed(3), '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-profile:v', 'high', '-level', '4.2', '-movflags', '+faststart', '-an', silentPath]
    await run(ffmpegPath, ffmpegArgs)
    for (const timestamp of [2, 18, 55, 95, 130, Math.max(1, Math.floor(outputDuration - 4))]) {
      await run(ffmpegPath, ['-y', '-ss', String(timestamp), '-i', silentPath, '-frames:v', '1', '-q:v', '2', path.join(frameDir, `frame-${String(timestamp).padStart(2, '0')}s.jpg`)])
    }
    const probeOutput = []
    await new Promise((resolve, reject) => {
      const child = spawn(ffprobe.path, ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,width,height,r_frame_rate,pix_fmt', '-of', 'json', silentPath], { windowsHide: true })
      child.stdout.on('data', chunk => probeOutput.push(chunk))
      child.on('error', reject)
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`ffprobe exited with ${code}`)))
    })
    const media = JSON.parse(Buffer.concat(probeOutput).toString('utf8'))
    const outputStats = await stat(silentPath)
    const report = {
      generatedAt: new Date().toISOString(),
      source: 'Playwright-controlled production build',
      recordingMode: '?recording=1',
      output: path.relative(root, silentPath),
      durationTargetSeconds: outputDuration,
      contentTimelineSeconds: (contentEndedAt - contentStartedAt) / 1000,
      trimStartSeconds: trimStart,
      outputBytes: outputStats.size,
      media,
      browserErrors: errors,
      truthBoundaries: ['浏览器本地模拟数据', '程序化姿态演示', '项目自有实机影像', '非实时遥测'],
    }
    await writeFile(path.join(outputDir, 'recording-report.json'), JSON.stringify(report, null, 2), 'utf8')
    await writeFile(path.join(outputDir, '字幕稿.txt'), [
      '人形机器人智慧运维与任务服务系统',
      '从机器会动，走向状态可知、服务可追溯。',
      '系统连接感知与执行、通信汇聚、边缘处理和智慧服务。',
      '交互数字样机展示二十二自由度、二十六个结构网格和六种程序化姿态。',
      '以关节温升为例，系统完成状态采样、规则诊断、任务暂停、维护工单、复检和服务归档。',
      '全部服务数据由浏览器本地模拟，不连接实机，也不发送控制指令。',
      '八组实物照片与四段项目自有影像，记录从部件到整机的工程过程。',
      '面向实验室巡检、教学实训与机器人研发运维，让状态可知，让服务可追溯。',
    ].join('\r\n'), 'utf8')
    console.log(`\nCreated: ${silentPath}\nSize: ${(outputStats.size / 1024 / 1024).toFixed(1)} MiB`)
  }
} finally {
  if (context) await context.close().catch(() => {})
  if (browser) await browser.close().catch(() => {})
  await new Promise(resolve => server.httpServer.close(resolve))
}
