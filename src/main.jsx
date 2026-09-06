import React from 'react'
import ReactDOM from 'react-dom/client'

const App = React.lazy(() => import('./CompetitionApp.jsx'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.Suspense fallback={<p style={{ padding: 40 }}>正在加载展厅…</p>}><App /></React.Suspense>,
)
