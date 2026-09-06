import React, { useState } from 'react'
import { ArrowDown, ArrowUpRight, Check, ChevronRight, ScanLine, Layers3, SlidersHorizontal, CircleCheck, Cable } from 'lucide-react'
import './engineering.css'

export const technicalSources = {
  paper: 'https://arxiv.org/html/2504.17249v1',
  foc: '#solution',
  timing: '#solution',
  onboard: '#solution',
  packages: '#solution',
  sim: '#solution',
}
const layerDetails = [
  {
    title: '让机械关节成为可识别的设备节点',
    steps: ['编码器读取', '电流采样', '姿态感知', '对象映射'],
    mechanism: [
      ['关节反馈', '编码器描述转子位置，电流反映驱动负载。将状态绑定到关节对象，才能把异常定位到具体设备部位。'],
      ['独立姿态支路', '机身 IMU 提供运动与姿态信息，经独立 USB 支路汇入机载计算，不通过关节侧 CAN 控制器。'],
      ['模块化执行单元', '电机、减速器与驱动构成关节模块；服务记录可以围绕模块组织检查项与维护历史。'],
    ],
    mapping: '本演示把右膝作为温升场景对象，机身 IMU 与 CAN 通信作为全机诊断对象；点击其他关节查看的是预设模拟状态。',
    boundary: '页面温度、电流、丢包率和倾角均由模拟器生成。资料中的感知链路不等于本网页已经接通传感器；温度测点及实机字段仍需单独核对。',
    href: technicalSources.paper, source: '系统设计 · III-A',
  },
  {
    title: '把快速电机控制留在关节侧',
    steps: ['目标位置 / 力矩', '电流目标', 'FOC 电流调节', '逆变器驱动'],
    mechanism: [
      ['外环与内环', '位置 PD 控制形成力矩需求，电流控制负责驱动执行。位置跟踪与快速电流调节承担不同职责。'],
      ['坐标变换', 'FOC 将相电流变换到旋转的 d/q 坐标系，用电流误差调节电压，再通过逆变换和 PWM 驱动三相电机。'],
      ['实时预算', '编码器通信、计算和调制必须纳入固件执行时序。板端控制周期不能用网页刷新周期或 CAN 状态通信周期替代。'],
    ],
    mapping: '智慧服务侧观察负载与温度等状态，给出检查建议；快速电流环和本体运动控制仍属于嵌入式控制职责。',
    boundary: '这里展示 FOC 的系统原理，不在浏览器运行电流控制器，也不将文档中的固件测量结果当作本项目的控制性能。',
    href: technicalSources.foc, source: 'FOC 原理 · 电流与位置环',
  },
  {
    title: '按肢体分段通信，按节点核对连接',
    steps: ['关节节点', '四路 CAN 2.0', 'USB-CAN', '机载计算'],
    mechanism: [
      ['分段汇聚', '四肢分别通过 CAN 支路连接机载端。论文配置为每路 1 Mbps；这是链路速率，不是每个传感字段的采样率。'],
      ['对象寻址', '机载文档按 CAN 端口和节点 ID 检查执行器连接。端口与 ID 的组合为服务侧建立设备映射提供依据。'],
      ['两类通信入口', '关节反馈通过 CAN/USB-CAN 汇入，IMU 单独经 USB 接入。两个入口在机载端对齐，避免混淆数据来源。'],
    ],
    mapping: '通信异常演示通过模拟丢包率触发告警，工单要求检查总线连接与节点，展示从通信事件到维护动作的关联。',
    boundary: '真实丢包统计还需要定义统计窗口、帧序列与超时规则。分段连接不自动等于已实现故障隔离或冗余容错。',
    href: technicalSources.onboard, source: '机载接口 · CAN 与 IMU',
  },
  {
    title: '状态通信与策略推理分频运行',
    steps: ['本体反馈', '状态组织', '运动策略', '关节目标'],
    mechanism: [
      ['机载汇聚', 'Intel N95 汇聚关节与机身反馈。论文给出执行器和 IMU 的 250 Hz 通信配置，对应约 4 ms 一个周期。'],
      ['策略输入输出', '运动策略结合机身角速度、重力方向、关节位置与速度，以及用户速度指令和前一时刻动作，输出目标关节位置。'],
      ['验证链路', '开发资料将训练环境、模型资产和本体低层代码分开。MuJoCo 跨仿真验证检查策略与接口行为，再进入本体部署验证。'],
    ],
    mapping: '论文策略为 25 Hz，约 40 ms 一次推理；本网页的运维视图每秒更新一个模拟样本，面向解释和服务流程。',
    boundary: '论文实验使用 Isaac Gym，当前文档的软件目录使用 Isaac Lab；二者是不同版本背景。网页未加载运动策略，跨仿真验证也不能代替实机测试。',
    href: technicalSources.packages, source: '软件架构 · 三类工程模块',
  },
  {
    title: '把状态快照转化为可追溯的服务动作',
    steps: ['状态快照', '规则判定', '任务与工单', '复检归档'],
    mechanism: [
      ['同一上下文', '一轮演示使用同一运行编号，工单保存异常类型、目标部件、创建时间和触发指标，事件时间线记录阶段转换。'],
      ['人工确认', '异常发生后由用户确认暂停任务，再生成维护工单；页面操作只改变本地演示任务状态。'],
      ['复检约束', '检查项全部完成后才能复检。故障样本不通过，工单保持打开；恢复样本通过后，才允许归档并恢复演示任务。'],
    ],
    mapping: '本次已实现：三类异常、无异常巡检、失败后重试、自动演示、JSON 导出，以及当前浏览器最近五条归档记录。',
    boundary: '尚未实现实机遥测适配、远程命令确认、多用户权限和服务端审计。现场控制仍需独立设计设备反馈与保护机制。',
    href: '#demo', source: '进入可运行演示',
  },
]

