import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  CirclePlay,
  CircuitBoard,
  ClipboardCheck,
  Copy,
  Cpu,
  ExternalLink,
  Github,
  Layers3,
  Menu,
  Pause,
  Play,
  Printer,
  Radio,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  Sparkles,
  TerminalSquare,
  X,
  Zap,
} from 'lucide-react'

const HumanoidLab = React.lazy(() => import('./HumanoidLab.jsx'))
const assetUrl = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

class TwinErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="twin-chunk-placeholder twin-chunk-placeholder--error" role="alert">
          <ScanLine size={24} />
          <strong>3D ENGINE UNAVAILABLE</strong>
          <small>模型引擎加载失败，请刷新页面重试；其他内容仍可正常浏览。</small>
        </div>
      )
    }

    return this.props.children
  }
}

const LINKS = {
  site: 'https://lite.berkeley-humanoid.org/',
  docs: 'https://berkeley-humanoid-lite.gitbook.io/docs',
  github: 'https://github.com/HybridRobotics/Berkeley-Humanoid-Lite',
  paper: 'https://arxiv.org/abs/2504.17249',
  video: 'https://youtu.be/dIdJGkMDFl4',
  releases: 'https://berkeley-humanoid-lite.gitbook.io/docs/releases',
  bom: 'https://berkeley-humanoid-lite.gitbook.io/docs/getting-started-with-hardware/materials-and-parts-bom',
  print: 'https://berkeley-humanoid-lite.gitbook.io/docs/getting-started-with-hardware/3d-printing-instructions',
  actuator: 'https://berkeley-humanoid-lite.gitbook.io/docs/getting-started-with-hardware/building-the-actuator',
  assembly: 'https://berkeley-humanoid-lite.gitbook.io/docs/getting-started-with-hardware/building-the-robot',
  flash: 'https://berkeley-humanoid-lite.gitbook.io/docs/getting-started-with-hardware/flashing-the-motor-controllers',
  software: 'https://berkeley-humanoid-lite.gitbook.io/docs/getting-started-with-software',
  training: 'https://berkeley-humanoid-lite.gitbook.io/docs/getting-started-with-software/training-environment',
  sim2sim: 'https://berkeley-humanoid-lite.gitbook.io/docs/getting-started-with-software/sim2sim-validation',
}

const navItems = [
  { id: 'robot', label: '项目', code: '01' },
  { id: 'iot-showcase', label: '信号链路', code: '02' },
  { id: 'smart-service', label: '智慧服务', code: '03' },
  { id: 'digital-twin', label: '数字展品', code: '04' },
  { id: 'capabilities', label: '实机证据', code: '05' },
  { id: 'design', label: '系统解剖', code: '06' },
  { id: 'stack', label: '开放栈', code: '07' },
  { id: 'build', label: '构建', code: '08' },
  { id: 'source', label: '来源', code: '09' },
]

const PRESENTATION_STEP_MS = 7_500

const presentationSteps = [
  { id: 'robot', code: '01', label: '平台定位', note: '从人形机器人进入物联网系统' },
  { id: 'iot-showcase', code: '02', label: '信号链路', note: '感知、控制、总线、边缘与展示' },
  { id: 'smart-service', code: '03', label: '智慧服务', note: '感知、诊断、决策、工单与复检闭环' },
  { id: 'digital-twin', code: '04', label: '数字展品', note: '官方 URDF 与分件网格在浏览器本地组装' },
  { id: 'capabilities', code: '05', label: '实机证据', note: '用官方实验素材证明平台能力' },
  { id: 'design', code: '06', label: '系统解剖', note: '结构、真实执行器与可重构形态' },
  { id: 'stack', code: '07', label: '开放软件栈', note: '从 CAD、固件到仿真和实机' },
  { id: 'build', code: '08', label: '开放构建', note: '把展示落到可复现的官方路径' },
  { id: 'source', code: '09', label: '官方入口', note: '所有模型、参数与结论回到原始资料' },
]

const heroMetrics = [
  { value: '22', unit: 'JOINTS', label: '驱动关节' },
  { value: '4', unit: '× CAN', label: '独立现场总线' },
  { value: '1', unit: 'EDGE', label: 'Intel N95 机载计算' },
  { value: '0.8', unit: 'm', label: '整机高度' },
]

const anatomyParts = [
  {
    index: '01',
    tag: 'ACTUATION',
    title: '22 个驱动关节',
    copy: '10 × 6512 与 12 × 5010 两种模块化摆线执行器，构成双腿、双臂与全身运动链。',
    meta: '10 / 12',
    metaLabel: '6512 / 5010',
    markerX: '50%',
    markerY: '62%',
    markerLabel: '22 JOINTS',
    focusX: '-2%',
    focusY: '-4%',
    focusZoom: '1.06',
  },
  {
    index: '02',
    tag: 'ONBOARD COMPUTE',
    title: 'Intel N95 机载计算',
    copy: '紧凑型 x86 mini PC 在机器人本体上汇聚传感反馈，并完成低层控制与策略推理。',
    meta: '250',
    metaLabel: 'HZ · PAPER I/O',
    markerX: '57%',
    markerY: '27%',
    markerLabel: 'INTEL N95',
    focusX: '-5%',
    focusY: '7%',
    focusZoom: '1.14',
  },
  {
    index: '03',
    tag: 'NERVOUS SYSTEM',
    title: '四路 CAN 2.0',
    copy: '四条独立 CAN 总线经 USB-CAN 连接执行器，平衡带宽、布线与可维护性。',
    meta: '1.0',
    metaLabel: 'MBPS / BUS',
    markerX: '49%',
    markerY: '38%',
    markerLabel: '4× CAN BUS',
    focusX: '2%',
    focusY: '3%',
    focusZoom: '1.12',
  },
  {
    index: '04',
    tag: 'ENERGY',
    title: '可移动电源系统',
    copy: '6S 4000 mAh LiPo 支撑约 30 分钟运行，也可在固定实验中接入外部电源。',
    meta: '6S',
    metaLabel: '4000 MAH',
    markerX: '54%',
    markerY: '47%',
    markerLabel: '6S BATTERY',
    focusX: '-3%',
    focusY: '-1%',
    focusZoom: '1.1',
  },
]

const actuatorProof = [
  { value: '≈90%', label: '多数工况机械效率' },
  { value: '319.49', unit: 'N·m/rad', label: '6512 传动刚度' },
  { value: '60 h', label: '单执行器台架耐久测试' },
]

const stackNodes = [
  {
    icon: Printer,
    code: '01',
    name: 'CAD & PRINT',
    title: '从几何开始开放',
    copy: 'Onshape、CAD 与 MakerWorld 3MF 让机械结构可以被检查、打印和重新设计。',
    tags: ['ONSHAPE', '3MF', 'PLA / FDM'],
  },
  {
    icon: CircuitBoard,
    code: '02',
    name: 'FOC & CAN',
    title: '关节控制不是黑盒',
    copy: 'STM32 电机控制器固件、低层驱动、关节标定与 CAN 通信协议均有开放实现。',
    tags: ['STM32G431', 'FOC', 'CAN 2.0'],
  },
  {
    icon: Sparkles,
    code: '03',
    name: 'ISAAC LAB',
    title: '在大规模仿真中训练',
    copy: 'Isaac Sim / Isaac Lab 与 RSL-RL 组成强化学习训练管线，策略以 PPO 学习全身运动。',
    tags: ['ISAAC SIM', 'RSL-RL', 'PPO'],
  },
  {
    icon: Layers3,
    code: '04',
    name: 'SIM2SIM',
    title: '先跨引擎验证',
    copy: '在部署前用 MuJoCo 进行 sim-to-sim 验证，提前发现模型、关节方向和控制接口问题。',
    tags: ['MUJOCO', 'URDF', 'MJCF / USD'],
  },
  {
    icon: Cpu,
    code: '05',
    name: 'REAL ROBOT',
    title: '策略落在机器人本体',
    copy: '导出 ONNX 后在 Intel N95 以 25 Hz 推理；论文展示了无需实机微调的 zero-shot sim-to-real。',
    tags: ['ONNX', '25 HZ · PAPER', 'ZERO-SHOT'],
  },
]

const buildSteps = [
  {
    number: '01',
    label: 'SOURCE',
    title: '准备 BOM 与工具',
    copy: '从官方 BOM 核对地区价格、执行器零件、电子件和安全设备。',
    href: LINKS.bom,
    meta: 'BOM / TOOLS',
  },
  {
    number: '02',
    label: 'PRINT',
    title: '打印结构与关节',
    copy: '全部自定义打印件适配至少 200 × 200 × 200 mm 的桌面 FDM 打印空间。',
    href: LINKS.print,
    meta: 'PLA / FDM',
  },
  {
    number: '03',
    label: 'ASSEMBLE',
    title: '装执行器与整机',
    copy: '先验证两类摆线执行器，再完成双腿、双臂、机身和线束装配。',
    href: LINKS.assembly,
    meta: 'MECHANICAL',
  },
  {
    number: '04',
    label: 'FLASH',
    title: '刷写、标定与联机',
    copy: '为每个关节写入正确 CAN ID 与电机配置，随后完成电气偏置和零位标定。',
    href: LINKS.flash,
    meta: 'FIRMWARE / CAN',
  },
  {
    number: '05',
    label: 'DEPLOY',
    title: '训练并部署策略',
    copy: '搭建 Isaac Lab 环境，经 MuJoCo 验证后，将导出的策略部署到机载电脑。',
    href: LINKS.training,
    meta: 'SIM → REAL',
  },
]

