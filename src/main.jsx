import React from 'react'
import ReactDOM from 'react-dom/client'

const technical = new URLSearchParams(window.location.search).get('view') === 'technical'
const App = technical ? React.lazy(() => import('./TechnicalApp.jsx')) : React.lazy(() => import('./CompetitionApp.jsx'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.Suspense fallback={<p style={{ padding: 40 }}>正在加载展厅…</p>}><App /></React.Suspense>,
)