function SourceLink({ href, children }) { return <a className="engineering-link" href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}<ArrowUpRight size={14}/></a> }

export function SystemOverview() {
  return <div className="system-overview">
    <div className="engineering-intro"><span>系统目标</span><p>让分布式关节可识别、状态链路可解释，并把异常处置落到任务、部件和复检记录。</p></div>
    <div className="system-route" role="group" aria-label="关节 CAN 与机身 IMU 双支路在机载端汇聚，浏览器采用独立模拟入口">
      <div className="route-branches"><div><span>关节支路</span><strong>编码器 / 相电流</strong><small>关节控制器 → CAN → USB-CAN</small></div><div><span>机身支路</span><strong>IMU 姿态反馈</strong><small>独立 USB 接口</small></div></div>
      <span className="route-connector" aria-hidden="true">→</span>
      <div className="route-computer"><span>本体计算</span><strong>Intel N95</strong><small>反馈汇聚 · 低层控制 · 策略推理</small></div>
      <span className="route-connector route-pending" aria-hidden="true">⇢</span>
      <div className="route-service"><span>智慧服务展示</span><strong>浏览器服务台</strong><small>当前输入：本地模拟器</small><em>遥测适配待接入</em></div>
    </div>
    <div className="rate-grid" aria-label="各层频率与实现状态对照">
      {[
        ['4 × CAN', '分布式连接', '每路 1 Mbps · 论文配置'],
        ['250 Hz', '状态通信', '约 4 ms / 周期 · 论文配置'],
        ['25 Hz', '运动策略', '约 40 ms / 周期 · 论文实验'],
        ['1 秒', '服务视图采样', '本次网页实现 · 模拟数据'],
      ].map(([value, name, note]) => <div key={name}><strong>{value}</strong><span>{name}</span><small>{note}</small></div>)}
    </div>
    <div className="engineering-footnote"><p>不同层级承担不同时间尺度的任务。上述频率不代表端到端时延，也不能用来证明本网页具备实机实时控制能力。</p><SourceLink href={technicalSources.paper}>论文 III-A / V-A</SourceLink></div>
    <p className="layer-instruction">选择下面的系统层，查看实现机制、服务映射和接入条件<ArrowDown size={15}/></p>
  </div>
}

export function LayerDeepDive({ index }) {
  const item = layerDetails[index]
  const icons = [ScanLine, Layers3, SlidersHorizontal]
  return <div className="layer-deep-dive" key={index} data-layer-detail={index}>
    <div className="layer-heading-line"><span>机制详解</span><span>0{index + 1} / 05</span></div>
    <h3>{item.title}</h3>
    <ol className="mechanism-flow">{item.steps.map((step, i) => <li key={step} style={{ '--step': i }}><span><i aria-hidden="true">{String(i + 1).padStart(2, '0')}</i>{step}</span>{i < item.steps.length - 1 && <ChevronRight size={15} aria-hidden="true"/>}</li>)}</ol>
    <div className="mechanism-grid">{item.mechanism.map(([title, text], i) => { const Icon = icons[i]; return <div key={title} className="mechanism-card" style={{ '--card': i }}><div className="mechanism-card-top"><Icon size={20} strokeWidth={1.4} aria-hidden="true"/><span>0{i + 1}</span></div><h4>{title}</h4><p>{text}</p></div> })}</div>
    <div className="layer-service-map"><div><span><CircleCheck size={17} aria-hidden="true"/>对应本次演示</span><p>{item.mapping}</p></div><div><span><Cable size={17} aria-hidden="true"/>实现条件与边界</span><p>{item.boundary}</p></div></div>
    <SourceLink href={item.href}>{item.source}</SourceLink>
  </div>
}

