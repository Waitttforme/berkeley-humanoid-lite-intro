import React, { useEffect, useState } from 'react'
import './recording.css'

const initialCue = {
  chapter: '3S / COMPETITION FILM',
  title: '人形机器人智慧运维与任务服务系统',
  subtitle: '物联网技术创新 · 电影化演示正在准备',
  truth: '可运行软件演示 / 本地模拟数据',
  progress: 0,
  fullscreen: true,
}

export default function RecordingOverlay() {
  const [cue, setCue] = useState(initialCue)
  const [pulse, setPulse] = useState(null)

  useEffect(() => {
    document.documentElement.classList.add('recording-active')
    const onCue = event => setCue(current => ({ ...current, ...event.detail }))
    const onPulse = event => {
      setPulse({ ...event.detail, id: Date.now() })
      window.setTimeout(() => setPulse(null), 900)
    }
    window.addEventListener('recording:cue', onCue)
    window.addEventListener('recording:pulse', onPulse)
    window.__RECORDING_OVERLAY_READY__ = true
    return () => {
      document.documentElement.classList.remove('recording-active')
      window.removeEventListener('recording:cue', onCue)
      window.removeEventListener('recording:pulse', onPulse)
      delete window.__RECORDING_OVERLAY_READY__
    }
  }, [])

  return <div className={`recording-overlay${cue.fullscreen ? ' is-fullscreen' : ''}${cue.outro ? ' is-outro' : ''}`} aria-hidden="true">
    <div className="recording-vignette"/><div className="recording-scan"/>
    <div className="recording-corners"><i/><i/><i/><i/></div>
    <div className="recording-caption" key={`${cue.chapter}-${cue.title}`}><span>{cue.chapter}</span><strong>{cue.title}</strong><p>{cue.subtitle}</p></div>
    <div className="recording-truth"><i/>{cue.truth}</div>
    <div className="recording-timecode">3S / FILM <b>{String(Math.round(cue.progress || 0)).padStart(2, '0')}</b></div>
    <div className="recording-progress"><span style={{ width: `${Math.max(0, Math.min(100, cue.progress || 0))}%` }}/></div>
    {pulse && (
      <i className="recording-click-pulse" key={pulse.id} style={{ left: pulse.x, top: pulse.y }}/>
    )}
  </div>
}