const buildEvidence = [
  {
    code: '01',
    stage: 'PARTS',
    title: '部件成组准备',
    copy: '结构件、轴承与紧固位按批次整理，装配从可核对的实物开始。',
    asset: 'media/project-evidence/build-parts',
    alt: '工作台上成组摆放的白色关节结构件与轴承组件',
    position: '50% 35%',
  },
  {
    code: '02',
    stage: 'NODE ARRAY',
    title: '关节节点接线',
    copy: '多组电机、控制板与传感接口进入工作台接线和逐节点检查。',
    asset: 'media/project-evidence/build-nodes',
    alt: '工作台上的多组电机、控制板、传感接口与接线工具',
    position: '50% 55%',
  },
  {
    code: '03',
    stage: 'SUBSYSTEM',
    title: '肢体子系统集成',
    copy: '关节模块、线束和夹爪组合为可独立检查的手臂子系统。',
    asset: 'media/project-evidence/build-limb',
    alt: '工作台上完成机械装配与接线的人形机器人手臂和夹爪',
    position: '50% 48%',
  },
]

const morphologies = [
  { id: 'biped', label: '双足', code: '01', copy: '论文实机形态', status: 'REAL HARDWARE', verified: true, asset: 'media/morph-biped.png' },
  { id: 'quadruped', label: '四足', code: '02', copy: '论文可重构示例', status: 'PAPER CONCEPT', verified: false, asset: 'media/morph-quadruped.png' },
  { id: 'centaur', label: '半人马式', code: '03', copy: '论文可重构示例', status: 'PAPER CONCEPT', verified: false, asset: 'media/morph-centaur.png' },
  { id: 'mobile', label: '轮式底盘', code: '04', copy: '论文可重构示例', status: 'PAPER CONCEPT', verified: false, asset: 'media/morph-mobile.png' },
]

const iotLayers = [
  {
    id: 'sense',
    code: '01',
    icon: Radio,
    eyebrow: 'DEVICE / SENSING',
    title: '关节与机身状态，先被可靠感知。',
    short: '感知层',
    metric: '22 AXES',
    copy: '执行器磁编码器与相电流采样提供关节反馈，机身 IMU 独立提供姿态与运动状态；两条感知支路在机载端汇聚。',
    tags: ['JOINT ENCODER', 'PHASE CURRENT', 'IMU / USB'],
    payload: ['关节位置', '相电流', '机身姿态'],
    photo: 'media/project-evidence/physical-device',
    photoLabel: 'DEVICE / INTERFACE BOARDS',
    photoTitle: '板卡节点成组准备',
    photoCopy: '控制板与接口小板的实物记录，对应系统的设备与感知入口。',
    photoAlt: '成排摆放的蓝色控制板、白色接口小板与彩色线束',
    photoPosition: '50% 56%',
  },
  {
    id: 'control',
    code: '02',
    icon: CircuitBoard,
    eyebrow: 'EMBEDDED / CONTROL',
    title: '每个执行器，都是一个嵌入式节点。',
    short: '控制层',
    metric: 'STM32',
    copy: 'STM32G431 电机控制器在关节侧完成 FOC、电机配置、编码器读取与状态回传；CAN ID 让每个节点在整机中可被识别。',
    tags: ['STM32G431', 'FOC', 'CAN ID'],
    payload: ['电机配置', '关节状态', '节点标识'],
    photo: 'media/project-evidence/physical-actuator',
    photoLabel: 'CONTROL / JOINT NODE',
    photoTitle: '控制进入单个关节',
    photoCopy: '电机、结构件、传感接口与线束汇成可独立装配的执行节点。',
    photoAlt: '带电机、结构件、传感接口和线束的单个关节实物',
    photoPosition: '50% 50%',
  },
  {
    id: 'bus',
    code: '03',
    icon: Layers3,
    eyebrow: 'FIELD BUS / NETWORK',
    title: '四路 CAN，把分布式关节连成整机。',
    short: '网络层',
    metric: '4 × CAN',
    copy: '四条独立 CAN 2.0 总线通过 USB-CAN 接入机载电脑，以分段网络平衡带宽、布线和故障隔离。',
    tags: ['CAN 2.0', '1 MBPS / BUS', 'USB-CAN'],
    payload: ['状态帧', '配置帧', '总线分段'],
    photo: 'media/project-evidence/physical-network',
    photoLabel: 'NETWORK / MULTI-NODE BENCH',
    photoTitle: '多节点进入同一链路',
    photoCopy: '多组电机、控制板与线束并列，直观看见分布式节点的接线规模。',
    photoAlt: '工作台上并列接线的多组电机、控制板与传感小板',
    photoPosition: '50% 50%',
  },
  {
    id: 'edge',
    code: '04',
    icon: Cpu,
    eyebrow: 'EDGE / COMPUTE',
    title: '计算留在机器人本体，形成边缘智能。',
    short: '边缘层',
    metric: 'INTEL N95',
    copy: '机载 x86 计算机汇聚 CAN 关节反馈与 USB IMU 状态，完成低层控制和策略推理；关键运动闭环不依赖远端云端。',
    tags: ['250 HZ I/O · PAPER', '25 HZ POLICY · PAPER', 'ON-ROBOT'],
    payload: ['反馈汇聚', '策略推理', '运动接口'],
    photo: 'media/project-evidence/physical-system',
    photoLabel: 'EDGE / ON-ROBOT INTEGRATION',
    photoTitle: '计算与线束汇入机身',
    photoCopy: '整机实物记录呈现机身载荷、分布式关节与线束的物理汇聚。',
    photoAlt: '正面直立的人形机器人整机、机身计算载荷与外露线束',
    photoPosition: '50% 26%',
  },
  {
    id: 'twin',
    code: '05',
    icon: ScanLine,
    eyebrow: 'EXHIBITION / DIGITAL MODEL',
    title: '浏览器把复杂系统变成可理解的数字展品。',
    short: '展示层',
    metric: 'URDF + STL',
    copy: '本展示层读取官方 URDF 关节树与 26 个 STL 网格，通过 Three.js 解释结构、动作和数据链路；它是原理可视化，不冒充实时遥测。',
    tags: ['OFFICIAL ASSETS', 'THREE.JS', 'EXPLAINER'],
    payload: ['结构导览', '动作演示', '来源追溯'],
    photo: 'media/project-evidence/physical-mapping',
    photoLabel: 'PHYSICAL OBJECT / DIGITAL MAPPING',
    photoTitle: '实物对象成为数字入口',
    photoCopy: '整机铺开后的结构关系，为数字模型、部件定位与服务记录提供对象基础。',
    photoAlt: '平放展开的人形机器人整机、关节模块与分布式线束',
    photoPosition: '50% 48%',
  },
]

const serviceMetrics = [
  { id: 'temperature', code: 'T-J12', label: '关节温度', unit: '°C', digits: 1, min: 30, max: 85, threshold: '< 65 °C' },
  { id: 'current', code: 'I-J12', label: '驱动电流', unit: 'A', digits: 1, min: 0, max: 14, threshold: '< 8.0 A' },
  { id: 'packetLoss', code: 'CAN-L', label: 'CAN 丢包', unit: '%', digits: 1, min: 0, max: 12, threshold: '< 2.0 %' },
  { id: 'tilt', code: 'IMU-X', label: '机身倾角', unit: '°', digits: 1, min: 0, max: 18, threshold: '< 6.0 °' },
]

const serviceScenarios = [
  {
    id: 'normal',
    code: 'S0',
    label: '常规巡检',
    tone: 'stable',
    target: '全身节点',
    severity: '状态稳定',
    health: 96,
    triggerMetric: null,
    diagnosis: '各项指标处于演示阈值内',
    reason: '规则引擎未发现需要处置的异常项，可完成本轮巡检并归档。',
    action: '维持当前工作状态，按计划进入下一轮巡检。',
    steps: ['记录本轮健康快照', '保持周期采样', '等待下一轮巡检'],
    values: {
      temperature: [42.8, 0.7],
      current: [3.6, 0.35],
      packetLoss: [0.2, 0.08],
      tilt: [1.3, 0.25],
    },
  },
  {
    id: 'thermal',
    code: 'S1',
    label: '关节温升',
    tone: 'danger',
    target: '右膝关节 J12',
    severity: '高风险',
    health: 62,
    triggerMetric: 'temperature',
    diagnosis: '持续温升触发关节热风险',
    reason: '右膝关节温度连续高于 65 °C 演示阈值，驱动电流同步升高。',
    action: '降低关节负载并暂停高强度动作，待温度回落后复检。',
    steps: ['降低关节负载', '检查散热与传动阻力', '温度回落后复检'],
    values: {
      temperature: [76.4, 1.3],
      current: [7.2, 0.55],
      packetLoss: [0.3, 0.1],
      tilt: [1.8, 0.3],
    },
  },
  {
    id: 'can',
    code: 'S2',
    label: 'CAN 波动',
    tone: 'warning',
    target: '右腿 CAN 支路',
    severity: '通信告警',
    health: 71,
    triggerMetric: 'packetLoss',
    diagnosis: '通信丢包触发支路异常',
    reason: '右腿 CAN 支路丢包率超过 2.0% 演示阈值，状态帧连续性下降。',
    action: '切换安全站姿并检查支路连接、终端电阻与接口状态。',
    steps: ['保持安全站姿', '检查 CAN 接口与线束', '恢复通信后复检'],
    values: {
      temperature: [45.1, 0.8],
      current: [4.2, 0.4],
      packetLoss: [8.1, 1.1],
      tilt: [2.1, 0.35],
    },
  },
  {
    id: 'pose',
    code: 'S3',
    label: '姿态偏移',
    tone: 'warning',
    target: '机身 IMU',
    severity: '姿态告警',
    health: 68,
    triggerMetric: 'tilt',
    diagnosis: '机身倾角触发稳定性风险',
    reason: '机身倾角持续超过 6.0° 演示阈值，需要中止当前动作并重新校准。',
    action: '停止动作、恢复支撑姿态并检查 IMU 安装与零偏。',
    steps: ['中止当前动作', '恢复支撑并检查 IMU', '重新校准后复检'],
    values: {
      temperature: [44.6, 0.7],
      current: [4.8, 0.45],
      packetLoss: [0.4, 0.12],
      tilt: [12.6, 1.0],
    },
  },
]

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span className="brand-mark__frame" />
      <span className="brand-mark__axis brand-mark__axis--x" />
      <span className="brand-mark__axis brand-mark__axis--y" />
      <strong>B</strong>
    </span>
  )
}

