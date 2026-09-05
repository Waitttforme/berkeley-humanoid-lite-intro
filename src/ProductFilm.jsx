import React, { useEffect, useRef, useState } from 'react'
import { Play, Pause, ArrowUpRight } from 'lucide-react'

export default function ProductFilm() {
  const video = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    const element = video.current
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) element.pause() }, { threshold: .1 })
    observer.observe(element)
    const pause = () => { if (document.hidden) element.pause() }
    document.addEventListener('visibilitychange', pause)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', pause) }
  }, [])
  const toggle = async () => { if (!video.current.paused) video.current.pause(); else try { await video.current.play(); setError(false) } catch { setError(true) } }
  return <section className="product-film" aria-labelledby="film-title">
    <div className="film-heading"><p>从运动，到服务。</p><h2 id="film-title">看见行动。<br/><span>理解每一次行动。</span></h2><div>机器人是系统的起点。<br/>感知、通信与维护，让行动拥有完整的服务支撑。</div></div>
    <div className="film-frame"><video ref={video} preload="none" playsInline muted loop poster={`${import.meta.env.BASE_URL}media/bhl-cover.png`} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setError(true)} aria-label="机器人平台行走资料视频，无音频解说"><source src={`${import.meta.env.BASE_URL}media/bhl-walk.mp4`} type="video/mp4"/></video><button className="film-play" onClick={toggle} aria-label={playing ? '暂停平台运动影像' : '播放平台运动影像'}>{playing ? <Pause size={18}/> : <Play size={18}/>}<span>{playing ? '暂停影像' : '观看运动影像'}</span></button></div>
    <div className="film-caption"><span>{error ? '影像暂时无法播放，请稍后重试。' : '平台运动资料 · 非本系统实时画面 · 静音播放'}</span><a href="?view=technical#capabilities">查看技术资料<ArrowUpRight size={14}/></a></div>
  </section>
}
