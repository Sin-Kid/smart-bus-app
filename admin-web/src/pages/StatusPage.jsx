// src/pages/StatusPage.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseConfig'

export default function StatusPage() {
  const [activeBuses, setActiveBuses] = useState([])
  const [buses, setBuses] = useState([]) // All buses for selection
  const [selectedBusId, setSelectedBusId] = useState('')
  const [statusMessage, setStatusMessage] = useState('On Time')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchBuses()
    fetchStatus()

    // Subscribe to changes
    const sub = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'telemetry' }, fetchStatus)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buses' }, fetchBuses) // Listen for status updates
      .subscribe()
    return () => sub.unsubscribe()
  }, [])

  const fetchBuses = async () => {
    const { data } = await supabase.from('buses').select('*').order('name')
    setBuses(data || [])
  }

  // Fetch raw logs
  const fetchStatus = async () => {
    const { data: tData } = await supabase.from('telemetry')
      .select('*, buses(*)')
      .order('timestamp', { ascending: false })
      .limit(50) // Show last 50 logs

    setActiveBuses(tData || []) // Store raw logs
  }

  /* New State for Stop Selection */
  const [currentRouteStops, setCurrentRouteStops] = useState([])
  const [currentRouteInfo, setCurrentRouteInfo] = useState(null)
  const [currentBusStatus, setCurrentBusStatus] = useState(null)
  // New State for Occupancy Simulation
  const [simOccupied, setSimOccupied] = useState(28)
  const [simLeaving, setSimLeaving] = useState(5)
  const [totalSeats, setTotalSeats] = useState(40)
  const [selectedStopId, setSelectedStopId] = useState('')
  const [selectedStopName, setSelectedStopName] = useState('')

  const fetchBusRoute = async (busId) => {
    if (!busId) {
      setCurrentRouteStops([])
      setCurrentRouteInfo(null)
      setCurrentBusStatus(null)
      return
    }

    // 1. Get Bus Status (including Sim data)
    const { data: busData } = await supabase.from('buses').select('*').eq('id', busId).single()
    setCurrentBusStatus(busData)
    // Initialize inputs with current db values
    if (busData) {
      setSimOccupied(busData.sim_occupied || 28)
      setSimLeaving(busData.sim_leaving || 5)
      setTotalSeats(busData.capacity || 40)

      // Initialize Dropdown Selection if current_stop_id matches
      if (busData.current_stop_id) setSelectedStopId(busData.current_stop_id)
      else if (busData.status_message?.includes('At ')) {
        // Logic to match source/dest if strict ID check fails (optional)
      }
    }

    // 2. Find Active Schedule/Route for this Bus
    const { data: schedule } = await supabase.from('bus_schedules')
      .select('route_id, route:bus_routes(source, destination)')
      .eq('bus_id', busId)
      .eq('status', 'active')
      .limit(1)
      .single()

    if (schedule && schedule.route_id) {
      setCurrentRouteInfo(schedule.route)
      const { data: stops } = await supabase.from('bus_stops')
        .select('*')
        .eq('route_id', schedule.route_id)
        .order('order')
      setCurrentRouteStops(stops || [])
    } else {
      setCurrentRouteStops([])
      setCurrentRouteInfo(null)
    }
  }

  const handleUpdate = async () => {
    setIsSubmitting(true)
    try {
      let stopId = selectedStopId
      let stopName = ''

      // Resolve Name
      if (stopId === 'source-node') stopName = currentRouteInfo?.source
      else if (stopId === 'dest-node') stopName = currentRouteInfo?.destination
      else {
        const s = currentRouteStops.find(s => s.id === stopId)
        if (s) stopName = s.name
      }

      // If no stop selected, maybe just update text? Assume stop selected for now or handle empty
      const statusMsg = stopName ? `At ${stopName}` : (currentBusStatus?.status_message || 'On Time')

      await supabase
        .from('buses')
        .update({
          current_stop_id: stopId === 'source-node' || stopId === 'dest-node' ? null : stopId,
          status_message: statusMsg,
          sim_occupied: simOccupied,
          sim_leaving: simLeaving,
          capacity: totalSeats,
          updated_at: new Date()
        })
        .eq('id', selectedBusId)

      // Refresh local state
      fetchBusRoute(selectedBusId)
      alert('Simulation Updated!')
    } catch (err) {
      console.error(err)
      alert('Error updating location')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Live Status & Simulation</h2>
        <p className="page-subtitle">Manage fleet location and occupancy simulation</p>
      </div>

      {/* Simulation Control Card */}
      {/* Simulation Control Card */}
      <div className="card" style={{
        border: 'none',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(to right, #2563eb, #3b82f6)',
          padding: '16px 24px',
          color: 'white'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Simulation Controls
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>
            Manually override bus location and occupancy data.
          </p>
        </div>

        {/* Bus Selection - Full Width */}
        <div style={{ padding: '24px' }}>

          {/* Bus Selection */}
          <div className="form-group">
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '8px', display: 'block' }}>
              Target Bus
            </label>
            <select
              value={selectedBusId}
              onChange={e => { setSelectedBusId(e.target.value); fetchBusRoute(e.target.value); }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Select a Bus to Control --</option>
              {buses.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedBusId && (
          <div style={{ marginTop: '20px' }}>

            {currentRouteStops.length === 0 ? (
              <div style={{ padding: '16px', background: '#f1f5f9', borderRadius: '8px', color: '#64748b', textAlign: 'center', fontSize: '14px' }}>
                No active route found for this bus. Please assign a schedule first.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>

                {/* Location Control */}
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '8px', display: 'block' }}>
                    Current Location
                  </label>
                  <select
                    value={selectedStopId}
                    onChange={(e) => setSelectedStopId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">-- Keep Current Location --</option>
                    <option value="source-node">START: {currentRouteInfo?.source}</option>
                    {currentRouteStops.map((s, idx) => (
                      <option key={s.id} value={s.id}>Stop #{idx + 1}: {s.name}</option>
                    ))}
                    <option value="dest-node">END: {currentRouteInfo?.destination}</option>
                  </select>
                </div>

                {/* Occupancy Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '15px',
                  background: '#eff6ff',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #dbeafe'
                }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '13px', color: '#1e40af' }}>Occupied Seats</label>
                    <input
                      type="number"
                      value={simOccupied}
                      onChange={(e) => setSimOccupied(parseInt(e.target.value))}
                      style={{ borderColor: '#bfdbfe' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '13px', color: '#1e40af' }}>Total Capacity</label>
                    <input
                      type="number"
                      value={totalSeats}
                      onChange={(e) => setTotalSeats(parseInt(e.target.value))}
                      style={{ borderColor: '#bfdbfe' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '13px', color: '#1e40af' }}>Prediction (Leaving)</label>
                    <input
                      type="number"
                      value={simLeaving}
                      onChange={(e) => setSimLeaving(parseInt(e.target.value))}
                      style={{ borderColor: '#bfdbfe' }}
                    />
                  </div>
                </div>

                {/* Primary Action */}
                <button
                  onClick={handleUpdate}
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '8px',
                    backgroundColor: isSubmitting ? '#94a3b8' : '#2563eb',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                    transition: 'all 0.2s',
                    marginTop: '8px'
                  }}
                >
                  {isSubmitting ? 'Updating System...' : 'Update Status Now'}
                </button>

                <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', margin: 0 }}>
                  Changes reflect immediately in the user app.
                </p>

              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Live Fleet Overview</h3>
        {buses.length === 0 ? (
          <p>No buses in fleet.</p>
        ) : (
          <table>
            <thead><tr><th>Bus Name</th><th>Current Status</th><th>Last Update</th></tr></thead>
            <tbody>
              {buses.map(b => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong></td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      background: b.status_message?.includes('Delay') ? '#fee2e2' : '#dcfce7',
                      color: b.status_message?.includes('Delay') ? '#991b1b' : '#166534',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {b.status_message || 'No Status'}
                    </span>
                  </td>
                  <td>{b.updated_at ? new Date(b.updated_at).toLocaleTimeString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Raw Telemetry Logs (Live from Arduino)</h3>
        {activeBuses.length === 0 ? (
          <p style={{ color: '#666' }}>No telemetry data received yet.</p>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Bus ID</th>
                  <th>Lat / Lon</th>
                  <th>Speed</th>
                </tr>
              </thead>
              <tbody>
                {activeBuses.map((t, i) => (
                  <tr key={i}>
                    <td>{new Date(t.timestamp).toLocaleString()}</td>
                    <td>{t.bus_id}</td>
                    <td>{t.location?.lat?.toFixed(5)}, {t.location?.lon?.toFixed(5)}</td>
                    <td>{t.speed} km/h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div >
  )
}