const hardwareDesigns = [
  {
    title: '模块化执行器与可维护结构', tag: '本体已有设计',
    problem: '人形机器人关节多，单点维护与结构调整会影响整机集成效率。',
    mechanism: '将驱动、减速与机械连接组织为关节模块。摆线传动利用多齿分担负载，为可制造性与结构强度之间提供一种折中。',
    value: '服务对象可落实到具体模块，便于记录更换、检查与复检过程。模块化本身是平台技术特点，不计为本次软件原创成果。',
    validation: '需要关注齿隙、磨损、温升和持续负载。论文也指出长期热效应研究不足，不能仅凭模块化结构推断寿命。',
    href: technicalSources.paper, source: '设计与局限 · III / VI',
  },
  {
    title: '端侧控制与机载决策分工', tag: '本体已有架构',
    problem: '电机调节、状态汇聚与任务服务对响应速度的要求不同。',
    mechanism: '关节侧执行快速控制，机载端汇聚通信并运行策略，服务层处理人可理解的事件与处置流程。',
    value: '为物联网应用提供清晰的职责边界：设备执行、边缘计算、服务交互。当前网页保留这一分层表达。',
    validation: '需要分别测量板端循环、通信周期、策略耗时和服务响应；不能用其中一个频率代表整个系统的实时性。',
    href: technicalSources.timing, source: '固件执行时序说明',
  },
  {
    title: '训练、跨仿真与本体接口分离', tag: '软件栈已有方法',
    problem: '运动策略离开训练环境后，接口或动力学差异可能导致行为变化。',
    mechanism: '训练环境、机器人描述资产和低层代码分包；跨仿真验证把策略放入 MuJoCo，模拟用户输入与策略交互。',
    value: '先核对输入输出与状态转换，再开展硬件验证；可为后续接入建立可重复的工程验证流程。',
    validation: '跨仿真通过只是中间证据。本项目还未完成实机接入或策略实验，不能据此宣称已经实现自主巡检。',
    href: technicalSources.sim, source: '跨仿真验证文档',
  },
]
const serviceDesigns = [
  {
    title: '可解释的多状态诊断', tag: '本次软件已实现',
    problem: '单一告警读数缺少部件位置和运行上下文，难以直接形成维护建议。',
    mechanism: '温升场景同时显示温度与电流越限，并列展示通信与姿态状态；规则阈值和触发读数始终可查看。',
    value: '把“发生异常”展开为“哪个对象、哪些指标、建议检查什么”，降低理解与复盘成本。',
    validation: '目前为预设场景与透明阈值规则，没有学习模型或实测准确率；诊断说明是风险线索，不能作为故障根因证明。',
    href: '#demo', source: '运行关节温升场景',
  },
  {
    title: '异常与任务、工单联动', tag: '本次软件已实现',
    problem: '监测、任务操作和维护记录分离时，人员需要反复整理同一轮异常信息。',
    mechanism: '状态机约束“告警 → 确认暂停 → 生成工单”。工单继承运行编号、异常对象与触发快照，保留处理上下文。',
    value: '服务流程围绕同一事件连续推进，避免未暂停就进入维护或跳过必要阶段。',
    validation: '当前是浏览器内任务状态联动，不是设备命令确认。真实接入后必须增加命令回执、设备状态核对与超时处理。',
    href: '#demo', source: '体验任务与工单联动',
  },
  {
    title: '复检约束与过程追溯', tag: '本次软件已实现',
    problem: '填写“已处理”并不能证明异常已经消除，缺少复检会使维护流程过早结束。',
    mechanism: '全部检查项完成后才能复检；故障仍在时拒绝归档，恢复样本通过后才允许关闭工单并恢复演示任务。',
    value: '把处置结果放回规则中核验，用时间线和 JSON 导出保存决策路径，支持现场答辩与过程复盘。',
    validation: '已实现失败与通过两条软件路径。真实效果需采集原始遥测；本机记录不等于服务端审计，也不跨设备同步。',
    href: '#demo', source: '验证复检失败与恢复路径',
  },
]

