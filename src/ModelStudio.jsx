import React, { Suspense, useCallback, useState } from 'react'
import './model-studio.css'

const Viewer = React.lazy(() => import('./StudioViewer.jsx'))
const motions = [
  ['idle', '待机', 'IDLE'], ['wave', '招手', 'WAVE'], ['squat', '下蹲', 'SQUAT'],
  ['combat', '战斗', 'COMBAT'], ['walk', '步行', 'WALK'], ['attention', '立正', 'RESET'],
]

class ModelBoundary extends React.Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <p className="twin-error" role="alert">三维模块暂时无法加载，请刷新重试</p> : this.props.children }
}

export default function ModelStudio() {
  const [motion, setMotion] = useState('idle')
  const [exploded, setExploded] = useState(false)
  const [paused, setPaused] = useState(false)
  const [reset, setReset] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState({ loaded: false, progress: 0 })
  const update = useCallback((value) => setStatus((current) => ({ ...current, ...value })), [])
  const activeMotion = motions.find(([id]) => id === motion)
  const selectMotion = (id) => { setMotion(id); setExploded(false); setPaused(false) }
  const retry = () => { setStatus({ loaded: false, progress: 0 }); setAttempt((value) => value + 1) }

  return <section className={`model-studio twin-showcase main-showcase${exploded ? ' is-exploded' : ''}`} id="overview">
    <div className="twin-grid" aria-hidden="true" /><div className="twin-scan" aria-hidden="true" />
    <div className="twin-side-index" aria-hidden="true"><b>3S</b><span>DIGITAL<br />SYSTEM</span><i /></div>
    <div className="twin-copy">
      <div className="twin-eyebrow"><span /> 3S 人形物联网服务系统</div>
      <h1>感知世界<br /><em>连接行动</em></h1>
      <p>在首屏直接操控 22 关节数字机器人。旋转观察、切换动作或展开全部主要零件，从结构进入感知、连接与服务。</p>
      <div className="twin-route" aria-label="物联网数据链"><span><i />感知</span><b>→</b><span><i />边缘</span><b>→</b><span><i />互联</span><b>→</b><span><i />服务</span></div>
      <div className="twin-actions">
        <button className="twin-primary" onClick={() => setExploded((value) => !value)}><span><small>{exploded ? 'ASSEMBLY PROTOCOL' : 'STRUCTURE SCAN'}</small><strong>{exploded ? '重新组装' : '探索结构'}</strong></span><i aria-hidden="true"><b>{exploded ? '↙' : '↗'}</b></i></button>
        <button className="twin-icon-button" onClick={() => setReset((value) => value + 1)} aria-label="重置视角">◎</button>
      </div>
    </div>
    <div className="twin-stage">
      <div className="twin-holo-disc" /><div className="twin-energy-core" />
      <div className="twin-orbit twin-orbit-one" /><div className="twin-orbit twin-orbit-two" />
      <div className="twin-hud-arc twin-hud-arc-a" /><div className="twin-hud-arc twin-hud-arc-b" />
      <div className="twin-reticle" aria-hidden="true"><i /><i /><i /><i /><b className="axis-x">X</b><b className="axis-y">Y</b><b className="axis-z">Z</b></div>
      <div className="twin-telemetry twin-telemetry-top"><span>EDGE GATEWAY / 3S-22</span><b>{exploded ? 'DEVICE TOPOLOGY VIEW' : '22 JOINT NODES READY'}</b></div>
      <div className="twin-telemetry twin-telemetry-bottom"><span>CAN0 + CAN1 / SERVICE LINK</span><b>{exploded ? 'ASSEMBLY EXPANDED' : 'DIGITAL MODEL ACTIVE'}</b></div>
      <img className="twin-poster" src={`${import.meta.env.BASE_URL}media/classmate/bhl-engineering-hero.png`} alt="人形机器人数字样机" />
      <ModelBoundary key={attempt}><Suspense fallback={null}><Viewer motion={motion} exploded={exploded} paused={paused} reset={reset} onState={update} /></Suspense></ModelBoundary>
      {!status.loaded && !status.error && <div className="twin-loader" role="status"><span /><small>正在装配数字样机 · {status.progress}%</small></div>}
      {status.error && <div className="twin-error" role="alert"><p>{status.error}</p><button onClick={retry}>重试加载</button></div>}
      <div className="twin-model-caption"><span className="live-dot" /><div><small>FULL-BODY DIGITAL MODEL</small><strong>{exploded ? 'EXPLODED VIEW' : '22-DOF MOTION'}</strong></div></div>
      <div className="twin-interaction-hint"><span>↔</span><small>按住拖动旋转<br />双指操作模型</small></div>
    </div>
    <div className="twin-motion-console" aria-label="数字样机动作控制台"><div className="twin-motion-head"><div><span className="live-dot" /><small>MOTION STUDIO</small></div><strong>{exploded ? 'ASSEMBLY EXPLODED' : `${activeMotion?.[2]} SEQUENCE`}</strong></div><div className="twin-motion-list">{motions.map(([id, label, code], index) => <button key={id} className={!exploded && motion === id ? 'is-active' : ''} disabled={!status.loaded || !!status.error} onClick={() => selectMotion(id)} aria-pressed={!exploded && motion === id}><i>{String(index + 1).padStart(2, '0')}</i><span>{label}<small>{code}</small></span></button>)}</div></div>
    <aside className="twin-specs" aria-label="数字样机参数"><div><strong>22</strong><span>可动关节<br />JOINTS</span></div><div><strong>26</strong><span>结构网格<br />MESHES</span></div><div><strong>6</strong><span>演示姿态<br />MOTIONS</span></div></aside>
    <button className="twin-pause" disabled={!status.loaded} onClick={() => setPaused((value) => !value)}>{paused ? '继续动作' : '暂停动作'}</button>
    <p className="twin-boundary">交互式结构与动作演示 · 22 个关节节点</p>
  </section>
}
