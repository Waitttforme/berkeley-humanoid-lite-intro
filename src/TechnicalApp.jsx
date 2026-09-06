import React, { useEffect } from 'react'
import App from './App.jsx'
import './styles.css'
import './model-studio.css'
export default function TechnicalApp() {
  useEffect(() => { document.title = 'Berkeley Humanoid Lite — 机器人技术展厅' }, [])
  return <><a href={import.meta.env.BASE_URL} style={{ position: 'fixed', bottom: 18, left: 18, zIndex: 9999, background: '#a8ead4', color: '#10231e', padding: '10px 18px', borderRadius: 5, fontSize: 13 }}>← 返回 3S 智慧服务首页</a><App/></>
}