export function InnovationStudy() {
  const [perspective, setPerspective] = useState('service')
  const [expanded, setExpanded] = useState(0)
  const designs = perspective === 'service' ? serviceDesigns : hardwareDesigns
  return <div className="innovation-study">
    <div className="design-perspectives" role="group" aria-label="创新设计内容分类">
      <button aria-pressed={perspective === 'service'} onClick={() => { setPerspective('service'); setExpanded(0) }}>智慧服务设计<span>本次软件实现</span></button>
      <button aria-pressed={perspective === 'hardware'} onClick={() => { setPerspective('hardware'); setExpanded(0) }}>机器人技术设计<span>本体资料中的技术基础</span></button>
    </div>
    <p className="design-intro">{perspective === 'service' ? '本次设计重点是让异常成为可执行、可复检、可追溯的服务流程。以下说明对应当前页面已有功能，创新效果需通过后续对照实验验证。' : '以下总结机器人资料中的既有技术特点，用于解释系统基础与设计取舍；它们不作为本次网页的原创技术或实测成果。'}</p>
    <div className="design-accordion" key={perspective}>
      {designs.map((item, i) => <article className={`design-item ${expanded === i ? 'is-expanded' : ''}`} key={item.title}>
        <h3><button aria-expanded={expanded === i} aria-controls={`design-body-${perspective}-${i}`} onClick={() => setExpanded(expanded === i ? null : i)}><span className="design-number">0{i + 1}</span><span>{item.title}<small>{item.tag}</small></span><span className="design-toggle" aria-hidden="true">{expanded === i ? '−' : '+'}</span></button></h3>
        <div id={`design-body-${perspective}-${i}`} className="design-body" hidden={expanded !== i}>
          <dl>{[['问题', item.problem], ['机制', item.mechanism], ['价值', item.value], ['验证与边界', item.validation]].map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}</dl>
          <SourceLink href={item.href}>{item.source}</SourceLink>
        </div>
      </article>)}
    </div>
    <div className="validation-matrix"><div className="validation-heading"><span>验证设计</span><h3>让创新主张有可检查的依据</h3></div><div className="validation-table-wrap"><table><caption>当前软件验证与后续实机验证计划</caption><thead><tr><th scope="col">验证对象</th><th scope="col">检查方式</th><th scope="col">当前状态</th></tr></thead><tbody>
      <tr><th scope="row">服务流程完整性</th><td>三种异常、正常巡检、非法跳转与失败复检</td><td><span className="validation-done"><Check size={13}/>软件自动检查覆盖</span></td></tr>
      <tr><th scope="row">诊断效果</th><td>实机标注数据，对照误报率与漏报率</td><td>待接入与标定</td></tr>
      <tr><th scope="row">系统响应</th><td>统一时间戳，分别记录采样、判定与处置延迟</td><td>待实测</td></tr>
      <tr><th scope="row">维护服务价值</th><td>与人工流程对照处置耗时、遗漏项与记录完整性</td><td>待用户试验</td></tr>
    </tbody></table></div></div>
  </div>
}

export function ReportTechnicalSupplement() {
  return <section className="report-technical-supplement"><h2>技术补充：从本体架构到智慧服务</h2><p>技术方案按感知、嵌入式控制、通信汇聚、机载计算和浏览器服务分层。关节侧组织编码器、电流与驱动控制，机身姿态使用独立 IMU 支路。四路 CAN 与 USB IMU 在机载端汇聚；本网页使用独立的模拟数据入口，真实遥测适配尚未完成。</p><p>频率必须按层级解释：论文配置的执行器与 IMU 通信为 250 Hz，策略推理为 25 Hz；本次服务视图每秒产生一个模拟样本。电机侧 FOC 属于独立控制时序，这些数值都不是网页到实机的端到端时延。</p><p>本体已有技术包括模块化关节、分层控制和仿真验证流程；本次软件设计包括透明规则、多状态解释、任务与工单上下文继承，以及复检失败时阻止归档。两类内容分别展示，不将平台已有技术或论文实验作为本次软件原创成果。</p><p>后续验证需要统一采样与事件时间戳，明确丢包统计窗口和状态新鲜度，采集真实正常与异常样本。通过误报率、漏报率、处置耗时与记录完整性评价效果；在这些实验完成前，不给出性能提升比例。</p><p>版本说明：论文行走实验使用 Isaac Gym；当前开发文档介绍 Isaac Lab 任务包及 MuJoCo 跨仿真验证。页面分别标注资料背景，不混用为同一次本项目实验。</p><p>技术依据：<a href={technicalSources.paper}>系统设计与实验论文</a> · <a href={technicalSources.foc}>FOC 控制说明</a> · <a href={technicalSources.onboard}>机载通信接口</a> · <a href={technicalSources.sim}>跨仿真验证</a>。</p></section>
}
