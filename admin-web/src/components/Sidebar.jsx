// src/components/Sidebar.jsx
import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Sidebar() {
  const location = useLocation()

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link'

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        Admin Panel
      </div>
      <nav className="sidebar-nav">
        <Link to="/" className={isActive('/')}>Dashboard</Link>
        <Link to="/buses" className={isActive('/buses')}>Buses</Link>
        <Link to="/routes" className={isActive('/routes')}>Routes</Link>
        <Link to="/schedules" className={isActive('/schedules')}>Schedules</Link>
        <Link to="/status" className={isActive('/status')}>Status</Link>
      </nav>
    </div>
  )
}
