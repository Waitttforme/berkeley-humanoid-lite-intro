import { useEffect } from 'react'

// Keep pointer work outside React, and stop decorative motion outside the viewport.
export default function useExhibitionMotion() {
  useEffect(() => {
    const root = document.querySelector('.competition')
    if (!root) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const fine = matchMedia('(hover: hover) and (pointer: fine)')
    const hero = root.querySelector('.hero-visual')
    let frame = 0
    let x = 0
    let y = 0
    let scrollFrame = 0
    const film = root.querySelector('.product-film')
    const updateScroll = () => {
      scrollFrame = 0
      if (!film || reduced.matches || document.hidden) return
      const bounds = film.getBoundingClientRect()
      if (bounds.bottom < 0 || bounds.top > innerHeight) return
      const progress = Math.max(0, Math.min(1, (innerHeight - bounds.top) / (innerHeight * .85)))
      film.style.setProperty('--film-scale', String(.94 + progress * .06))
      film.style.setProperty('--film-progress', `${progress * 100}%`)
    }
    const scheduleScroll = () => { if (!scrollFrame && !reduced.matches && !document.hidden) scrollFrame = requestAnimationFrame(updateScroll) }
    const reset = () => { cancelAnimationFrame(frame); frame = 0; hero?.style.setProperty('--pointer-x', '0px'); hero?.style.setProperty('--pointer-y', '0px') }
    const move = e => {
      if (!hero || reduced.matches || !fine.matches) return
      const box = hero.getBoundingClientRect()
      x = ((e.clientX - box.left) / box.width - .5) * 14
      y = ((e.clientY - box.top) / box.height - .5) * 10
      if (!frame) frame = requestAnimationFrame(() => { hero.style.setProperty('--pointer-x', `${x.toFixed(2)}px`); hero.style.setProperty('--pointer-y', `${y.toFixed(2)}px`); frame = 0 })
    }
    const reveals = [...root.querySelectorAll('.section-heading, .problem-intro, .problem-list, .architecture, .architecture-detail, .innovation-grid article, .evidence-card, .technical-entry, .application-layout, .value-grid, .deliverables')]
    let revealObserver
    const configure = () => {
      reset()
      cancelAnimationFrame(scrollFrame); scrollFrame = 0
      film?.style.setProperty('--film-scale', '1')
      film?.style.setProperty('--film-progress', '100%')
      scheduleScroll()
      revealObserver?.disconnect()
      reveals.forEach(el => el.classList.remove('reveal-pending'))
      if (reduced.matches) return
      revealObserver = new IntersectionObserver(entries => entries.forEach(({ target, isIntersecting }) => { if (isIntersecting) { target.classList.remove('reveal-pending'); revealObserver.unobserve(target) } }), { threshold: .06, rootMargin: '0px 0px 24px 0px' })
      reveals.forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('reveal-pending'); revealObserver.observe(el) } })
    }
    const motionObserver = new IntersectionObserver(entries => entries.forEach(({ target, isIntersecting }) => { target.classList.toggle('motion-visible', isIntersecting) }), { threshold: 0 })
    root.querySelectorAll('.hero-visual, .service-console').forEach(el => motionObserver.observe(el))
    const visibility = () => { root.classList.toggle('motion-hidden', document.hidden); if (document.hidden) reset() }
    const focusReveal = e => { e.target.closest('.reveal-pending')?.classList.remove('reveal-pending') }
    hero?.addEventListener('pointermove', move)
    hero?.addEventListener('pointerleave', reset)
    reduced.addEventListener('change', configure)
    fine.addEventListener('change', reset)
    document.addEventListener('visibilitychange', visibility)
    root.addEventListener('focusin', focusReveal)
    window.addEventListener('scroll', scheduleScroll, { passive: true })
    window.addEventListener('resize', scheduleScroll, { passive: true })
    configure(); visibility()
    return () => { reset(); cancelAnimationFrame(scrollFrame); window.removeEventListener('scroll', scheduleScroll); window.removeEventListener('resize', scheduleScroll); revealObserver?.disconnect(); motionObserver.disconnect(); hero?.removeEventListener('pointermove', move); hero?.removeEventListener('pointerleave', reset); reduced.removeEventListener('change', configure); fine.removeEventListener('change', reset); document.removeEventListener('visibilitychange', visibility); root.removeEventListener('focusin', focusReveal) }
  }, [])
}
