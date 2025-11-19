// src/pages/LogsPage.jsx
import React from 'react'
import LogsViewer from '../components/LogsViewer'

export default function LogsPage(){
  return (
    <div>
      <h2>Telemetry Logs</h2>
      <div style={{background:'#fff', padding:12, borderRadius:8}}>
        <LogsViewer />
      </div>
    </div>
  )
}
