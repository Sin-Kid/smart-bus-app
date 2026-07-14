// src/pages/StatusPage.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseConfig'
import MLPredictionPanel from '../components/MLPredictionPanel'
import PassengerFrequencyChart from '../components/PassengerFrequencyChart'
import RoutePassengerChart from '../components/RoutePassengerChart'
import BusSeatMap from '../components/BusSeatMap'
import RouteTimeline from '../components/RouteTimeline'


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
  // RFID Simulation State
  const [rfidCardId, setRfidCardId] = useState('596B7E05')
  const [rfidProcessing, setRfidProcessing] = useState(false)
  // Bulk capacity fix
  const [fixingCapacity, setFixingCapacity] = useState(false)
  const [fixResult, setFixResult] = useState(null)

  const handleBulkFixCapacity = async () => {
    setFixingCapacity(true)
    setFixResult(null)
    try {
      // Update ALL buses to capacity = 67 (52 seats + 15 standing)
      const { error, count } = await supabase
        .from('buses')
        .update({ capacity: 67 })
        .gte('id', '')          // matches all rows
        .select('id', { count: 'exact' })

      if (error) throw error

      // Also cap sim_occupied so it doesn't exceed 67
      await supabase.rpc
        ? null
        : null // no-op placeholder

      const { data: overcrowded } = await supabase
        .from('buses')
        .select('id, sim_occupied')
        .gt('sim_occupied', 67)

      if (overcrowded && overcrowded.length > 0) {
        for (const b of overcrowded) {
          await supabase.from('buses').update({ sim_occupied: 67 }).eq('id', b.id)
        }
      }

      setFixResult({ success: true, message: `✅ All buses updated to 67 total capacity!` })
      fetchBuses()
      if (selectedBusId) fetchBusRoute(selectedBusId)
    } catch (err) {
      setFixResult({ success: false, message: `❌ Error: ${err.message}` })
    } finally {
      setFixingCapacity(false)
    }
  }

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

      // Resolve Name and GPS Coordinates
      let stopLat = null
      let stopLon = null

      if (stopId === 'source-node') stopName = currentRouteInfo?.source
      else if (stopId === 'dest-node') stopName = currentRouteInfo?.destination
      else {
        const s = currentRouteStops.find(s => s.id === stopId)
        if (s) {
          stopName = s.name
          stopLat = s.lat
          stopLon = s.lon
        }
      }

      // If no stop selected, maybe just update text? Assume stop selected for now or handle empty
      const statusMsg = stopName ? `At ${stopName}` : (currentBusStatus?.status_message || 'On Time')

      // Build update object with GPS location if available
      const updateData = {
        current_stop_id: stopId === 'source-node' || stopId === 'dest-node' ? null : stopId,
        current_location_name: stopName || null,
        status_message: statusMsg,
        sim_occupied: simOccupied,
        sim_leaving: simLeaving,
        capacity: totalSeats,
        updated_at: new Date()
      }

      // *** NEW: Update GPS location JSONB for RFID simulation ***
      if (stopLat !== null && stopLon !== null) {
        updateData.location = { lat: stopLat, lon: stopLon }
      }

      await supabase
        .from('buses')
        .update(updateData)
        .eq('id', selectedBusId)

      /* --- BACKFILL FIX FOR START LOCATION: DISABLED TO PREVENT OVERWRITING STATIC SOURCE ---
      // We rely on the backend (functions/index.js) capturing the correct location at scan time.
      if (stopName) {
        // Code removed to prevent dynamic updates of start source
      }
      */

      // Fix "Unknown End" for recently finished trips (Simulation Testing Support)
      if (stopName) {
        // --- NEW: Also fix "Unknown End" for recently finished trips (Simulation Testing Support) ---
        // 1. Check for NULL end (update last 5 to catch recent tests)
        const { data: recentFinishedNull } = await supabase
          .from('trips')
          .select('id')
          .eq('bus_id', selectedBusId)
          .eq('status', 'finished')
          .is('end_stop_name', null)
          .order('end_time', { ascending: false })
          .limit(5)

        if (recentFinishedNull && recentFinishedNull.length > 0) {
          const ids = recentFinishedNull.map(t => t.id)
          await supabase.from('trips').update({ end_stop_name: stopName }).in('id', ids)
          console.log(`Backfilled ${ids.length} entries of Last Finished Trips (NULL End) with: ${stopName}`)
        }

        // 2. Check for "Unknown End" string (Fallback)
        const { data: recentFinishedUnknown } = await supabase
          .from('trips')
          .select('id')
          .eq('bus_id', selectedBusId)
          .eq('status', 'finished')
          .eq('end_stop_name', 'Unknown End')
          .order('end_time', { ascending: false })
          .limit(5)

        if (recentFinishedUnknown && recentFinishedUnknown.length > 0) {
          const ids = recentFinishedUnknown.map(t => t.id)
          await supabase.from('trips').update({ end_stop_name: stopName }).in('id', ids)
          console.log(`Backfilled ${ids.length} entries of Last Finished Trips ('Unknown End') with: ${stopName}`)
        }
        // ------------------------------------------------------------------------------------------
      }
      // ----------------------------------------------------------------

      // Refresh local state
      fetchBusRoute(selectedBusId)
      alert(`Simulation Updated! Location set to: ${stopName || 'GSP Coordinates'}`)
    } catch (err) {
      console.error(err)
      alert('Error updating location: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // RFID Simulation Handlers
  const handleRfidEntry = async () => {
    if (!rfidCardId || !selectedBusId) {
      alert('Please select a bus and enter a card ID')
      return
    }

    setRfidProcessing(true)
    try {
      // Get current bus location for GPS coordinates
      const { data: bus } = await supabase.from('buses').select('location').eq('id', selectedBusId).single()
      const lat = bus?.location?.lat || 0
      const lon = bus?.location?.lon || 0

      // Call the RPC function
      const { data, error } = await supabase.rpc('handle_bus_entry', {
        p_card_uid: rfidCardId,
        p_bus_id: selectedBusId,
        p_lat: lat,
        p_lon: lon
      })

      if (error) throw error

      if (data.status === 'success') {
        alert(`✅ ${data.message}\n\nSource: ${data.source || 'Unknown Location'}\nBalance: ₹${data.balance}`)
        fetchBusRoute(selectedBusId) // Refresh
      } else {
        alert(`❌ ${data.message}`)
      }
    } catch (err) {
      console.error(err)
      alert('Error simulating entry: ' + err.message)
    } finally {
      setRfidProcessing(false)
    }
  }

  const handleRfidExit = async () => {
    if (!rfidCardId || !selectedBusId) {
      alert('Please select a bus and enter a card ID')
      return
    }

    setRfidProcessing(true)
    try {
      // Get current bus location for GPS coordinates
      const { data: bus } = await supabase.from('buses').select('location').eq('id', selectedBusId).single()
      const lat = bus?.location?.lat || 0
      const lon = bus?.location?.lon || 0

      // Call the RPC function
      const { data, error } = await supabase.rpc('handle_bus_exit', {
        p_card_uid: rfidCardId,
        p_bus_id: selectedBusId,
        p_lat: lat,
        p_lon: lon
      })

      if (error) throw error

      if (data.status === 'success') {
        alert(`✅ ${data.message}\n\nDestination: ${data.destination || 'Unknown Location'}\nFare: ₹${data.deducted}\nBalance: ₹${data.balance}`)
        fetchBusRoute(selectedBusId) // Refresh
      } else {
        alert(`❌ ${data.message}`)
      }
    } catch (err) {
      console.error(err)
      alert('Error simulating exit: ' + err.message)
    } finally {
      setRfidProcessing(false)
    }
  }

  const handleQuickBoard = async () => {
    if (!selectedBusId) {
      alert('Please select a bus first')
      return
    }
    setRfidProcessing(true)
    try {
      const nextOccupied = Math.min(67, simOccupied + 1)
      const { error } = await supabase
        .from('buses')
        .update({
          sim_occupied: nextOccupied,
          updated_at: new Date()
        })
        .eq('id', selectedBusId)

      if (error) throw error
      setSimOccupied(nextOccupied)
      fetchBusRoute(selectedBusId)
    } catch (err) {
      console.error(err)
      alert('Error updating passenger count: ' + err.message)
    } finally {
      setRfidProcessing(false)
    }
  }

  const handleQuickExit = async () => {
    if (!selectedBusId) {
      alert('Please select a bus first')
      return
    }
    setRfidProcessing(true)
    try {
      const nextOccupied = Math.max(0, simOccupied - 1)
      const { error } = await supabase
        .from('buses')
        .update({
          sim_occupied: nextOccupied,
          updated_at: new Date()
        })
        .eq('id', selectedBusId)

      if (error) throw error
      setSimOccupied(nextOccupied)
      fetchBusRoute(selectedBusId)
    } catch (err) {
      console.error(err)
      alert('Error updating passenger count: ' + err.message)
    } finally {
      setRfidProcessing(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Live Status & Simulation</h2>
        <p className="page-subtitle">Manage fleet location and occupancy simulation</p>
      </div>

      {/* ── Bulk Capacity Fix Banner ─────────────────────────────────────── */}
      {buses.some(b => b.capacity !== 67) && !fixResult?.success && (
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
          borderRadius: 12,
          padding: '14px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
        }}>
          <div style={{ color: 'white' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              ⚠️ Some buses don't have 67 capacity (52 Seats + 15 Standing)
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>
              {buses.filter(b => b.capacity !== 67).map(b => `${b.name} (${b.capacity} cap)`).join(' · ')}
            </div>
          </div>
          <button
            onClick={handleBulkFixCapacity}
            disabled={fixingCapacity}
            style={{
              background: 'white',
              color: '#4f46e5',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: 14,
              cursor: fixingCapacity ? 'not-allowed' : 'pointer',
              opacity: fixingCapacity ? 0.7 : 1,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            {fixingCapacity ? '⏳ Updating...' : '🔧 Set All Buses → 67 Cap'}
          </button>
        </div>
      )}

      {/* Fix result toast */}
      {fixResult && (
        <div style={{
          padding: '12px 20px',
          borderRadius: 10,
          marginBottom: 16,
          background: fixResult.success ? '#dcfce7' : '#fee2e2',
          color: fixResult.success ? '#065f46' : '#991b1b',
          fontWeight: 600,
          fontSize: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{fixResult.message}</span>
          <button
            onClick={() => setFixResult(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
          >✕</button>
        </div>
      )}

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
                {(() => {
                  const derivedStanding = Math.min(Math.max(0, simOccupied - 52), 15)
                  const derivedSeated   = Math.min(simOccupied, 52)
                  return (
                    <div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '15px',
                        background: '#eff6ff',
                        padding: '20px',
                        borderRadius: '8px 8px 0 0',
                        border: '1px solid #dbeafe',
                        borderBottom: 'none',
                      }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '13px', color: '#1e40af' }}>Total Passengers (Tickets)</label>
                          <input
                            type="number"
                            value={simOccupied}
                            min={0}
                            max={67}
                            onChange={(e) => setSimOccupied(Math.min(67, Math.max(0, parseInt(e.target.value) || 0)))}
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

                      {/* Derived standing info strip */}
                      <div style={{
                        background: derivedStanding > 0 ? (derivedStanding >= 15 ? '#fee2e2' : '#f5f3ff') : '#f0fdf4',
                        border: '1px solid',
                        borderColor: derivedStanding >= 15 ? '#fca5a5' : derivedStanding > 0 ? '#ddd6fe' : '#bbf7d0',
                        borderRadius: '0 0 8px 8px',
                        padding: '10px 20px',
                        display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 11, color: '#6b7280' }}>💺 Seated</span>
                          <span style={{ fontSize: 18, fontWeight: 800, color: derivedSeated >= 52 ? '#ef4444' : '#1e3a5f' }}>
                            {derivedSeated} <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af' }}>/ 52</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 11, color: '#6b7280' }}>🧍 Standing (Aisle)</span>
                          <span style={{ fontSize: 18, fontWeight: 800, color: derivedStanding >= 15 ? '#ef4444' : derivedStanding > 8 ? '#d97706' : '#7c3aed' }}>
                            {derivedStanding} <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af' }}>/ 15</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 11, color: '#6b7280' }}>🚌 Total Capacity</span>
                          <span style={{ fontSize: 18, fontWeight: 800, color: '#374151' }}>
                            67 <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af' }}>(52+15)</span>
                          </span>
                        </div>
                        {derivedStanding >= 15 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', padding: '3px 10px', borderRadius: 8, background: '#fee2e2', border: '1px solid #fca5a5' }}>
                            ⚠️ Aisle full — no boarding!
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })()}

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

                {/* RFID Simulation Section */}
                <div style={{
                  marginTop: '24px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '8px',
                  border: '2px solid #fbbf24'
                }}>
                  <h4 style={{
                    margin: '0 0 12px 0',
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🎫 RFID Scan Simulation
                  </h4>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '13px', color: '#78350f', fontWeight: '600' }}>Card ID / UID</label>
                    <input
                      type="text"
                      value={rfidCardId}
                      onChange={(e) => setRfidCardId(e.target.value)}
                      placeholder="e.g., 596B7E05"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid #fbbf24',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      onClick={handleRfidEntry}
                      disabled={rfidProcessing}
                      style={{
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        borderRadius: '6px',
                        backgroundColor: rfidProcessing ? '#d1d5db' : '#10b981',
                        color: 'white',
                        border: 'none',
                        cursor: rfidProcessing ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {rfidProcessing ? '⏳ Processing...' : '🚪 Scan Entry'}
                    </button>

                    <button
                      onClick={handleRfidExit}
                      disabled={rfidProcessing}
                      style={{
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        borderRadius: '6px',
                        backgroundColor: rfidProcessing ? '#d1d5db' : '#ef4444',
                        color: 'white',
                        border: 'none',
                        cursor: rfidProcessing ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {rfidProcessing ? '⏳ Processing...' : '🚪 Scan Exit'}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    <button
                      onClick={handleQuickBoard}
                      disabled={rfidProcessing}
                      style={{
                        padding: '10px',
                        fontSize: '13px',
                        fontWeight: '600',
                        borderRadius: '6px',
                        backgroundColor: rfidProcessing ? '#d1d5db' : '#047857',
                        color: 'white',
                        border: 'none',
                        cursor: rfidProcessing ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {rfidProcessing ? '⏳...' : '➕ Board (No RFID)'}
                    </button>

                    <button
                      onClick={handleQuickExit}
                      disabled={rfidProcessing}
                      style={{
                        padding: '10px',
                        fontSize: '13px',
                        fontWeight: '600',
                        borderRadius: '6px',
                        backgroundColor: rfidProcessing ? '#d1d5db' : '#b91c1c',
                        color: 'white',
                        border: 'none',
                        cursor: rfidProcessing ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {rfidProcessing ? '⏳...' : '➖ Exit (No RFID)'}
                    </button>
                  </div>

                  <p style={{
                    fontSize: '11px',
                    color: '#78350f',
                    marginTop: '12px',
                    marginBottom: 0,
                    lineHeight: '1.4'
                  }}>
                    💡 <strong>Tip:</strong> Set bus location first, then simulate RFID scans. The source/destination will be automatically resolved from GPS coordinates.
                  </p>
                </div>

                {/* ===== DIGITAL TWIN: Seat Map + Route Timeline ===== */}
                <div style={{
                  marginTop: 24,
                  padding: '20px',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  borderRadius: 12,
                  border: '1px solid #bae6fd',
                }}
                >
                  <h4 style={{
                    margin: '0 0 16px',
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#0c4a6e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    🖥️ Digital Twin — Live Bus Simulation
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 16,
                  }}>
                    <BusSeatMap
                      capacity={67}
                      occupied={simOccupied}
                      leaving={simLeaving}
                      busName={currentBusStatus?.name || selectedBusId}
                    />
                    <RouteTimeline
                      stops={currentRouteStops}
                      source={currentRouteInfo?.source}
                      destination={currentRouteInfo?.destination}
                      currentStop={currentBusStatus?.current_location_name}
                      currentOccupancy={simOccupied}
                      capacity={totalSeats}
                      leavingCount={simLeaving}
                      speed={currentBusStatus?.speed || 0}
                    />
                  </div>
                </div>
                {/* ===== END DIGITAL TWIN ===== */}

                {/* ML Prediction Panel */}
                <MLPredictionPanel
                  busId={selectedBusId}
                  currentStopId={selectedStopId}
                  currentOccupancy={simOccupied}
                  stops={currentRouteStops}
                />

                {/* Passenger Frequency Chart */}
                <PassengerFrequencyChart busId={selectedBusId} />

                {/* Route Passenger Distribution Chart */}
                <RoutePassengerChart />

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
