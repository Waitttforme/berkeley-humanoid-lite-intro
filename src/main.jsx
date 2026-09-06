import React from 'react'
import ReactDOM from 'react-dom/client'

const pageUrl = new URL(window.location.href)
const legacyTechnical = pageUrl.searchParams.get('view') === 'technical'
if (legacyTechnical) {
  pageUrl.searchParams.delete('view')
  pageUrl.hash = 'model-studio'
  window.history.replaceState({}, '', `${pageUrl.pathname}${pageUrl.search}${pageUrl.hash}`)
}
const App = React.lazy(() => import('./CompetitionApp.jsx'))
const rootElement = document.getElementById('root')

ReactDOM.createRoot(rootElement).render(
  <React.Suspense fallback={<p style={{ padding: 40 }}>正在加载展厅…</p>}><App /></React.Suspense>,
)

if (legacyTechnical) {
  const scrollToModel = () => {
    const model = document.getElementById('model-studio')
    if (!model) return false
    model.scrollIntoView({ block: 'start' })
    return true
  }
  if (!scrollToModel()) {
    const observer = new MutationObserver(() => {
      if (scrollToModel()) observer.disconnect()
    })
    observer.observe(rootElement, { childList: true, subtree: true })
    window.setTimeout(() => observer.disconnect(), 10_000)
  }
}
