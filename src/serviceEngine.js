// Deterministic browser simulation. Thresholds are demonstration rules, not hardware limits.
export const scenarios = {
  thermal: { name: '关节温升', target: '右膝关节', values: [74, 7.2, 0.3, 1.2], cause: '温度与电流同时超过演示阈值，提示负载相关热风险。', action: '暂停巡检 · 检查关节负载与散热', checklist: ['确认巡检已暂停', '检查右膝负载与散热状态', '记录维护并准备复检'] },
  can: { name: '通信异常', target: 'CAN 支路', values: [43, 2.4, 8.5, 1.2], cause: '丢包率超过演示阈值，提示通信支路异常；温度与电流正常。', action: '暂停巡检 · 检查总线连接与节点', checklist: ['确认巡检已暂停', '检查总线接线与节点连接', '记录维护并准备复检'] },
  pose: { name: '姿态偏移', target: '机身 IMU', values: [43, 2.4, 0.3, 14], cause: '机身倾角超过演示阈值，提示姿态风险；需要核对支撑与姿态零点。', action: '暂停巡检 · 检查支撑与姿态零点', checklist: ['确认巡检已暂停', '检查支撑与姿态零点', '记录维护并准备复检'] },
}
export const metrics = [
  { name: '关节温度', unit: '°C', limit: 65, max: 90 },
  { name: '驱动电流', unit: 'A', limit: 6, max: 10 },
  { name: 'CAN 丢包率', unit: '%', limit: 3, max: 12 },
  { name: '机身倾角', unit: '°', limit: 10, max: 20 },
]
export const normal = [43, 2.4, 0.3, 1.2]
export const diagnose = values => metrics.map((m, i) => ({ ...m, value: values[i], triggered: values[i] >= m.limit }))
export const initialState = () => ({ phase: 'idle', scenario: 'thermal', tick: 0, values: normal, samples: [], events: [], ticket: null, checks: [], outcome: null, runId: '' })
const log = (s, message, time) => [...s.events, { time, message }]
export function serviceReducer(s, a) {
  const time = a.time || new Date().toLocaleTimeString('zh-CN', { hour12: false })
  switch (a.type) {
    case 'reset': return initialState()
    case 'scenario': return s.phase === 'idle' && scenarios[a.id] ? { ...s, scenario: a.id } : s
    case 'start': return s.phase === 'idle' ? { ...s, phase: 'running', runId: a.id, samples: [normal], events: log(s, '巡检任务启动，开始浏览器模拟采样。', time) } : s
    case 'tick': {
      if (s.phase === 'idle' || s.phase === 'closed') return s
      const base = ['running', 'verified'].includes(s.phase) ? normal : scenarios[s.scenario].values
      const values = base.map((v, i) => +(v + Math.sin((s.tick + i) * .7) * (i < 2 ? .25 : .08)).toFixed(1))
      return { ...s, tick: s.tick + 1, values, samples: [...s.samples, values].slice(-30) }
    }
    case 'inject': return s.phase === 'running' ? { ...s, phase: 'alert', values: scenarios[s.scenario].values, samples: [...s.samples, scenarios[s.scenario].values].slice(-30), events: log(s, `注入${scenarios[s.scenario].name}；规则识别异常，巡检任务等待处置。`, time) } : s
    case 'adjust': return s.phase === 'alert' ? { ...s, phase: 'adjusted', events: log(s, `任务已暂停。${scenarios[s.scenario].action}（模拟操作）。`, time) } : s
    case 'ticket': return s.phase === 'adjusted' ? { ...s, phase: 'ticketed', ticket: { id: `WO-${s.runId}`, scenario: s.scenario, target: scenarios[s.scenario].target, createdAt: time, triggerValues: [...s.values] }, events: log(s, '生成维护工单，关联设备、异常数据与处置建议。', time) } : s
    case 'check': return s.phase === 'ticketed' && [0, 1, 2].includes(a.index) ? { ...s, checks: s.checks.includes(a.index) ? s.checks.filter(i => i !== a.index) : [...s.checks, a.index] } : s
    case 'verify': {
      if (s.phase !== 'ticketed' || s.checks.length !== 3) return s
      const values = a.recovered ? normal : scenarios[s.scenario].values
      const pass = !diagnose(values).some(m => m.triggered)
      return { ...s, phase: pass ? 'verified' : 'ticketed', values, samples: [...s.samples, values].slice(-30), outcome: pass ? 'pass' : 'fail', events: log(s, pass ? '恢复样本复检通过，等待归档并恢复任务。' : '故障仍在：复检未通过，工单保持待处理，任务继续暂停。', time) }
    }
    case 'close': return s.phase === 'verified' ? { ...s, phase: 'closed', events: log(s, '维护记录归档，巡检任务恢复。服务闭环完成。', time) } : s
    case 'normalClose': return s.phase === 'running' ? { ...s, phase: 'closed', events: log(s, '常规巡检完成，无异常；巡检记录已归档。', time) } : s
    default: return s
  }
}
