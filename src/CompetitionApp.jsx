import React, { useEffect, useReducer, useRef, useState } from 'react'
import { ArrowUpRight, ArrowRight, Activity, Radio, Cpu, Network, ShieldCheck, Play, Pause, RotateCcw, Download, Check, ChevronRight, Menu, X, FileText, Box, CircleAlert } from 'lucide-react'
import { scenarios, metrics, normal, diagnose, initialState, serviceReducer } from './serviceEngine.js'
import './competition.css'
import './premium.css'
import './effects.css'
import useExhibitionMotion from './useExhibitionMotion.js'
import ModelStudio from './ModelStudio.jsx'
import { SystemOverview, LayerDeepDive, InnovationStudy, ReportTechnicalSupplement } from './EngineeringDetails.jsx'
import motion01 from './assets/motion/robot-motion-01.mp4'
import motion01Poster from './assets/motion/robot-motion-01-poster.webp'
import motion02 from './assets/motion/robot-motion-02.mp4'
import motion02Poster from './assets/motion/robot-motion-02-poster.webp'
import motion03 from './assets/motion/robot-motion-03.mp4'
import motion03Poster from './assets/motion/robot-motion-03-poster.webp'

const asset = path => `${import.meta.env.BASE_URL}${path}`
const nav = [['overview', '项目总览'], ['solution', '技术方案'], ['demo', '交互演示'], ['innovation', '创新设计'], ['evidence', '技术证据'], ['outcomes', '应用与成果']]
const phases = { idle: '等待启动', running: '巡检进行中', alert: '识别到异常', adjusted: '任务已暂停', ticketed: '维护处理中', verified: '复检通过', closed: '已归档' }
const steps = ['状态感知', '异常诊断', '任务调整', '维护工单', '复检确认', '服务归档']
const position = { idle: -1, running: 0, alert: 1, adjusted: 2, ticketed: 3, verified: 4, closed: 5 }
const jointNames = ['左肩', '右肩', '左肘', '右肘', '左膝', '右膝']
const layers = [
  { name: '感知与执行', en: 'SENSE', icon: Radio, detail: '编码器与相电流提供关节反馈；机身 IMU 独立提供姿态数据。', input: '关节位置 / 电流 / 机身姿态', output: '可识别的设备状态', status: '本体架构说明' },
  { name: '嵌入式控制', en: 'CONTROL', icon: Cpu, detail: '关节侧 STM32G431 完成 FOC 与状态处理，CAN ID 对应各关节节点。', input: '关节反馈与配置', output: '关节状态帧', status: '本体架构说明' },
  { name: '通信与汇聚', en: 'CONNECT', icon: Network, detail: '四路 CAN 经 USB-CAN 汇入机载计算；IMU 使用独立 USB 支路接入。', input: 'CAN 状态帧 + USB IMU', output: '机载汇聚数据', status: '本体架构说明' },
  { name: '边缘处理', en: 'COMPUTE', icon: Cpu, detail: '机载计算承担本体控制与策略推理。面向运维的数据适配接口是后续接入点。', input: '关节与机身反馈', output: '待接入：标准化状态快照', status: '遥测适配待实现' },
  { name: '智慧服务', en: 'SERVICE', icon: ShieldCheck, detail: '当前浏览器使用模拟状态快照，运行规则诊断、任务处置、维护工单和复检归档。', input: '本地模拟状态快照', output: '可追溯服务记录', status: '本次已实现' },
]
const evidence = [
  ['build-nodes', '01 / 节点接线', '从关节开始组织数据', '电机、控制板与线束的已有实物记录，用于说明分布式节点的装配关系。'],
  ['physical-system', '02 / 整机集成', '让计算与执行汇入本体', '已有整机实物照片展示机身、关节和线束布局，不代表网页已接入实机数据。'],
  ['build-limb', '03 / 子系统装配', '让维护落到具体部件', '肢体组件的装配记录对应可定位的维护对象；服务演示以右膝异常为主场景。'],
  ['build-parts', '04 / 零件准备', '结构件与轴承成组整理', '结构件、轴承和紧固位置的实物记录，展示关节模块装配前的部件组成。'],
  ['physical-device', '05 / 控制板与接口', '设备节点的硬件入口', '控制板、接口小板与线束的实物细节，对应系统中的嵌入式节点与连接接口。'],
  ['physical-actuator', '06 / 关节执行器', '一个关节中的机电集成', '电机、结构件、接口与线束组合为单个执行节点，便于理解部件定位与维护对象。'],
  ['physical-network', '07 / 多节点接线', '从单节点走向分布式连接', '工作台上的多组电机、控制板与线束，展示多节点装配和连接规模。'],
  ['physical-mapping', '08 / 整机展开', '沿结构认识部件关系', '整机展开状态呈现机身、肢体与线束之间的空间关系，可与数字样机的部件定位对照。'],
]
const motionRecords = [
  [motion01, motion01Poster, '01', '实机动态记录一', '00:42', '整机现场动作影像，用于呈现已有实体机器人的动态状态。'],
  [motion02, motion02Poster, '02', '实机动态记录二', '00:35', '项目调试过程影像，用于补充静态装配照片之外的工程记录。'],
  [motion03, motion03Poster, '03', '实机动态记录三', '00:24', '实体机器人动作片段，用于展示本项目已有实物工作过程。'],
]
function Heading({ index, label, title, text }) { return <div className="section-heading"><div><span className="eyebrow">{index} / {label}</span><h2>{title}</h2></div><p>{text}</p></div> }
function saveFile(name, body) { const url = URL.createObjectURL(new Blob([body], { type: 'application/json;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }

function ServiceDemo() {
  const [state, dispatch] = useReducer(serviceReducer, undefined, initialState)
  const [auto, setAuto] = useState(false)
  const [joint, setJoint] = useState('右膝')
  const [chartMetric, setChartMetric] = useState(0)
  const [recovered, setRecovered] = useState(true)
  const [saved, setSaved] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [history, setHistory] = useState(() => {
    try { const h = JSON.parse(localStorage.getItem('3s-service-history') || '[]'); return Array.isArray(h) ? h.filter(r => r && typeof r.id === 'string' && typeof r.scenario === 'string' && typeof r.date === 'string').slice(0, 5) : [] } catch { return [] }
  })
  const archived = useRef('')
  const start = () => dispatch({ type: 'start', id: `${Date.now().toString(36).toUpperCase()}` })
  useEffect(() => { if (state.phase === 'idle' || state.phase === 'closed') return; const timer = setInterval(() => dispatch({ type: 'tick' }), 1000); return () => clearInterval(timer) }, [state.phase])
  useEffect(() => {
    if (!auto) return
    const timer = setTimeout(() => {
      if (state.phase === 'idle') start()
      else if (state.phase === 'running') dispatch({ type: 'inject' })
      else if (state.phase === 'alert') dispatch({ type: 'adjust' })
      else if (state.phase === 'adjusted') dispatch({ type: 'ticket' })
      else if (state.phase === 'ticketed') {
        const next = [0, 1, 2].find(i => !state.checks.includes(i))
        if (next !== undefined) dispatch({ type: 'check', index: next })
        else dispatch({ type: 'verify', recovered: true })
      } else if (state.phase === 'verified') dispatch({ type: 'close' })
      else setAuto(false)
    }, state.phase === 'ticketed' ? 1400 : 2800)
    return () => clearTimeout(timer)
  }, [auto, state.phase, state.checks])
  useEffect(() => {
    if (state.phase !== 'closed' || archived.current === state.runId) return
    archived.current = state.runId
    const row = { id: state.ticket?.id || `CHK-${state.runId}`, scenario: state.ticket ? scenarios[state.scenario].name : '常规巡检', date: new Date().toLocaleString('zh-CN'), events: state.events, ticket: state.ticket, finalValues: state.values, dataSource: 'browser-simulation', rulesVersion: 'demo-v1' }
    setHistory(prev => { const next = [row, ...prev].slice(0, 5); try { localStorage.setItem('3s-service-history', JSON.stringify(next)) } catch { setStorageError(true) } return next })
  }, [state.phase, state.runId, state.ticket, state.scenario, state.events, state.values])
  const scenario = scenarios[state.scenario]
  const fault = !['idle', 'running', 'verified', 'closed'].includes(state.phase)
  const selectedValues = state.scenario === 'thermal' && joint !== '右膝' ? [normal[0], normal[1], state.values[2], state.values[3]] : state.values
  const findings = diagnose(state.values)
  const metric = metrics[chartMetric]
  const points = state.samples.map((sample, i) => `${(i / 29) * 600},${110 - sample[chartMetric] / metric.max * 90}`).join(' ')
  const primary = { idle: ['启动巡检', start], running: [`注入${scenario.name}`, () => dispatch({ type: 'inject' })], alert: ['确认暂停任务', () => dispatch({ type: 'adjust' })], adjusted: ['生成维护工单', () => dispatch({ type: 'ticket' })], ticketed: ['执行复检', () => dispatch({ type: 'verify', recovered })], verified: ['归档并恢复任务', () => dispatch({ type: 'close' })] }[state.phase]
  const reset = () => { setAuto(false); dispatch({ type: 'reset' }); setRecovered(true); setSaved(false); setJoint('右膝'); setChartMetric(0) }
  return <div className="service-console" data-phase={state.phase} id="service-console">
    <div className="console-top"><div><span className="live-dot" /><strong>HUMANOID / 01</strong><span className="simulation-pill">本地模拟数据</span></div><span className="console-source">1 秒 / 样本 · 演示规则 v1</span></div>
    <div className="console-grid">
      <aside className="device-panel"><span className="eyebrow">WORKSPACE</span><h3>巡检服务台</h3><div className="device-card"><Box size={24}/><div><strong>人形机器人 01</strong><span>场景：实验室设备巡检</span></div></div><label className="field-label" htmlFor="scenario">选择异常场景</label><select id="scenario" value={state.scenario} disabled={state.phase !== 'idle' || auto} onChange={e => { dispatch({ type: 'scenario', id: e.target.value }); setChartMetric(e.target.value === 'can' ? 2 : e.target.value === 'pose' ? 3 : 0) }}>{Object.entries(scenarios).map(([id, s]) => <option key={id} value={id}>{s.name}</option>)}</select><div className="task-card"><span className="eyebrow">TASK / INSPECTION-01</span><strong>{state.phase === 'idle' ? '待启动' : ['adjusted', 'ticketed', 'verified'].includes(state.phase) ? '巡检已暂停' : state.phase === 'alert' ? '异常待处置' : state.phase === 'closed' ? state.ticket ? '巡检已恢复' : '巡检已完成' : '执行巡检中'}</strong><p>巡检点 A → 设备区 B → 返回起点</p><div className="route-line"><i/><i/><i/></div><small>任务状态仅在本演示中变化</small></div><button className="button ghost auto-button" onClick={() => { if (state.phase === 'closed') reset(); setAuto(!auto) }}>{auto ? <Pause size={16}/> : <Play size={16}/>} {auto ? '暂停自动讲解' : '自动演示完整闭环'}</button><button className="text-button" onClick={reset}><RotateCcw size={14}/>重置本轮演示</button><p className="micro-copy">自动讲解约 25 秒。暂停后可手动操作，采样继续。</p></aside>
      <div className="monitor-panel"><div className="panel-title"><span>设备状态映射</span><span className={fault ? 'status amber' : 'status'}>{phases[state.phase]}</span></div><div className="robot-monitor"><div className="monitor-grid"/><div className="robot-ring"/><img src={asset('media/bhl-robot-cutout.png')} alt="人形机器人结构示意，点击关节查看模拟指标" width="440" height="600"/>{jointNames.map((name, i) => <button key={name} className={`joint-marker joint-${i} ${joint === name ? 'selected' : ''} ${name === '右膝' && fault && state.scenario === 'thermal' ? 'fault' : ''}`} aria-pressed={joint === name} onClick={() => setJoint(name)} aria-label={`查看${name}状态`}><i/><span>{name}</span></button>)}<div className="monitor-caption"><span>STRUCTURE MAPPING</span><small>点击关节 · 查看模拟状态</small></div></div><div className="metric-heading"><span>{joint}状态 / 全机通信与姿态</span><small>{state.phase === 'idle' ? '预设初始样本' : `已采集 ${state.tick + 1} 组模拟样本`}</small></div><div className="metric-grid">{metrics.map((m, i) => <button key={m.name} aria-pressed={chartMetric === i} className={`metric-card ${chartMetric === i ? 'active' : ''} ${selectedValues[i] >= m.limit ? 'warn' : ''}`} onClick={() => setChartMetric(i)}><span>{m.name}</span><strong>{selectedValues[i].toFixed(1)}<small>{m.unit}</small></strong><small>演示阈值 ≥ {m.limit}{m.unit}</small></button>)}</div><div className="trend"><div><span>{chartMetric < 2 ? '右膝' : '全机'} · {metric.name}趋势</span><span>最近 30 个实际采样点 / 模拟</span></div><svg viewBox="0 0 600 130" role="img" aria-label={`${metric.name}模拟采样趋势，虚线为演示阈值`}><line x1="0" x2="600" y1={110 - metric.limit / metric.max * 90} y2={110 - metric.limit / metric.max * 90} className="threshold"/><text x="598" y={104 - metric.limit / metric.max * 90} textAnchor="end">{metric.limit}{metric.unit}</text>{state.samples.length > 1 && <polyline points={points}/>}<line className="chart-axis" x1="0" x2="600" y1="112" y2="112"/></svg></div></div>
      <aside className="decision-panel"><div className="panel-title"><span>诊断与处置</span><ShieldCheck size={16}/></div><div className={`diagnosis ${fault ? 'has-fault' : ''}`}><span className="eyebrow">{fault ? 'ATTENTION REQUIRED' : 'SERVICE INTELLIGENCE'}</span><h3>{fault ? scenario.name : state.phase === 'closed' ? '服务记录已归档' : state.phase === 'verified' ? '指标恢复 · 复检通过' : '等待异常触发'}</h3><p>{fault ? scenario.cause : '系统按可解释规则评估模拟状态，每一步处置均保留事件记录。'}</p></div><div className="rule-list">{findings.map(m => <div key={m.name}><span>{m.name}</span><span className={m.triggered ? 'amber' : ''}>{m.value.toFixed(1)} / {m.limit}{m.unit} {m.triggered ? '触发' : '正常'}</span></div>)}</div><small className="micro-copy">诊断使用右膝与全机样本。以上为演示阈值，未经实机标定。</small>
      {state.ticket && <div className="work-order"><span className="eyebrow">MAINTENANCE ORDER</span><strong>{state.ticket.id}</strong><p>{scenario.target} · {state.phase === 'closed' ? '已归档' : state.phase === 'verified' ? '待归档' : '待处理'}</p>{scenario.checklist.map((label, i) => <label key={label}><input type="checkbox" checked={state.checks.includes(i)} disabled={state.phase !== 'ticketed' || auto} onChange={() => dispatch({ type: 'check', index: i })}/>{label}</label>)}{state.phase === 'ticketed' && <label className="recheck-select">复检样本<select aria-label="复检样本" disabled={auto} value={recovered ? 'recovered' : 'fault'} onChange={e => setRecovered(e.target.value === 'recovered')}><option value="recovered">恢复样本（通过路径）</option><option value="fault">故障仍在（失败路径）</option></select></label>}</div>}
      {state.outcome === 'fail' && state.phase === 'ticketed' && <p role="alert" className="failure-note">复检未通过：任务继续暂停，请重新处置。</p>}
      <div className="primary-actions">{primary && <button className="button primary" disabled={auto || (state.phase === 'ticketed' && state.checks.length !== 3)} onClick={primary[1]}>{primary[0]}<ArrowRight size={16}/></button>}{state.phase === 'running' && <button className="text-button" disabled={auto} onClick={() => dispatch({ type: 'normalClose' })}>无异常，完成常规巡检</button>}{state.phase === 'closed' && <button className="button primary" onClick={reset}>开始新一轮<RotateCcw size={16}/></button>}</div><p className="micro-copy">本系统模拟诊断与处置，不向机器人发送控制指令。</p></aside>
    </div>
    <div className="service-steps" aria-label="服务流程">{steps.map((step, i) => { const skipped = state.phase === 'closed' && !state.ticket && i >= 2 && i <= 4; return <div key={step} className={!skipped && position[state.phase] >= i ? 'done' : ''}><span>{skipped ? '—' : position[state.phase] > i ? <Check size={13}/> : `0${i + 1}`}</span>{skipped ? '无需' + step : step}{i < 5 && <ChevronRight size={14}/>}</div> })}</div>
    <div className="event-panel"><div className="panel-title"><span>服务事件 / 可追溯记录</span><button className="text-button" disabled={!state.events.length} onClick={() => { saveFile(`3S-${state.runId}.json`, JSON.stringify({ dataSource: 'browser-simulation', rulesVersion: 'demo-v1', phase: state.phase, scenario: state.ticket || fault ? state.scenario : 'normal', ticket: state.ticket, samples: state.samples, events: state.events }, null, 2)); setSaved(true) }}><Download size={14}/>{saved ? '再次导出本轮记录' : '导出本轮记录'}</button></div><div className="event-log" aria-live="polite">{state.events.length ? state.events.map((e, i) => <div key={`${i}-${e.time}`}><time>{e.time}</time><i/><span>{e.message}</span></div>) : <p>启动巡检后，采样、告警、处置与复检会形成完整事件链。</p>}</div></div>
    {!!history.length && <details className="history"><summary>本机最近归档 <span>{history.length} 条 / 最多保留 5 条</span></summary>{history.map(r => <div key={r.id}><span>{r.scenario}<small>{r.date}</small></span><button className="text-button" onClick={() => saveFile(`${r.id}.json`, JSON.stringify(r, null, 2))}>导出 {r.id}<Download size={13}/></button></div>)}<p className="micro-copy">记录保存在当前浏览器，不会同步到其他设备。</p></details>}{storageError && <p role="status">浏览器不允许持久化保存；请导出记录以保留本次结果。</p>}
  </div>
}

function MotionEvidence() {
  const container = useRef(null)
  const videos = useRef([])
  const [playing, setPlaying] = useState(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) return
      videos.current.forEach(video => video?.pause())
      setPlaying(null)
    }, { threshold: 0.08 })
    if (container.current) observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  const play = async index => {
    videos.current.forEach((video, other) => { if (other !== index) video?.pause() })
    try { await videos.current[index]?.play() } catch { /* Native controls remain available. */ }
  }
  return <div className="motion-evidence" ref={container} aria-labelledby="motion-evidence-title">
    <div className="motion-evidence__head"><div><span className="eyebrow">PHYSICAL ROBOT / MOTION EVIDENCE</span><h3 id="motion-evidence-title">实机动态记录</h3></div><p>三段均为本项目自有现场影像。点击后按需加载，一次只播放一段。</p></div>
    <div className="motion-records">{motionRecords.map(([file, poster, index, title, duration, description], position) => <article className={`motion-record${playing === position ? ' is-playing' : ''}`} key={file}>
      <div className="motion-record__media"><video ref={node => { videos.current[position] = node }} controls preload="none" playsInline poster={poster} onPlay={() => { videos.current.forEach((video, other) => { if (other !== position) video?.pause() }); setPlaying(position) }} onPause={() => setPlaying(current => current === position ? null : current)} onEnded={() => setPlaying(null)} aria-label={`${title}，${duration}`}><source src={file} type="video/mp4"/></video>{playing !== position && <button className="motion-record__play" onClick={() => play(position)} aria-label={`播放${title}`}><Play size={19} fill="currentColor"/><span>播放现场记录</span></button>}<span className="motion-record__duration">{duration}</span></div>
      <div className="motion-record__copy"><span>{index} / OWN PROJECT FOOTAGE</span><h4>{title}</h4><p>{description}</p></div>
    </article>)}</div>
    <div className="motion-evidence__truth"><span className="live-dot"/><p>项目自有实物影像 · 非实时遥测 · 不作为负载、续航或控制精度测试结论</p></div>
  </div>
}

function Report() {
  return <main className="report-page"><div className="report-tools"><a href={import.meta.env.BASE_URL}>← 返回展厅</a><button className="button primary" onClick={() => window.print()}>打印 / 保存为 PDF</button></div><span className="eyebrow">3S / PROJECT TECHNICAL REPORT</span><h1>人形机器人智慧运维与任务服务系统</h1><p className="report-lead">项目技术报告 · 软件演示版 v1.0</p><p>本报告对应当前可运行的浏览器演示。真实硬件架构、已有实物资料、本次软件实现与未来验证计划分别说明；不将模拟结果作为实机性能结论。</p>{reportSections.map(([title, body]) => <section key={title}><h2>{title}</h2>{body.map((p, i) => <p key={i}>{p}</p>)}</section>)}<ReportTechnicalSupplement/><section><h2>附录：现场演示步骤</h2><ol><li>进入交互演示，选择关节温升并启动巡检。</li><li>注入异常，查看温度、电流规则及对应诊断说明。</li><li>确认暂停任务，生成工单并勾选维护检查项。</li><li>选择故障仍在进行复检，验证工单不能归档。</li><li>改用恢复样本复检，归档并恢复任务，导出 JSON 事件记录。</li><li>重置后测试通信、姿态场景或无异常巡检；可使用自动演示。</li></ol></section><p className="report-footer">资料与模型归属见网站技术资料页及模型 ATTRIBUTION.md。本文中的阈值均为软件演示规则。</p></main>
}
const reportSections = [
  ['01 / 问题背景', ['面向实验室人形机器人巡检与维护场景，关节、通信、机身姿态等状态分散，异常排查依赖人工理解，维护动作与复检记录难以形成统一事件链。目标使用者为实验室设备管理员、调试人员及教学展示人员。', '本项目探索从设备状态到服务动作的系统化表达：把人形机器人作为可识别的物联网终端，用同一任务上下文连接状态感知、异常判定、维护处置和服务归档。']],
  ['02 / 技术方案', ['本体架构：编码器与相电流进入关节控制器，STM32G431 在节点侧完成 FOC 与状态处理；四路 CAN 通过 USB-CAN 连接机载计算，机身 IMU 经独立 USB 支路汇入。当前展示依据项目既有技术资料，浏览器并未直接读取这些硬件。', '软件架构：React 管理界面，纯函数状态机约束业务阶段，本地模拟器生成一秒一次的状态样本；规则引擎评估异常，服务界面进行任务暂停、工单生成和复检。最近五条归档记录存储于 localStorage，JSON 导出用于保存单轮记录。', '数据路径：模拟状态快照 → 阈值判定 → 异常解释 → 人工确认任务暂停 → 维护检查项 → 复检规则 → 归档。原有 URDF/STL 交互数字样机作为独立技术资料入口保留，按需加载。']],
  ['03 / 创新设计', ['多状态关联解释：关节温升场景联合温度与电流给出负载相关风险线索，并显示通信与姿态的对照状态。当前为可解释的演示规则，不宣称机器学习诊断准确率或已定位真实故障根因。', '状态驱动服务：异常与任务状态联动，任务暂停后才能生成维护工单。工单继承同一轮的设备对象、异常类型与触发快照，减少人工搬运上下文的步骤。', '复检闭环：维护检查完成后才能复检；故障样本继续阻止归档，通过样本才允许归档并恢复任务。该机制强调服务流程完整性，先进性仍需与基线系统开展实际对比验证。']],
  ['04 / 关键技术', ['统一模拟样本包含温度（°C）、电流（A）、CAN 丢包率（%）和机身倾角（°）。演示触发条件分别为 ≥65°C、≥6A、≥3% 和 ≥10°。阈值没有经过目标实机标定，不适用于真实控制或安全判定。', '状态机包含待启动、巡检、告警、任务暂停、工单处理中、复检通过与归档阶段。非法跳转被拒绝；未完成检查或复检失败时不能关闭工单。常规巡检提供独立的无异常归档路径。', '时间线记录每次业务转换的本机时间；导出文件包含数据来源标识、规则版本、阶段、样本与事件。浏览器持久化仅用于单机演示，不具备多用户协同、身份认证或服务端审计能力。']],
  ['05 / 应用场景', ['首要场景为实验室机器人设备巡检：通过一次异常处置理解从状态到服务的全过程。教学场景可使用可复现的温升、通信、姿态案例讲解物联网分层与服务设计。', '进一步应用可面向机器人研发调试与小规模设备维护，但需要增加真实遥测适配、设备注册、权限管理和服务端存储。当前不宣称已在工厂、医院或商业场所部署。']],
  ['06 / 市场前景与产业价值', ['潜在客户包括高校机器人实验室、职教实训中心及机器人研发团队，优先验证其对设备状态解释、维护流程记录和培训演示的需求。尚未取得付费客户或商业采购证据。', '可能的交付形式为教学演示软件、实机适配服务和设备维护平台。成本包括设备适配、软件开发、数据标定、部署与长期维护。当前未给出未经验证的市场规模、售价或节省比例。', '产业价值假设为缩短故障信息整理时间、减少处置遗漏并提高维护可追溯性。需通过人工流程与本系统的同任务对照实验评估，而非通过页面观感推断收益。']],
  ['07 / 验证方法与结果边界', ['软件验收覆盖三种异常的全流程、无异常巡检、复检失败后重试、非法阶段跳转、自动演示及暂停、归档刷新恢复、JSON 导出、桌面和手机布局、GitHub Pages 子路径加载。构建和自动检查结果应以仓库测试日志为准。', '实机验证计划：先建立时间戳统一的遥测接口，采集正常与可控异常数据；标定阈值并评估误报率、漏报率、告警时延与维护耗时。记录设备、工况、重复次数和原始数据，再开展基线对照。以上实机实验尚未完成。']],
  ['08 / 交付与后续路线', ['当前交付为公网可访问的软件演示系统、本技术报告、主页面交互数字样机以及可导出的模拟服务记录。静态网站可通过 GitHub Pages 分发，业务逻辑在浏览器运行。', '后续顺序：单机只读遥测接入 → 规则标定与实测验证 → 服务端工单与权限 → 多设备试点。真实任务控制需要独立设计授权、确认、状态反馈与本体安全约束，不应由本演示按钮直接承担。']],
]

export default function CompetitionApp() {
  useExhibitionMotion()
  const [menu, setMenu] = useState(false)
  const [active, setActive] = useState('overview')
  const [layer, setLayer] = useState(4)
  const [useCase, setUseCase] = useState(0)
  const [photo, setPhoto] = useState(null)
  const photoTrigger = useRef(null)
  const dialog = useRef(null)
  useEffect(() => { if (!menu) return; const close = e => { if (e.key === 'Escape') { setMenu(false); document.querySelector('.menu-toggle')?.focus() } }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, [menu])
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }) }, { rootMargin: '-15% 0px -65% 0px' })
    document.querySelectorAll('main > section[id]').forEach(el => observer.observe(el)); return () => observer.disconnect()
  }, [])
  useEffect(() => { if (photo) dialog.current?.showModal(); else if (dialog.current?.open) dialog.current.close() }, [photo])
  if (new URLSearchParams(window.location.search).get('view') === 'report') return <Report/>
  const current = layers[layer]
  const caseInfo = [ ['实验室设备巡检', '设备异常有迹可循', '设备管理员从关节与机身状态识别风险，暂停任务后开展维护，使用复检记录确认流程完成。', '当前演示场景', '统一设备、异常、任务与工单上下文。'], ['教学与实训', '可操作的物联网课堂', '学生通过三种可复现场景认识感知、通信、规则与服务流程，导出记录用于课堂复盘。', '可用于软件演示', '用可解释规则呈现每一步的输入与输出。'], ['研发与设备运维', '从演示走向实机接入', '后续接入只读遥测、完成阈值标定，再加入多设备管理和服务端工单，开展小规模试点。', '待实机接入验证', '以处置耗时、误报率和记录完整性评估价值。'] ][useCase]
  return <div className="competition"><a className="skip-link" href="#demo">跳到交互演示</a><header className="site-header"><a className="brand" href="#overview"><span className="brand-symbol">H<span>·</span></span><span>HUMANOID<small>SMART SERVICE SYSTEM</small></span></a><nav className={menu ? 'open' : ''} aria-label="主要导航">{nav.map(([id, label]) => <a key={id} className={active === id ? 'active' : ''} href={`#${id}`} onClick={() => setMenu(false)}>{label}</a>)}</nav><a className="header-cta" href="#demo">进入演示<ArrowUpRight size={15}/></a><button className="menu-toggle" aria-label={menu ? '关闭导航' : '打开导航'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></header>
    <main><section className="hero" id="overview"><div className="hero-topline"><span><i/> 物联网技术创新 · 3S 智慧服务</span><span>INTERACTIVE EXHIBITION / 2026</span></div><div className="hero-layout"><div className="hero-copy"><span className="eyebrow">BEYOND MOTION. INTO SERVICE.</span><h1 aria-label="人形机器人 智慧服务"><span className="headline-line" style={{ '--line-index': 0 }}>人形机器人</span><span className="headline-line" style={{ '--line-index': 1 }}><em>智慧服务</em></span></h1><p>人形机器人智慧运维与任务服务系统</p><div className="hero-description">连接关节状态、异常诊断与维护流程。<br/>从机器会动，走向状态可知、服务可追溯。</div><div className="hero-actions"><a className="button primary" href="#demo"><Play size={16}/>开始交互演示<ArrowUpRight size={16}/></a><a className="button ghost" href="#model-studio">查看数字样机<ArrowRight size={16}/></a></div><div className="hero-note"><span className="live-dot"/>可运行软件演示<span>/</span>无需连接机器人</div></div><div className="hero-visual"><span className="hero-backword">HUMANOID</span><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><img className="hero-robot" src={asset('media/bhl-robot-cutout.png')} alt="Berkeley Humanoid Lite 人形机器人" fetchPriority="high" width="660" height="880"/><div className="visual-label label-top"><span className="crosshair">+</span><div><small>01 / SENSING</small><strong>感知每一个关节</strong></div></div><div className="visual-label label-bottom"><span className="crosshair">+</span><div><small>02 / SMART SERVICE</small><strong>连接每一次处置</strong></div></div><div className="visual-foot"><span>BERKELEY HUMANOID LITE</span><span>机器人平台 / 结构示意</span></div></div></div><div className="hero-bottom"><div><strong>端 → 边 → 服务</strong><span>物联网系统化设计</span></div><div><strong>3 种异常场景</strong><span>温升 / 通信 / 姿态</span></div><div><strong>6 步服务闭环</strong><span>从状态感知到服务归档</span></div><a href="#solution">向下探索<span>↓</span></a></div></section>
    <section className="section problems"><div className="problem-intro"><span className="eyebrow">THE CHALLENGE</span><h2>从设备运行<br/>到服务管理</h2><p>面向实验室巡检，关注设备运行背后的三个具体问题。</p></div><div className="problem-list">{[['01', '状态分散，难以判断', '关节、总线与机身状态缺少统一视图。', '多状态统一呈现'], ['02', '告警之后，处置脱节', '发现异常后，任务与维护动作仍需人工衔接。', '异常关联任务与工单'], ['03', '维护结束，缺少复检', '处理结果缺少统一确认与可追溯记录。', '复检通过后归档']].map(([n, title, text, result]) => <div key={n}><span>{n}</span><div><h3>{title}</h3><p>{text}</p></div><small><ArrowRight size={14}/>{result}</small></div>)}</div></section>
    <ModelStudio/>
    <section className="section" id="solution"><Heading index="01" label="SYSTEM ARCHITECTURE" title="端到边的系统协同" text="以设备状态为共同语言，把感知、控制、通信和边缘处理组织成可理解的系统。"/><SystemOverview/><div className="engineering-workbench"><div className="workbench-heading"><div><span className="workbench-dot" aria-hidden="true"/><strong>系统分层详解</strong></div><span>架构说明 · 非实时链路</span></div><div className="architecture" role="group" aria-label="技术方案分层导航">{layers.map((l, i) => <button key={l.en} className={i === layer ? 'active' : ''} aria-pressed={i === layer} onClick={() => setLayer(i)}><span>0{i + 1}<l.icon size={23}/></span><strong>{l.name}</strong><small>{l.en}</small>{i < 4 && <ChevronRight className="layer-arrow" size={18}/>}</button>)}</div><div className="architecture-detail" key={current.en}><div><span className="pill">{current.status}</span><h3>{current.name}</h3><p>{current.detail}</p></div><dl><div><dt>INPUT / 输入</dt><dd>{current.input}</dd></div><div><dt>OUTPUT / 输出</dt><dd>{current.output}</dd></div></dl></div><LayerDeepDive index={layer}/></div><div className="boundary-note"><CircleAlert size={17}/><p>当前服务端点使用浏览器模拟数据。本体 → 浏览器的遥测适配尚未接入；IMU 通过独立 USB 支路汇入机载计算，不经过关节控制器。</p></div></section>
    <section className="section demo-section" id="demo"><Heading index="02" label="LIVE SERVICE DEMO" title="让异常处理形成闭环" text="亲手操作一次巡检：发现问题、暂停任务、完成维护，再用复检确认服务结果。"/><ServiceDemo/></section>
    <section className="section" id="innovation"><Heading index="03" label="INNOVATION BY DESIGN" title="连接状态与服务的关键设计" text="从本体技术到智慧服务，分别说明问题、机制、价值与验证方法。点击条目展开细节。"/><InnovationStudy/></section>
    <section className="section evidence-section" id="evidence"><Heading index="04" label="ENGINEERING EVIDENCE" title="工程实物与技术证据" text="已有装配记录用于说明工程对象，软件交互用于演示服务机制。照片不作为实时接入或性能验证的证明。"/><div className="evidence-grid">{evidence.map((e) => <button className="evidence-card" key={e[0]} onClick={event => { photoTrigger.current = event.currentTarget; setPhoto(e) }}><div className="evidence-image"><img src={asset(`media/project-evidence/${e[0]}-720.webp`)} alt={e[2]} srcSet={`${asset(`media/project-evidence/${e[0]}-720.webp`)} 720w, ${asset(`media/project-evidence/${e[0]}-1280.webp`)} 1280w`} sizes="(max-width: 650px) 90vw, (max-width: 1000px) 44vw, 30vw" loading="lazy" decoding="async" width="720" height="540"/><span>已有实物记录 <ArrowUpRight size={15}/></span></div><small>{e[1]}</small><h3>{e[2]}</h3><p>{e[3]}</p></button>)}</div></section>
    <section className="section motion-section" id="motion-evidence"><MotionEvidence/><details className="source-details"><summary>影像真实性说明</summary><p>本节三段影像均由项目组提供，用于记录实体机器人运动与调试过程；影像不代表网页正在接收实时遥测，也不作为负载、续航或控制精度的测试结论。</p></details></section>
    <section className="section" id="outcomes"><Heading index="05" label="APPLICATION & VALUE" title="面向真实场景的持续服务" text="先讲透实验室场景，再以真实接入和验证数据推进教学、研发与设备运维应用。"/><div className="application-layout"><div className="case-tabs" role="group" aria-label="应用场景">{['实验室设备巡检', '教学与实训', '研发与设备运维'].map((title, i) => <button key={title} aria-pressed={useCase === i} className={useCase === i ? 'active' : ''} onClick={() => setUseCase(i)}><span>0{i + 1}</span>{title}<ArrowUpRight size={18}/></button>)}</div><article className="case-detail" key={useCase}><span className="pill">{caseInfo[3]}</span><h3>{caseInfo[1]}</h3><p>{caseInfo[2]}</p><div><span>服务价值</span><strong>{caseInfo[4]}</strong></div></article></div><div className="value-grid"><div><span>目标用户</span><h3>实验室 · 实训中心 · 研发团队</h3><p>围绕设备管理、调试与培训验证需求。</p></div><div><span>交付路径</span><h3>软件演示 → 实机适配 → 试点</h3><p>逐步补齐遥测、规则标定与服务端能力。</p></div><div><span>产业价值假设</span><h3>减少遗漏，提升维护可追溯性</h3><p>以对照实验验证收益，不预设商业数据。</p></div></div><div className="deliverables"><div><span className="eyebrow">PROJECT DELIVERABLES</span><h2>演示与项目成果</h2><p>技术报告覆盖问题背景、技术方案、创新设计、关键技术、应用场景、市场前景与产业价值。</p></div><div className="deliverable-links"><a href="?view=report"><FileText/><span><strong>项目技术报告</strong><small>在线阅读 · 打印 / 保存为 PDF</small></span><ArrowUpRight/></a><a href="#demo"><Play/><span><strong>现场演示与服务记录</strong><small>完整操作流程 · JSON 导出</small></span><ArrowUpRight/></a></div></div></section>
    </main><footer className="site-footer"><a className="brand" href="#overview"><span className="brand-symbol">H<span>·</span></span><span>HUMANOID<small>SMART SERVICE SYSTEM</small></span></a><p>人形机器人智慧运维与任务服务系统<br/><span>物联网 3S · 技术创新演示</span></p><a href="#overview">回到顶部 ↑</a></footer>
    <dialog className="photo-dialog" ref={dialog} onCancel={() => setPhoto(null)} onClose={() => { setPhoto(null); photoTrigger.current?.focus() }} onClick={e => { if (e.target === e.currentTarget) setPhoto(null) }}>{photo && <><button className="dialog-close" aria-label="关闭照片" onClick={() => setPhoto(null)}><X/></button><img src={asset(`media/project-evidence/${photo[0]}-1280.webp`)} alt={photo[2]}/><h3>{photo[2]}</h3><p>{photo[3]}</p></>}</dialog>
  </div>
}