function SectionHeader({ index, eyebrow, title, copy, inverse = false }) {
  return (
    <div className={`section-header ${inverse ? 'section-header--inverse' : ''}`} data-index={index} data-reveal>
      <div className="section-header__meta">
        <span>{index}</span>
        <i />
        <small>{eyebrow}</small>
      </div>
      <div className="section-header__copy">
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
      </div>
    </div>
  )
}

function HeroRobot() {
  const stageRef = useRef(null)

  const onPointerMove = (event) => {
    if (!stageRef.current || event.pointerType === 'touch') return
    const rect = stageRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    stageRef.current.style.setProperty('--robot-x', `${x * 6}px`)
    stageRef.current.style.setProperty('--robot-y', `${y * 5}px`)
    stageRef.current.style.setProperty('--light-x', `${50 + x * 7}%`)
    stageRef.current.style.setProperty('--light-y', `${42 + y * 7}%`)
  }

  const reset = () => {
    if (!stageRef.current) return
    stageRef.current.style.setProperty('--robot-x', '0px')
    stageRef.current.style.setProperty('--robot-y', '0px')
    stageRef.current.style.setProperty('--light-x', '50%')
    stageRef.current.style.setProperty('--light-y', '42%')
  }

  return (
    <div className="hero-robot" ref={stageRef} onPointerMove={onPointerMove} onPointerLeave={reset}>
      <div className="hero-robot__field" />
      <div className="hero-robot__orbit hero-robot__orbit--one" />
      <div className="hero-robot__orbit hero-robot__orbit--two" />
      <div className="hero-robot__measure hero-robot__measure--height"><span>0.80 M</span></div>
      <img src={assetUrl('media/bhl-robot-cutout.png')} alt="Berkeley Humanoid Lite 实机正面" />
      <div className="robot-callout robot-callout--shoulder">
        <i />
        <div><span>FIELD BUS</span><strong>4 × CAN 2.0</strong></div>
      </div>
      <div className="robot-callout robot-callout--body">
        <i />
        <div><span>ONBOARD COMPUTER</span><strong>INTEL N95</strong></div>
      </div>
      <div className="robot-callout robot-callout--ankle">
        <i />
        <div><span>ACTUATED BODY</span><strong>22 JOINTS</strong></div>
      </div>
      <div className="hero-robot__caption">
        <span>OFFICIAL HARDWARE / V1</span>
        <small>UC BERKELEY · HYBRID ROBOTICS</small>
      </div>
    </div>
  )
}

function VideoFeature() {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(true)

  const toggle = async () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      try {
        await video.play()
        setPlaying(true)
      } catch {
        setPlaying(false)
      }
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  return (
    <article className="walk-film" data-reveal>
      <video
        ref={videoRef}
        src={assetUrl('media/bhl-walk.mp4')}
        poster={assetUrl('media/locomotion.png')}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        aria-label="Berkeley Humanoid Lite 双足行走官方演示"
      />
      <div className="walk-film__shade" />
      <div className="walk-film__head">
        <span><i /> OFFICIAL EXPERIMENT / LOCOMOTION</span>
        <small>REAL HARDWARE · 01</small>
      </div>
      <div className="walk-film__content">
        <div>
          <span className="micro-label">ZERO-SHOT SIM-TO-REAL</span>
          <h3>它真的走起来了。</h3>
          <p>强化学习策略跟随前后、横移和转向速度指令，并从仿真直接部署到实机。</p>
          <div className="chip-row">
            <span>25 HZ · PAPER</span>
            <span>≈30% TORQUE LIMIT · PAPER</span>
            <span>PPO</span>
          </div>
        </div>
        <button className="media-toggle" type="button" onClick={toggle} aria-label={playing ? '暂停步行视频' : '播放步行视频'}>
          {playing ? <Pause size={18} /> : <Play size={18} />}
          <span>{playing ? 'PAUSE' : 'PLAY'}</span>
        </button>
      </div>
    </article>
  )
}

function OperationTile({ className, number, eyebrow, title, meta }) {
  return (
    <article className={`operation-tile ${className}`} data-reveal>
      <div className="operation-tile__image" />
      <div className="operation-tile__shade" />
      <span className="operation-tile__number">{number}</span>
      <div className="operation-tile__content">
        <small>{eyebrow}</small>
        <h3>{title}</h3>
        <span>{meta}</span>
      </div>
    </article>
  )
}

function JointCoreVisual() {
  return (
    <div className="joint-core" aria-label="摆线执行器概念剖视图">
      <div className="joint-core__halo" />
      <div className="joint-core__ticks" aria-hidden="true">
        {Array.from({ length: 36 }, (_, index) => <i key={index} style={{ '--tick': index }} />)}
      </div>
      <div className="joint-core__ring joint-core__ring--outer">
        <span className="joint-core__dot" />
        <div className="joint-core__ring joint-core__ring--middle">
          <div className="joint-core__cycloid">
            {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--lobe': index }} />)}
            <div className="joint-core__hub">
              <small>REDUCTION</small>
              <strong>15:1</strong>
              <span>CYCLOIDAL</span>
            </div>
          </div>
        </div>
      </div>
      <div className="joint-core__label joint-core__label--top"><span>MOTOR</span><strong>M6C12 / 5010</strong></div>
      <div className="joint-core__label joint-core__label--right"><span>ENCODER</span><strong>AS5600</strong></div>
      <div className="joint-core__label joint-core__label--bottom"><span>CONTROLLER</span><strong>STM32G431</strong></div>
    </div>
  )
}

function PolicyTrace() {
  return (
    <div className="policy-trace" aria-hidden="true">
      <div className="policy-trace__top"><span>POLICY PATH / SCHEMATIC · NOT LIVE</span><strong>25 HZ · PAPER</strong></div>
      <svg viewBox="0 0 900 260" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trace-line" x1="0" x2="1">
            <stop offset="0" stopColor="#73cfff" stopOpacity="0" />
            <stop offset="0.18" stopColor="#73cfff" />
            <stop offset="0.78" stopColor="#fdb515" />
            <stop offset="1" stopColor="#fdb515" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="trace-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#73cfff" stopOpacity="0.2" />
            <stop offset="1" stopColor="#73cfff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="policy-trace__area" d="M0 165 C65 155 98 65 164 82 S271 226 348 175 S452 38 527 90 S627 230 704 163 S812 48 900 105 L900 260 L0 260 Z" />
        <path className="policy-trace__ghost" d="M0 165 C65 155 98 65 164 82 S271 226 348 175 S452 38 527 90 S627 230 704 163 S812 48 900 105" />
        <path className="policy-trace__live" d="M0 165 C65 155 98 65 164 82 S271 226 348 175 S452 38 527 90 S627 230 704 163 S812 48 900 105" />
      </svg>
      <div className="policy-trace__axis"><span>SIMULATION</span><i /><span>REAL ROBOT</span></div>
    </div>
  )
}

function MorphologyFigure({ morphology }) {
  return (
    <figure className={`morph-atlas is-${morphology.id}`} key={morphology.id}>
      <img
        src={assetUrl(morphology.asset)}
        alt={`论文中的 Berkeley Humanoid Lite ${morphology.label}构型`}
      />
      <span className="morph-atlas__focus" aria-hidden="true"><i /><i /><i /><i /></span>
      <figcaption>CHI ET AL. / RSS 2025 · CONFIGURATION STUDY</figcaption>
    </figure>
  )
}

function CopyLink({ value }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button className={`copy-link ${copied ? 'is-copied' : ''}`} type="button" onClick={copy} aria-label={copied ? '论文链接已复制' : '复制论文链接'}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
      <span>{copied ? '已复制' : '复制论文链接'}</span>
    </button>
  )
}

