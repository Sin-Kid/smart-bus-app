// src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import BusesPage from './pages/BusesPage'
import RoutesPage from './pages/RoutesPage'
import SchedulesPage from './pages/SchedulesPage'
import StatusPage from './pages/StatusPage'

export default function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/buses" element={<BusesPage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/status" element={<StatusPage />} />
        </Routes>
      </main>
    </div>
  )
}
