// src/components/ConnectionStatus.jsx
import React, { useEffect, useState } from 'react'
import { getConnectionStatus } from '../utils/supabaseTest'

export default function ConnectionStatus() {
  const [status, setStatus] = useState({
    loading: true,
    connected: false,
    message: 'Checking connection...'
  })

  useEffect(() => {
    const checkConnection = async () => {
      setStatus({ loading: true, connected: false, message: 'Checking connection...' })
      
      const result = await getConnectionStatus()
      
      setStatus({
        loading: false,
        connected: result.connected,
        message: result.message || result.error || 'Unknown status',
        error: result.error,
        tables: result.tables,
        warning: result.warning
      })
    }

    checkConnection()
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    
    return () => clearInterval(interval)
  }, [])

  if (status.loading) {
    return (
      <div className="connection-status loading">
        <div className="status-indicator"></div>
        <span>{status.message}</span>
      </div>
    )
  }

  const handleRetry = async () => {
    setStatus({ loading: true, connected: false, message: 'Reconnecting...' })
    const result = await getConnectionStatus()
    setStatus({
      loading: false,
      connected: result.connected,
      message: result.message || result.error || 'Unknown status',
      error: result.error,
      tables: result.tables,
      warning: result.warning
    })
  }

  return (
    <div className={`connection-status ${status.connected ? 'connected' : 'disconnected'}`}>
      <div className={`status-indicator ${status.connected ? 'connected' : 'disconnected'}`}>
        {status.connected ? '✓' : '✗'}
      </div>
      <div className="status-content">
        <div className="status-message">{status.message}</div>
        {status.error && (
          <div className="status-error">{status.error}</div>
        )}
        {status.warning && (
          <div className="status-warning">{status.warning}</div>
        )}
        {status.tables && (
          <div className="status-tables">
            Tables: {status.tables.buses} buses, {status.tables.routes} routes, {status.tables.stops} stops
          </div>
        )}
      </div>
      {!status.loading && (
        <button 
          onClick={handleRetry}
          className="status-retry-btn"
          title="Retry connection"
        >
          🔄
        </button>
      )}
    </div>
  )
}