function IoTArchitecture({ activeIndex, setActiveIndex }) {
  const activeLayer = iotLayers[activeIndex]
  const ActiveIcon = activeLayer.icon

  return (
    <div className={`iot-architecture is-layer-${activeLayer.id}`} data-reveal>
      <div className="iot-architecture__truth">
        <div><ScanLine size={16} /><span>ARCHITECTURE EXPLAINER</span></div>
        <strong>展示官方系统链路，不连接真实机器人，不生成虚假遥测</strong>
        <small>OFFICIAL SOURCES / PROGRAMMATIC VISUALIZATION</small>
      </div>

      <div className="rail-hint rail-hint--iot"><span>05 SYSTEM LAYERS</span><strong>左右滑动 / SWIPE →</strong></div>
      <div className="iot-node-rail" role="tablist" aria-label="物联网系统分层">
        {iotLayers.map((layer, index) => {
          const Icon = layer.icon
          return (
            <React.Fragment key={layer.id}>
              <button
                className={activeIndex === index ? 'is-active' : ''}
                type="button"
                role="tab"
                aria-selected={activeIndex === index}
                onClick={() => setActiveIndex(index)}
              >
                <small>{layer.code}</small>
                <span><Icon size={19} /></span>
                <strong>{layer.short}</strong>
                <em>{layer.metric}</em>
              </button>
              {index < iotLayers.length - 1 && (
                <i className="iot-node-link" aria-hidden="true"><span /></i>
              )}
            </React.Fragment>
          )
        })}
      </div>

      <div className={`iot-layer-console is-layer-${activeLayer.id}`} data-code={activeLayer.code}>
        <div className="iot-layer-console__copy">
          <div className="iot-layer-console__path"><ActiveIcon size={16} /><span>{activeLayer.eyebrow}</span></div>
          <small>STEP {activeLayer.code} / 05</small>
          <h3>{activeLayer.title}</h3>
          <p>{activeLayer.copy}</p>
          <div className="chip-row">
            {activeLayer.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>

        <figure
          className={`iot-hardware-evidence is-${activeLayer.id}`}
          style={{ '--evidence-position': activeLayer.photoPosition }}
          key={activeLayer.id}
        >
          <img
            src={assetUrl(`${activeLayer.photo}-1280.webp`)}
            srcSet={`${assetUrl(`${activeLayer.photo}-720.webp`)} 720w, ${assetUrl(`${activeLayer.photo}-1280.webp`)} 1280w`}
            sizes="(max-width: 720px) 100vw, (max-width: 1180px) 50vw, 38vw"
            alt={activeLayer.photoAlt}
            loading="lazy"
            decoding="async"
          />
          <div className="iot-hardware-evidence__shade" />
          <div className="iot-hardware-evidence__head">
            <span>PROJECT HARDWARE / {activeLayer.code}</span>
            <small>PHYSICAL EVIDENCE</small>
          </div>
          <figcaption>
            <small>{activeLayer.photoLabel}</small>
            <strong>{activeLayer.photoTitle}</strong>
            <p>{activeLayer.photoCopy}</p>
          </figcaption>
          <div className="iot-hardware-evidence__status"><i /><span>实物过程记录</span><small>非实时画面</small></div>
          <span className="iot-hardware-evidence__corner" aria-hidden="true" />
        </figure>

        <div className="iot-layer-console__evidence">
          <small>WHY IT MATTERS</small>
          <strong>{activeLayer.metric}</strong>
          <p>{activeLayer.id === 'twin'
            ? '让评委在一分钟内理解复杂结构，同时保留官方来源与真实性边界。'
            : '把分散的机械、电子和计算节点组织为端—边协同的完整物联系统。'}</p>
          <a href={LINKS.docs} target="_blank" rel="noreferrer">核对官方资料 <ExternalLink size={13} /></a>
        </div>
      </div>

      <div className="iot-value-grid">
        <div><small>DEVICE</small><strong>节点可识别</strong><span>关节控制器拥有独立 CAN ID</span></div>
        <div><small>NETWORK</small><strong>链路可解释</strong><span>四路现场总线分段汇聚</span></div>
        <div><small>EDGE</small><strong>计算在本体</strong><span>关键运动闭环不依赖云端</span></div>
        <div><small>EXHIBITION</small><strong>结构可追溯</strong><span>模型、参数与资料均可回到官方来源</span></div>
      </div>
    </div>
  )
}

function SmartServiceConsole({ showcaseMode = false }) {
  const [scenarioId, setScenarioId] = useState('normal')
  const [phase, setPhase] = useState('standby')
  const [running, setRunning] = useState(false)
  const [tick, setTick] = useState(0)
  const [ticketId, setTicketId] = useState('')
  const analysisTimerRef = useRef(null)
  const verifyTimerRef = useRef(null)
  const scenario = serviceScenarios.find((item) => item.id === scenarioId) ?? serviceScenarios[0]
  const normalScenario = serviceScenarios[0]
  const recovered = phase === 'closed'
  const streamScenario = recovered ? normalScenario : scenario
  const traceMetric = serviceMetrics.find((item) => item.id === (scenario.triggerMetric ?? 'temperature'))

  const clearTimers = () => {
    window.clearTimeout(analysisTimerRef.current)
    window.clearTimeout(verifyTimerRef.current)
  }

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    if (!running) return undefined
    const timer = window.setInterval(() => setTick((current) => current + 1), 760)
    return () => window.clearInterval(timer)
  }, [running])

  useEffect(() => {
    if (!showcaseMode) return undefined
    clearTimers()
    setScenarioId('thermal')
    setTicketId('')
    setTick(0)
    setRunning(true)
    setPhase('sampling')
    const timers = [
      window.setTimeout(() => setPhase('diagnosed'), 1400),
      window.setTimeout(() => {
        setTicketId('SVC-S1-2201')
        setRunning(false)
        setPhase('ticketed')
      }, 3300),
      window.setTimeout(() => setPhase('verifying'), 5000),
      window.setTimeout(() => setPhase('closed'), 6400),
    ]
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [showcaseMode])

  const selectScenario = (id) => {
    clearTimers()
    setScenarioId(id)
    setPhase('standby')
    setRunning(false)
    setTicketId('')
    setTick(0)
  }

  const startDiagnosis = () => {
    clearTimers()
    setTicketId('')
    setTick(0)
    setRunning(true)
    setPhase('sampling')
    analysisTimerRef.current = window.setTimeout(() => {
      setPhase(scenario.id === 'normal' ? 'monitoring' : 'diagnosed')
    }, 1200)
  }

  const resetService = () => {
    clearTimers()
    setScenarioId('normal')
    setPhase('standby')
    setRunning(false)
    setTicketId('')
    setTick(0)
  }

  const runPrimaryAction = () => {
    if (phase === 'standby') {
      startDiagnosis()
      return
    }
    if (phase === 'monitoring') {
      setTicketId('CHK-S0-2201')
      setRunning(false)
      setPhase('closed')
      return
    }
    if (phase === 'diagnosed') {
      setTicketId(`SVC-${scenario.code}-2201`)
      setRunning(false)
      setPhase('ticketed')
      return
    }
    if (phase === 'ticketed') {
      setPhase('verifying')
      verifyTimerRef.current = window.setTimeout(() => setPhase('closed'), 1200)
      return
    }
    if (phase === 'closed') resetService()
  }

  const onScenarioKeyDown = (event, index) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    let nextIndex = index
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % serviceScenarios.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + serviceScenarios.length) % serviceScenarios.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = serviceScenarios.length - 1
    const next = serviceScenarios[nextIndex]
    selectScenario(next.id)
    window.requestAnimationFrame(() => document.getElementById(`service-tab-${next.id}`)?.focus())
  }

  const phaseLabel = {
    standby: '等待启动',
    sampling: '正在采样与分析',
    monitoring: '本轮巡检正常',
    diagnosed: '已识别异常',
    ticketed: '处置单已生成',
    verifying: '处置后复检中',
    closed: '智慧服务已闭环',
  }[phase]

  const primaryLabel = {
    standby: '启动智慧诊断',
    sampling: '正在分析…',
    monitoring: '完成巡检并归档',
    diagnosed: '生成本地处置单',
    ticketed: '确认处置并复检',
    verifying: '正在复检…',
    closed: '开始新一轮',
  }[phase]

  const metricValues = Object.fromEntries(serviceMetrics.map((metric, index) => {
    const [base, swing] = streamScenario.values[metric.id]
    const value = Math.max(metric.min, base + Math.sin((tick + index * 1.7) * 0.56) * swing)
    return [metric.id, value]
  }))
  const traceBase = streamScenario.values[traceMetric.id]
  const tracePoints = Array.from({ length: 28 }, (_, index) => {
    const value = traceBase[0] + Math.sin((tick - 27 + index) * 0.5) * traceBase[1]
    const x = (index / 27) * 100
    const normalized = Math.min(1, Math.max(0, (value - traceMetric.min) / (traceMetric.max - traceMetric.min)))
    return `${x.toFixed(2)},${(88 - normalized * 70).toFixed(2)}`
  }).join(' ')
  const thresholdValue = Number.parseFloat(traceMetric.threshold.replace(/[^0-9.]/g, ''))
  const thresholdY = 88 - ((thresholdValue - traceMetric.min) / (traceMetric.max - traceMetric.min)) * 70
  const displayHealth = phase === 'standby' ? null : recovered ? 94 : Math.max(0, Math.min(100, Math.round(scenario.health + Math.sin(tick * 0.4))))
  const incidentMetric = serviceMetrics.find((metric) => metric.id === scenario.triggerMetric)
  const incidentValue = incidentMetric ? scenario.values[incidentMetric.id][0].toFixed(incidentMetric.digits) : null
  const stageState = (stage) => {
    const positions = {
      sense: ['sampling', 'monitoring', 'diagnosed', 'ticketed', 'verifying', 'closed'],
      diagnose: ['monitoring', 'diagnosed', 'ticketed', 'verifying', 'closed'],
      decide: ['diagnosed', 'ticketed', 'verifying', 'closed'],
      serve: ['ticketed', 'verifying', 'closed'],
      verify: ['verifying', 'closed'],
    }
    if (phase === 'closed') return 'done'
    const activeStage = { sampling: 'sense', monitoring: 'diagnose', diagnosed: 'decide', ticketed: 'serve', verifying: 'verify' }[phase]
    if (activeStage === stage) return 'active'
    if (positions[stage].includes(phase)) return 'done'
    return 'pending'
  }

  return (
    <div
      className={`smart-service-console is-${scenario.tone} is-${scenario.id}`}
      data-state={phase}
      data-scenario={scenario.id}
      data-reveal
    >
      <div className="service-truth-bar">
        <div><Activity size={16} /><span>LOCAL SMART SERVICE DEMO</span></div>
        <strong>浏览器本地模拟数据 · 不连接实机 · 不发送控制指令</strong>
        <small>DEMO RULES / NO REAL WORK ORDER</small>
      </div>

      <div className="service-scenario-rail" role="tablist" aria-label="3S 智慧服务场景">
        {serviceScenarios.map((item, index) => (
          <button
            id={`service-tab-${item.id}`}
            className={scenarioId === item.id ? 'is-active' : ''}
            type="button"
            role="tab"
            aria-selected={scenarioId === item.id}
            aria-controls="smart-service-panel"
            tabIndex={scenarioId === item.id ? 0 : -1}
            key={item.id}
            onClick={() => selectScenario(item.id)}
            onKeyDown={(event) => onScenarioKeyDown(event, index)}
            disabled={phase === 'sampling' || phase === 'verifying'}
          >
            <small>{item.code}</small>
            <span>{item.label}</span>
            <i />
          </button>
        ))}
      </div>

      <div
        className="service-workspace"
        id="smart-service-panel"
        role="tabpanel"
        aria-labelledby={`service-tab-${scenario.id}`}
      >
        <section className="service-telemetry" aria-label="演示状态感知">
          <div className="service-panel-head">
            <div><small>SENSE / 01</small><strong>状态感知</strong></div>
            <span className={running ? 'is-running' : ''}><i /> {running ? 'SAMPLING' : 'HOLD'}</span>
          </div>
          <div className="service-metric-grid">
            {serviceMetrics.map((metric) => {
              const isAlert = !recovered && scenario.triggerMetric === metric.id && phase !== 'standby'
              return (
                <div className={isAlert ? 'is-alert' : ''} key={metric.id}>
                  <small>{metric.code} / {metric.label}</small>
                  <strong>{phase === 'standby' ? '--' : metricValues[metric.id].toFixed(metric.digits)}<em>{metric.unit}</em></strong>
                  <span>{isAlert ? '超出演示阈值' : recovered && scenario.triggerMetric === metric.id ? '复检已恢复' : `演示阈值 ${metric.threshold}`}</span>
                </div>
              )
            })}
          </div>
          <div className="service-trace">
            <div><span>{traceMetric.label}趋势</span><small>DETERMINISTIC DEMO STREAM</small></div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line className="service-trace__threshold" x1="0" x2="100" y1={thresholdY} y2={thresholdY} />
              <polyline points={tracePoints} />
            </svg>
            <span className="service-trace__legend"><i /> 演示阈值 {traceMetric.threshold}</span>
          </div>
        </section>

        <section className="service-body-stage" aria-label="机器人健康状态示意">
          <div className="service-body-stage__grid" />
          <div className="service-body-stage__head"><span>ASSET / HUMANOID-01</span><small>{scenario.target}</small></div>
          <img src={assetUrl('media/bhl-robot-cutout.png')} alt="人形机器人健康监测示意" />
          <span className="service-hotspot" aria-hidden="true"><i /><b /></span>
          <div className="service-health" style={{ '--health': displayHealth ?? 0 }}>
            <div><strong>{displayHealth ?? '--'}</strong><span>/ 100</span></div>
            <small>DEMO HEALTH</small>
          </div>
        </section>

        <section className="service-decision" aria-label="智慧诊断与服务决策">
          <div className="service-panel-head">
            <div><small>DIAGNOSE + DECIDE / 02–03</small><strong>可解释诊断</strong></div>
            <span className={`service-severity is-${scenario.tone}`}><i /> {phase === 'standby' ? 'STANDBY' : recovered ? 'RESOLVED' : scenario.severity}</span>
          </div>
          <div className="service-diagnosis" role="status" aria-live="polite">
            <small>{phaseLabel}</small>
            <h3>{phase === 'standby' ? '选择场景并启动诊断' : phase === 'sampling' ? '正在建立多源状态快照…' : recovered ? '处置完成，复检指标已恢复' : scenario.diagnosis}</h3>
            <p>{phase === 'standby' ? '系统将依次完成状态感知、透明规则诊断、服务决策和处置闭环。' : phase === 'sampling' ? '汇聚关节温度、驱动电流、CAN 丢包率与 IMU 倾角。' : recovered ? '本地处置记录已归档，可开始下一轮智慧巡检。' : scenario.reason}</p>
          </div>
          <div className="service-rule-evidence">
            <span>DEMO RULE / 规则证据</span>
            {incidentMetric ? (
              <div><strong>{incidentMetric.label} {incidentValue}{incidentMetric.unit}</strong><small>触发条件 {incidentMetric.threshold}</small></div>
            ) : (
              <div><strong>4 / 4 指标正常</strong><small>未触发演示告警规则</small></div>
            )}
          </div>
          <div className="service-advice">
            <span>SERVICE PLAN / 服务建议</span>
            <strong>{scenario.action}</strong>
            <ol>{scenario.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          </div>
        </section>
      </div>

      <div className="service-closure">
        <div className="service-flow" aria-label="智慧服务流程">
          {[
            ['sense', '01', '感知'],
            ['diagnose', '02', '诊断'],
            ['decide', '03', '决策'],
            ['serve', '04', '服务'],
            ['verify', '05', '复检'],
          ].map(([id, code, label]) => (
            <div className={`is-${stageState(id)}`} key={id} aria-current={stageState(id) === 'active' ? 'step' : undefined}>
              <small>{code}</small><span>{label}</span><i />
            </div>
          ))}
        </div>
        <div className={`service-ticket ${ticketId ? 'has-ticket' : ''}`}>
          <ClipboardCheck size={20} />
          <div>
            <small>{ticketId ? ticketId : 'LOCAL SERVICE RECORD'}</small>
            <strong>{ticketId ? (phase === 'closed' ? '处置记录已闭环' : phase === 'verifying' ? '正在执行处置后复检' : '本地处置单等待确认') : '尚未生成处置记录'}</strong>
            <span>{ticketId ? `${scenario.target} · ${scenario.severity}` : '异常识别后可生成，仅保存在当前演示页面'}</span>
          </div>
        </div>
        <div className="service-actions">
          <button type="button" className="service-reset" onClick={resetService} disabled={phase === 'sampling' || phase === 'verifying'} aria-label="重置智慧服务演示"><RotateCcw size={15} /></button>
          <button type="button" className="service-primary" onClick={runPrimaryAction} disabled={phase === 'sampling' || phase === 'verifying'}>
            {phase === 'closed' ? <RotateCcw size={16} /> : phase === 'diagnosed' || phase === 'ticketed' ? <ClipboardCheck size={16} /> : <Play size={16} />}
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function PresentationDock({ active, paused, complete, stepIndex, onToggle, onNext, onReplay, onExit }) {
  if (!active) return null
  const step = presentationSteps[stepIndex]

  return (
    <aside
      className={`presentation-dock ${paused ? 'is-paused' : ''} ${complete ? 'is-complete' : ''}`}
      data-step={step.id}
      aria-label="比赛展演控制"
    >
      <div className="presentation-dock__status">
        <span><i /> {complete ? 'EXHIBITION COMPLETE' : 'COMPETITION SHOWCASE'}</span>
        <strong>{complete ? `${String(presentationSteps.length).padStart(2, '0')} / 展演完成` : `${step.code} / ${step.label}`}</strong>
        <small>{complete ? '所有模型、参数与结论均可回到官方来源' : step.note}</small>
      </div>
      <div className="presentation-dock__steps" aria-hidden="true">
        {presentationSteps.map((item, index) => (
          <i key={item.id} className={index === stepIndex ? 'is-active' : index < stepIndex ? 'is-done' : ''} />
        ))}
      </div>
      <div className="presentation-dock__actions">
        <button type="button" onClick={complete ? onReplay : onToggle} aria-label={complete ? '重新播放比赛展演' : paused ? '继续自动展演' : '暂停自动展演'}>
          {complete ? <RotateCcw size={16} /> : paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <button type="button" onClick={onNext} aria-label="进入下一个展演章节" disabled={complete}><ArrowRight size={17} /></button>
        <button type="button" onClick={onExit} aria-label="退出比赛展演"><X size={17} /></button>
      </div>
    </aside>
  )
}

function LazyHumanoidLab({ showcaseMode = false, forceMount = false }) {
  const hostRef = useRef(null)
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    if (forceMount) {
      setShouldMount(true)
      return undefined
    }
    const host = hostRef.current
    if (!host) return undefined
    if (!('IntersectionObserver' in window)) {
      setShouldMount(true)
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return
      setShouldMount(true)
      observer.disconnect()
    }, {
      rootMargin: window.matchMedia('(max-width: 900px), (pointer: coarse)').matches
        ? '120px 0px'
        : '700px 0px',
    })
    observer.observe(host)
    return () => observer.disconnect()
  }, [forceMount])

  return (
    <div className="twin-lazy-host" ref={hostRef}>
      {shouldMount ? (
        <TwinErrorBoundary>
          <React.Suspense fallback={(
            <div className="twin-chunk-placeholder" role="status">
              <span />
              <strong>INITIALIZING 3D ENGINE</strong>
              <small>THREE.JS / URDF PIPELINE</small>
            </div>
          )}>
            <HumanoidLab showcaseMode={showcaseMode} />
          </React.Suspense>
        </TwinErrorBoundary>
      ) : (
        <div className="twin-chunk-placeholder" aria-hidden="true">
          <span />
          <strong>DIGITAL TWIN STANDBY</strong>
          <small>SCROLL TO INITIALIZE</small>
        </div>
      )}
    </div>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('robot')
  const [activePart, setActivePart] = useState(0)
  const [activeStack, setActiveStack] = useState(0)
  const [activeIoT, setActiveIoT] = useState(0)
  const [activeMorph, setActiveMorph] = useState('biped')
  const [presentationActive, setPresentationActive] = useState(false)
  const [presentationPaused, setPresentationPaused] = useState(false)
  const [presentationComplete, setPresentationComplete] = useState(false)
  const [presentationIndex, setPresentationIndex] = useState(0)
  const menuRef = useRef(null)
  const menuButtonRef = useRef(null)
  const pendingPresentationRestoreRef = useRef(null)

  useLayoutEffect(() => {
    if (presentationActive || !pendingPresentationRestoreRef.current) return
    const restoreId = pendingPresentationRestoreRef.current
    pendingPresentationRestoreRef.current = null
    document.getElementById(restoreId)?.scrollIntoView({ behavior: 'auto', block: 'start' })
  }, [presentationActive])

  useEffect(() => {
    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          entry.target.dataset.revealed = 'true'
        }
      }),
      { threshold: 0.12 },
    )
    document.querySelectorAll('[data-reveal]').forEach((element) => revealObserver.observe(element))

    const sectionObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id)
      }),
      { rootMargin: '-35% 0px -55% 0px', threshold: 0 },
    )
    presentationSteps.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) sectionObserver.observe(element)
    })

    return () => {
      revealObserver.disconnect()
      sectionObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (presentationActive) {
          pendingPresentationRestoreRef.current = presentationSteps[presentationIndex]?.id
          setPresentationActive(false)
          setPresentationPaused(false)
          setPresentationComplete(false)
          return
        }
        if (menuOpen) {
          setMenuOpen(false)
          menuButtonRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen, presentationActive, presentationIndex])

  useEffect(() => {
    if (!presentationActive) return undefined
    const step = presentationSteps[presentationIndex]
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    window.requestAnimationFrame(() => {
      document.getElementById(step.id)?.scrollIntoView({ behavior, block: 'start' })
    })

    if (presentationPaused || presentationComplete) return undefined
    const timer = window.setTimeout(() => {
      if (presentationIndex >= presentationSteps.length - 1) {
        setPresentationComplete(true)
        setPresentationPaused(true)
      } else {
        setPresentationIndex((current) => current + 1)
      }
    }, PRESENTATION_STEP_MS)
    return () => window.clearTimeout(timer)
  }, [presentationActive, presentationComplete, presentationIndex, presentationPaused])

  useEffect(() => {
    if (!presentationActive || presentationPaused) return undefined
    if (presentationSteps[presentationIndex].id !== 'iot-showcase') return undefined
    setActiveIoT(0)
    const timer = window.setInterval(() => {
      setActiveIoT((current) => Math.min(current + 1, iotLayers.length - 1))
    }, 1400)
    return () => window.clearInterval(timer)
  }, [presentationActive, presentationIndex, presentationPaused])

  useEffect(() => {
    if (!presentationActive || presentationPaused) return undefined
    if (presentationSteps[presentationIndex].id !== 'design') return undefined
    setActivePart(0)
    const timer = window.setInterval(() => {
      setActivePart((current) => Math.min(current + 1, anatomyParts.length - 1))
    }, 600)
    return () => window.clearInterval(timer)
  }, [presentationActive, presentationIndex, presentationPaused])

  useEffect(() => {
    if (!presentationActive || presentationPaused) return undefined
    if (presentationSteps[presentationIndex].id !== 'design') return undefined
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    const timers = [
      window.setTimeout(() => document.getElementById('actuator')?.scrollIntoView({ behavior, block: 'start' }), 2500),
      window.setTimeout(() => document.getElementById('morphology')?.scrollIntoView({ behavior, block: 'start' }), 5000),
    ]
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [presentationActive, presentationIndex, presentationPaused])

  useEffect(() => {
    if (!presentationActive || presentationPaused) return undefined
    if (presentationSteps[presentationIndex].id !== 'stack') return undefined
    setActiveStack(0)
    const timer = window.setInterval(() => {
      setActiveStack((current) => Math.min(current + 1, stackNodes.length - 1))
    }, 1400)
    return () => window.clearInterval(timer)
  }, [presentationActive, presentationIndex, presentationPaused])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    if (menuOpen) {
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
  }

  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpen(false)
      return
    }
    setMenuOpen(true)
    window.requestAnimationFrame(() => menuRef.current?.querySelector('button')?.focus())
  }

  const startPresentation = () => {
    setMenuOpen(false)
    setPresentationIndex(0)
    setPresentationPaused(false)
    setPresentationComplete(false)
    setPresentationActive(true)
  }

  const replayPresentation = () => {
    setPresentationIndex(0)
    setPresentationPaused(false)
    setPresentationComplete(false)
  }

  const nextPresentationStep = () => {
    if (presentationIndex >= presentationSteps.length - 1) {
      setPresentationComplete(true)
      setPresentationPaused(true)
      return
    }
    setPresentationIndex((current) => current + 1)
  }

  const exitPresentation = () => {
    pendingPresentationRestoreRef.current = presentationSteps[presentationIndex]?.id
    setPresentationActive(false)
    setPresentationPaused(false)
    setPresentationComplete(false)
  }

  const activeStackNode = stackNodes[activeStack]
  const activeMorphology = morphologies.find((item) => item.id === activeMorph)
  const presentationStep = presentationSteps[presentationIndex]
  const observedPresentationSectionIndex = presentationSteps.findIndex((item) => item.id === activeSection)
  const activePresentationSectionIndex = observedPresentationSectionIndex < 0
    ? 0
    : observedPresentationSectionIndex

  return (
    <div className="site-shell">
      <div className="global-grid" aria-hidden="true" />
      <div className="global-noise" aria-hidden="true" />

      <aside className="signal-spine" aria-hidden="true">
        <span>SIGNAL / 22</span>
        <div>
          {presentationSteps.map((step, index) => (
            <i
              className={index === activePresentationSectionIndex ? 'is-active' : index < activePresentationSectionIndex ? 'is-past' : ''}
              key={step.id}
            ><small>{step.code}</small></i>
          ))}
        </div>
        <em>MACHINE, MADE LEGIBLE.</em>
      </aside>

      <header className="site-header">
        <a className="site-brand" href="#robot" aria-label="Signal 22 物联网数字展厅首页">
          <BrandMark />
          <span>
            <strong>SIGNAL<span>/</span>22</strong>
            <small>BASED ON BERKELEY HUMANOID LITE</small>
          </span>
        </a>

        <nav ref={menuRef} id="primary-navigation" className={`site-nav ${menuOpen ? 'is-open' : ''}`} aria-label="主导航">
          {navItems.map((item) => (
            <button
              className={activeSection === item.id ? 'is-active' : ''}
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
            >
              <span>{item.label}</span><small>{item.code}</small>
            </button>
          ))}
        </nav>

        <div className="site-header__actions">
          <button className="header-showcase" type="button" onClick={startPresentation}>
            <CirclePlay size={14} /> SHOWCASE
          </button>
          <a href={LINKS.docs} target="_blank" rel="noreferrer">DOCS <ExternalLink size={13} /></a>
          <a className="header-github" href={LINKS.github} target="_blank" rel="noreferrer" aria-label="打开 GitHub 仓库"><Github size={18} /></a>
          <button
            ref={menuButtonRef}
            className="menu-toggle"
            type="button"
            onClick={toggleMenu}
            aria-label="切换导航菜单"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="robot">
          <div className="hero__ghost" aria-hidden="true">22 / 4 / 1</div>
          <div className="hero__edition" aria-hidden="true"><span>EXHIBIT</span><strong>2026</strong></div>
          <div className="hero__copy">
            <div className="hero__eyebrow"><i /> BERKELEY HUMANOID LITE / IOT SYSTEM EXHIBITION</div>
            <h1>
              <span className="hero-title__solid">机器会动。</span>
              <span className="hero-title__outline">链路可见。</span>
            </h1>
            <p>从关节编码器与机身 IMU，到 STM32G431、4 × CAN 2.0 与 Intel N95。把一台开源人形机器人的本地物联闭环，拆开给你看。</p>
            <div className="hero__actions">
              <button className="primary-action" type="button" onClick={startPresentation}>
                <CirclePlay size={18} /> 观看约 70 秒系统展演 <ArrowRight size={16} />
              </button>
              <button className="text-action" type="button" onClick={() => scrollTo('digital-twin')}>
                进入 3D 结构 <ArrowDown size={16} />
              </button>
            </div>
            <div className="hero__truth">
              <span>OFFLINE EXHIBITION</span>
              <strong>离线数字展示 · 当前不连接实机 · 不发送控制指令</strong>
            </div>
            <div className="hero__footnote">
              <span><small>01</small>SENSING</span><i />
              <span><small>02</small>STM32 / FOC</span><i />
              <span><small>03</small>4× CAN</span><i />
              <span><small>04</small>EDGE / N95</span>
            </div>
          </div>
          <div className="hero__visual"><HeroRobot /></div>
          <div className="hero__scroll" aria-hidden="true"><span>SCROLL TO EXPLORE</span><i /></div>
        </section>

        <section className="metric-band" aria-label="机器人关键规格">
          <div className="metric-band__label">
            <span>SIGNAL / 22</span>
            <small>22 JOINTS · 4 BUSES · 1 EDGE COMPUTER</small>
          </div>
          <div className="metric-band__grid">
            {heroMetrics.map((metric) => (
              <div className="hero-metric" key={metric.label} data-reveal>
                <strong>{metric.value}<em>{metric.unit}</em></strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="iot-showcase-section section-pad" id="iot-showcase">
          <div className="page-frame">
            <SectionHeader
              index="02"
              eyebrow="IOT ARCHITECTURE / DEVICE TO EDGE"
              title={<>从传感器，<br /><span className="balanced-title-line"><span>到关节的</span><span>本地闭环。</span></span></>}
              copy="编码器、相电流与 IMU 构成感知入口；关节侧 STM32 完成嵌入式控制，四路 CAN 汇聚到 Intel N95。关键运动闭环运行在机器人本体，而不是虚构的云端。"
            />
            <IoTArchitecture activeIndex={activeIoT} setActiveIndex={setActiveIoT} />
          </div>
        </section>

        <section className="manifesto page-frame" aria-label="竞赛展示定位">
          <div className="manifesto__index">WHY IOT / 01</div>
          <div className="manifesto__statement" data-reveal>
            <h2>
              会动的是机器。<br />
              真正被展示的，<br />
              <span className="balanced-title-line"><span>是它的本地</span><span>神经系统。</span></span>
            </h2>
            <p>从传感器、嵌入式节点和现场总线，到机载边缘计算，浏览器把隐藏在机身里的链路变成可观看、可理解、可追溯的数字展品。</p>
          </div>
          <div className="manifesto__aside" data-reveal>
            <div><strong>4×CAN</strong><span>四肢独立现场总线</span></div>
            <div><strong>N95</strong><span>机载边缘计算平台</span></div>
            <small>本页为官方资料驱动的展示系统；当前未连接实机遥测，也不向机器人发送控制指令。</small>
          </div>
        </section>

        <section className="smart-service-section section-pad" id="smart-service">
          <div className="page-frame">
            <SectionHeader
              index="03"
              eyebrow="SMART SERVICE SYSTEM / SENSE TO SERVICE"
              title={<>不止看见状态，<br /><span className="balanced-title-line"><span>还要完成</span><span>服务闭环。</span></span></>}
              copy="选择一种运行场景，系统会在浏览器本地生成可复现的演示数据，依次完成多源感知、规则诊断、风险分级、服务决策、处置记录与复检归档。"
            />
            <SmartServiceConsole
              showcaseMode={presentationActive && presentationStep.id === 'smart-service' && !presentationPaused}
            />
          </div>
        </section>

        <section className="digital-twin-section section-pad" id="digital-twin">
          <div className="page-frame">
            <SectionHeader
              index="04"
              eyebrow="INTERACTIVE DIGITAL MODEL / OFFICIAL URDF"
              title={<>把整台机器，<br /><span>变成数字展品。</span></>}
              copy="这里不是预渲染视频，也不是已连接实机的在线控制台；它由官方 URDF 与 26 个 STL 分件在浏览器本地组装，用于解释结构、关节和程序化动作。"
            />
            <div className="twin-truth-note" data-reveal>
              <ScanLine size={15} />
              <span>OFFLINE DIGITAL MODEL</span>
              <strong>当前未接入实机遥测或控制</strong>
              <small>STRUCTURE EXPLAINER / NOT LIVE DATA</small>
            </div>
            <div className="twin-format-strip" data-reveal>
              <div><small>SKELETON</small><strong>URDF</strong><span>关节树 / 旋转轴 / 限位</span></div>
              <i />
              <div><small>GEOMETRY</small><strong>26 × STL</strong><span>官方分件网格</span></div>
              <i />
              <div><small>RUNTIME</small><strong>THREE.JS</strong><span>本地渲染 / 程序化动作</span></div>
            </div>
            <LazyHumanoidLab
              forceMount={presentationActive}
              showcaseMode={presentationActive && presentationStep.id === 'digital-twin' && !presentationPaused}
            />
          </div>
        </section>

        <section className="capabilities-section section-pad" id="capabilities">
          <div className="page-frame">
            <SectionHeader
              index="05"
              eyebrow="CAPABILITIES / REAL HARDWARE"
              title={<>Walk. Reach.<br /><span>Manipulate.</span></>}
              copy="先看真实能力，再谈开放设计。官方实验展示双足行走、写字、拆包、积木操作与魔方操作；它们是研究演示，不是通用自主智能。"
            />
            <div className="capability-grid">
              <VideoFeature />
              <div className="operation-column">
                <div className="rail-hint"><span>03 MORE EXPERIMENTS</span><strong>左右滑动 / SWIPE →</strong></div>
                <div className="operation-grid">
                  <OperationTile className="operation-tile--write" number="02" eyebrow="BILATERAL CONTROL" title="写下自己的名字" meta="STEAMVR / IK" />
                  <OperationTile className="operation-tile--unpack" number="03" eyebrow="BIMANUAL TASK" title="打开并收纳物体" meta="TELEOPERATION" />
                  <OperationTile className="operation-tile--cube" number="04" eyebrow="DEXTEROUS DEMO" title="操作魔方" meta="DUAL GRIPPERS" />
                </div>
              </div>
            </div>
            <div className="capability-note" data-reveal>
              <div><Radio size={17} /><span>TELEOPERATION</span></div>
              <p>SteamVR 提供双手位姿，Pink + Pinocchio 进行逆运动学求解；支持第三人称与 VR 第一人称控制流程。</p>
              <a href={LINKS.video} target="_blank" rel="noreferrer">完整官方视频 <ExternalLink size={14} /></a>
            </div>
          </div>
        </section>

        <section className="design-section section-pad" id="design">
          <div className="page-frame">
            <SectionHeader
              index="06"
              eyebrow="SYSTEM ANATOMY / MODULAR BY DESIGN"
              title={<>整台机器人，<br /><span className="balanced-title-line"><span>由可替换</span><span>模块构成。</span></span></>}
              copy="铝型材机身是骨架，摆线执行器是肌肉，四路 CAN 是神经，机载电脑则把训练好的策略带到真实世界。"
            />

            <div className="anatomy-layout">
              <div className={`anatomy-stage is-part-${activePart}`} data-reveal>
                <div className="anatomy-stage__head"><span>FIG. 01 / SYSTEM COMPONENTS</span><small>SELECT A MODULE →</small></div>
                <div
                  className="anatomy-stage__image"
                  style={{
                    '--focus-x': anatomyParts[activePart].focusX,
                    '--focus-y': anatomyParts[activePart].focusY,
                    '--focus-zoom': anatomyParts[activePart].focusZoom,
                  }}
                >
                  <img src={assetUrl('media/system-components.png')} alt="Berkeley Humanoid Lite 系统组件与尺寸示意图" />
                  <div className="anatomy-stage__scan" />
                  {anatomyParts.map((part, index) => (
                    <span
                      className={`anatomy-beacon ${activePart === index ? 'is-active' : ''}`}
                      data-label={part.markerLabel}
                      style={{ left: part.markerX, top: part.markerY }}
                      key={part.index}
                    />
                  ))}
                </div>
                <div className="anatomy-stage__foot"><span>0.8 M / 16 KG</span><span>22 ACTUATED JOINTS</span><span>2 GRIPPERS</span></div>
              </div>

              <div className="anatomy-index">
                <div className="rail-hint rail-hint--anatomy"><span>04 SYSTEM MODULES</span><strong>左右滑动 / SWIPE →</strong></div>
                <div className="anatomy-list">
                  {anatomyParts.map((part, index) => (
                    <button
                      className={`anatomy-item ${activePart === index ? 'is-active' : ''}`}
                      type="button"
                      key={part.index}
                      onClick={() => setActivePart(index)}
                      onMouseEnter={() => setActivePart(index)}
                      data-reveal
                    >
                      <span className="anatomy-item__index">{part.index}</span>
                      <div className="anatomy-item__copy">
                        <small>{part.tag}</small>
                        <h3>{part.title}</h3>
                        <p>{part.copy}</p>
                      </div>
                      <div className="anatomy-item__meta"><strong>{part.meta}</strong><span>{part.metaLabel}</span></div>
                      <ChevronDown size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="actuator-section section-pad" id="actuator">
          <div className="page-frame actuator-layout">
            <div className="actuator-copy" data-reveal>
              <span className="section-kicker"><i /> 06.1 / ACTUATOR CORE</span>
              <h2>关节，才是<br /><span className="balanced-title-line"><span>这台机器的</span><span>原点。</span></span></h2>
              <p>它没有把昂贵金属执行器藏进外壳，而是围绕桌面制造重新设计：无刷电机、磁编码器、STM32 控制器与 3D 打印摆线减速器组成自包含模块。</p>
              <div className="actuator-types">
                <div><small>HEAVY DUTY</small><strong>6512</strong><span>10 UNITS</span></div>
                <div><small>COMPACT</small><strong>5010</strong><span>12 UNITS</span></div>
              </div>
              <a className="inline-link" href={LINKS.actuator} target="_blank" rel="noreferrer">查看执行器构建文档 <ArrowRight size={15} /></a>
            </div>
            <figure className="actuator-media" data-reveal>
              <img src={assetUrl('media/bhl-actuator-core-official.jpg')} alt="官方构建文档中的 5010 无刷电机开盖实物" />
              <div className="actuator-media__shade" />
              <div className="actuator-media__head"><span>OFFICIAL HARDWARE / 5010</span><small>PREPARING THE MOTOR</small></div>
              <figcaption>
                <span>执行器，从真实部件开始。</span>
                <small>BRUSHLESS MOTOR / OFFICIAL BUILD DOCUMENT</small>
              </figcaption>
            </figure>
            <div className="actuator-proof" data-reveal>
              <div className="actuator-proof__head"><ScanLine size={17} /><span>PAPER-REPORTED VALIDATION</span></div>
              {actuatorProof.map((item) => (
                <div className="proof-row" key={item.label}>
                  <strong>{item.value}{item.unit && <em>{item.unit}</em>}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
              <p>数据来自论文样机测试；3D 打印件表现会受到材料、打印参数、装配与温度影响。</p>
            </div>
          </div>
        </section>

        <section className="morphology-section section-pad" id="morphology">
          <div className="page-frame morphology-layout">
            <div className="morphology-copy" data-reveal>
              <span className="section-kicker"><i /> 06.2 / RECONFIGURABLE</span>
              <h2>一套关节，<br /><span className="balanced-title-line"><span>不止一种</span><span>身体。</span></span></h2>
              <p>模块化设计可重新组合为双足、四足、半人马式或轮式底盘。除双足外，下列形态是论文中的可重构设计示例，不代表均已完成同等实机验证。</p>
              <div className="morph-tabs" role="tablist" aria-label="选择机器人重构形态">
                {morphologies.map((item) => (
                  <button
                    className={activeMorph === item.id ? 'is-active' : ''}
                    type="button"
                    role="tab"
                    aria-selected={activeMorph === item.id}
                    key={item.id}
                    onClick={() => setActiveMorph(item.id)}
                  >
                    <small>{item.code}</small><span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="morphology-stage" data-reveal>
              <div className="morphology-stage__grid" />
              <div className="morphology-stage__top"><span>CONFIGURATION / {activeMorphology?.code}</span><small>{activeMorphology?.copy}</small></div>
              <MorphologyFigure morphology={activeMorphology} />
              <div className={`morphology-stage__status ${activeMorphology?.verified ? 'is-verified' : ''}`}>
                <strong>{activeMorphology?.status}</strong>
                <span>{activeMorphology?.verified ? '论文实机形态' : '论文概念 / 非同等实机验证'}</span>
              </div>
              <div className="morphology-stage__name">{activeMorphology?.label}<span>/ MODULAR BODY</span></div>
            </div>
          </div>
        </section>

        <section className="stack-section section-pad" id="stack">
          <div className="page-frame">
            <SectionHeader
              index="07"
              eyebrow="OPEN STACK / FROM CAD TO MOTION"
              title={<>从打印件，<br /><span>到真实运动。</span></>}
              copy="开放的不只是 CAD。固件、机器人模型、训练环境、sim2sim 验证、低层控制与实机部署组成了一条可追踪的软件链路。"
            />

            <div className="rail-hint rail-hint--stack"><span>05 OPEN LAYERS</span><strong>左右滑动 / SWIPE →</strong></div>
            <div className="stack-pipeline" data-reveal>
              {stackNodes.map((node, index) => {
                const Icon = node.icon
                return (
                  <button
                    className={`stack-node ${activeStack === index ? 'is-active' : ''}`}
                    type="button"
                    key={node.code}
                    onClick={() => setActiveStack(index)}
                  >
                    <small>{node.code}</small>
                    <span className="stack-node__icon"><Icon size={21} /></span>
                    <strong>{node.name}</strong>
                    {index < stackNodes.length - 1 && <i className="stack-node__line" />}
                  </button>
                )
              })}
            </div>

            <div className="stack-console" data-code={activeStackNode.code} data-reveal>
              <div className="stack-console__copy">
                <div className="stack-console__path"><TerminalSquare size={15} /><span>PIPELINE / {activeStackNode.code}</span></div>
                <small>{activeStackNode.name}</small>
                <h3>{activeStackNode.title}</h3>
                <p>{activeStackNode.copy}</p>
                <div className="chip-row">
                  {activeStackNode.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </div>
              <PolicyTrace />
              <div className="stack-console__rates">
                <div><span>ACTUATOR + IMU · PAPER</span><strong>250 Hz</strong></div>
                <div><span>RL POLICY · PAPER</span><strong>25 Hz</strong></div>
                <div><span>TRANSFER</span><strong>ZERO-SHOT</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section className="build-section section-pad" id="build">
          <div className="page-frame">
            <SectionHeader
              index="08"
              eyebrow="BUILD YOUR OWN / OFFICIAL PATH"
              title={<>不是观看。<br /><span>是开始构建。</span></>}
              copy="官方文档把采购、打印、装配、刷写、训练和部署拆成可以逐步验证的路径。整机约三天的装配估算不包含采购与打印时间。"
              inverse
            />

            <div className="build-ledger">
              {buildSteps.map((step) => (
                <a className={`build-ledger__row ${step.number === '04' ? 'is-focus' : ''}`} href={step.href} target="_blank" rel="noreferrer" key={step.number} data-reveal>
                  <span className="build-ledger__number">{step.number}</span>
                  <small className="build-ledger__label">{step.label}</small>
                  <div className="build-ledger__copy"><h3>{step.title}</h3><p>{step.copy}</p></div>
                  <em>{step.meta}</em>
                  <ExternalLink size={17} />
                </a>
              ))}
            </div>

            <div className="build-evidence" data-reveal>
              <div className="build-evidence__head">
                <div><ScanLine size={17} /><span>PROJECT BUILD RECORD / 03 STAGES</span></div>
                <strong>从部件、节点，到肢体子系统。</strong>
                <small>PHYSICAL PROCESS / PROJECT PHOTOS</small>
              </div>
              <div className="build-evidence__grid">
                {buildEvidence.map((item) => (
                  <figure className={`build-evidence__card is-stage-${item.code}`} style={{ '--build-photo-position': item.position }} key={item.code}>
                    <img
                      src={assetUrl(`${item.asset}-1280.webp`)}
                      srcSet={`${assetUrl(`${item.asset}-720.webp`)} 720w, ${assetUrl(`${item.asset}-1280.webp`)} 1280w`}
                      sizes="(max-width: 720px) 82vw, 31vw"
                      alt={item.alt}
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="build-evidence__shade" />
                    <span className="build-evidence__number">{item.code}</span>
                    <figcaption>
                      <small>{item.stage}</small>
                      <strong>{item.title}</strong>
                      <p>{item.copy}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div className="build-evidence__foot">
                <span>PARTS</span><i /><span>NODE</span><i /><span>SUBSYSTEM</span>
                <strong>照片用于呈现实物过程，不代表当前页面已连接实机遥测。</strong>
              </div>
            </div>

            <details className="deep-dive" data-reveal>
              <summary>
                <span className="deep-dive__icon"><Zap size={20} /></span>
                <div><small>TECHNICAL DEEP DIVE / MOTOR CONTROL</small><strong>电机控制器刷写协议</strong></div>
                <span className="deep-dive__summary-meta">4 PHASES</span>
                <ChevronDown size={20} />
              </summary>
              <div className="deep-dive__body">
                <div className="flash-mini-step"><span>01</span><div><small>BOOT FLAG</small><strong>启用首次启动配置</strong><p>在连接板卡并运行前，将 FIRST_TIME_BOOTUP 设为 1。</p></div></div>
                <div className="flash-mini-step"><span>02</span><div><small>FLASH INIT</small><strong>初始化 option bytes</strong><p>通过 Micro USB 运行；若提示升级 ST-LINK，完成升级后再次运行。</p></div></div>
                <div className="flash-mini-step"><span>03</span><div><small>PARAM LOAD</small><strong>写入 CAN ID 与电机配置</strong><p>按 Joint ID Mapping 设置关节 ID，并选择与硬件匹配的唯一电机 profile。</p></div></div>
                <div className="flash-mini-step"><span>04</span><div><small>PERSIST</small><strong>恢复从 Flash 加载</strong><p>重新启用 ID 与配置的 Flash 加载，再做最后一次有效烧录。</p></div></div>
                <a href={LINKS.flash} target="_blank" rel="noreferrer">打开官方完整刷写文档 <ExternalLink size={14} /></a>
              </div>
            </details>

          </div>
        </section>

        <section className="safety-interlude" aria-label="研究硬件安全提示">
          <div className="page-frame safety-interlude__inner" data-reveal>
            <div className="safety-interlude__code"><ShieldAlert size={22} /><span>CAUTION / RESEARCH HARDWARE</span></div>
            <div>
              <small>SAFETY BEFORE MOTION</small>
            <h2>高功率研究原型，<br /><span className="balanced-title-line"><span>不是消费级</span><span>产品。</span></span></h2>
              <p>LiPo、电机与关节可能造成严重损伤。遵守官方安全说明，并把每一步验证留在可控范围内。</p>
              <div className="safety-interlude__rules"><span>01 / 断电操作</span><span>02 / 先验单关节</span><span>03 / 逐步扩大系统</span></div>
            </div>
            <a href={LINKS.docs} target="_blank" rel="noreferrer">阅读安全说明 <ArrowRight size={15} /></a>
          </div>
        </section>

        <section className="source-section" id="source" style={{ '--source-bg': `url(${assetUrl('media/teleoperation.png')})` }}>
          <div className="page-frame source-layout">
            <div className="source-copy" data-reveal>
              <span className="section-kicker"><i /> 09 / SOURCE OF TRUTH</span>
              <h2>展演结束。<br /><span>验证开始。</span></h2>
              <p>模型、参数与结论，都可以回到官方文档、开源仓库与论文原文。本页是入口，不是替代品。</p>
              <div className="source-actions">
                <a className="primary-action" href={LINKS.docs} target="_blank" rel="noreferrer">打开官方文档 <ExternalLink size={16} /></a>
                <CopyLink value={LINKS.paper} />
              </div>
            </div>
            <div className="source-links" data-reveal>
              <a href={LINKS.site} target="_blank" rel="noreferrer"><span>01</span><div><small>lite.berkeley-humanoid.org</small><strong>官方项目主页</strong></div><ExternalLink size={16} /></a>
              <a href={LINKS.github} target="_blank" rel="noreferrer"><span>02</span><div><small>github.com/HybridRobotics</small><strong>GitHub 开源仓库</strong></div><Github size={17} /></a>
              <a href={LINKS.paper} target="_blank" rel="noreferrer"><span>03</span><div><small>arxiv.org/abs/2504.17249</small><strong>完整研究论文</strong></div><ExternalLink size={16} /></a>
              <a href={LINKS.releases} target="_blank" rel="noreferrer"><span>04</span><div><small>berkeley-humanoid-lite.gitbook.io</small><strong>CAD、BOM 与版本资源</strong></div><ExternalLink size={16} /></a>
            </div>
          </div>
        </section>
      </main>

      <PresentationDock
        active={presentationActive}
        paused={presentationPaused}
        complete={presentationComplete}
        stepIndex={presentationIndex}
        onToggle={() => setPresentationPaused((current) => !current)}
        onNext={nextPresentationStep}
        onReplay={replayPresentation}
        onExit={exitPresentation}
      />

      <footer className="site-footer">
        <div className="page-frame site-footer__inner">
          <div className="footer-signature"><span>SIGNAL</span><strong>/22</strong><small>END OF SIGNAL</small></div>
          <div className="footer-exit">
            <button type="button" onClick={() => scrollTo('robot')}>BACK TO TOP <ArrowRight size={15} /></button>
            <div className="footer-links"><a href={LINKS.docs} target="_blank" rel="noreferrer">DOCS</a><a href={LINKS.github} target="_blank" rel="noreferrer">GITHUB</a><a href={LINKS.paper} target="_blank" rel="noreferrer">PAPER</a></div>
          </div>
          <div className="footer-bottom">
            <p>非官方中文数字展厅。媒体 © Berkeley Humanoid Lite Project / Chi et al., RSS 2025；CAD 网格以官方 CC BY-SA 4.0 说明为准，其他转载权限请核对原始页面。</p>
            <span>DESIGNED FROM OFFICIAL SOURCES · 2026</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
