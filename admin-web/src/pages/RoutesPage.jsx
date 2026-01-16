import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseConfig'
import TimePicker from '../components/TimePicker'

export default function RoutesPage() {
  const [buses, setBuses] = useState([])
  const [routes, setRoutes] = useState([])
  const [stops, setStops] = useState([])
  const [selectedBus, setSelectedBus] = useState('')
  const [selectedRoute, setSelectedRoute] = useState(null)

  const [showRouteForm, setShowRouteForm] = useState(false)
  const [showStopForm, setShowStopForm] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  const [routeForm, setRouteForm] = useState({ name: '', source: '', destination: '' })
  const [stopForm, setStopForm] = useState({ name: '', route_id: '', targetOrder: null, arrival_time: '' })

  const [editingRoute, setEditingRoute] = useState(null)
  const [editingStop, setEditingStop] = useState(null)

  useEffect(() => {
    fetchBuses()
  }, [])

  useEffect(() => {
    if (selectedBus) {
      fetchRoutes()
      fetchStops()
    }
  }, [selectedBus])

  const fetchBuses = async () => {
    const { data } = await supabase.from('buses').select('*').order('id')
    setBuses(data || [])
    if (data && data.length > 0 && !selectedBus) setSelectedBus(data[0].id)
  }

  const fetchRoutes = async () => {
    const { data } = await supabase.from('bus_routes').select('*').eq('bus_id', selectedBus).order('created_at')
    setRoutes(data || [])
  }

  /* Autocomplete Data */
  const [allLocations, setAllLocations] = useState([])

  useEffect(() => {
    fetchAllLocations()
  }, [])

  const fetchAllLocations = async () => {
    try {
      // 1. Fetch from bus_stops
      const { data: stopsData } = await supabase.from('bus_stops').select('name')

      // 2. Fetch from bus_routes
      const { data: routesData } = await supabase.from('bus_routes').select('source, destination')

      const unique = new Set()
      stopsData?.forEach(s => s.name && unique.add(s.name))
      routesData?.forEach(r => {
        if (r.source) unique.add(r.source)
        if (r.destination) unique.add(r.destination)
      })

      setAllLocations([...unique].sort())
    } catch (err) {
      console.error(err)
    }
  }

  const fetchStops = async () => {
    const { data } = await supabase.from('bus_stops')
      .select('id, name, lat, lon, order, route_id, bus_id, arrival_time')
      .eq('bus_id', selectedBus)
      .order('order')
    setStops(data || [])
  }

  const handleRouteSubmit = async (e) => {
    e.preventDefault()
    if (!selectedBus) return alert('Select a bus')

    try {
      if (editingRoute) {
        const { error } = await supabase.from('bus_routes')
          .update({ name: routeForm.name, source: routeForm.source, destination: routeForm.destination })
          .eq('id', editingRoute.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('bus_routes')
          .insert({ bus_id: selectedBus, name: routeForm.name, source: routeForm.source, destination: routeForm.destination })
        if (error) throw error
      }
      setShowRouteForm(false)
      setEditingRoute(null)
      setRouteForm({ name: '', source: '', destination: '' })
      fetchRoutes()
    } catch (error) {
      alert(error.message)
    }
  }

  const handleStopSubmit = async (e) => {
    e.preventDefault()
    if (!stopForm.route_id) return alert('Select a route')

    try {
      // Logic to insert between or at end
      const routeStops = stops.filter(s => s.route_id === stopForm.route_id)
      let newOrder = 0

      if (editingStop) {
        // Update existing
        const { error } = await supabase.from('bus_stops')
          .update({ name: stopForm.name, route_id: stopForm.route_id, arrival_time: stopForm.arrival_time })
          .eq('id', editingStop.id)
        if (error) throw error
      } else {
        // Insert New
        if (stopForm.targetOrder !== null) {
          // Insert in middle: Shift everyone down
          newOrder = stopForm.targetOrder
          // 1. Shift stops with order >= newOrder
          const stopsToShift = routeStops.filter(s => (s.order || 0) >= newOrder)
          for (const s of stopsToShift) {
            await supabase.from('bus_stops').update({ order: s.order + 1 }).eq('id', s.id)
          }
        } else {
          // Insert at end
          const maxOrder = Math.max(0, ...routeStops.map(s => s.order || 0))
          newOrder = maxOrder + 1
        }

        const { error } = await supabase.from('bus_stops')
          .insert({
            bus_id: selectedBus,
            route_id: stopForm.route_id,
            name: stopForm.name,
            arrival_time: stopForm.arrival_time,
            order: newOrder,
            lat: 0, lon: 0
          })
        if (error) throw error
      }
      setShowStopForm(false)
      setEditingStop(null)
      setStopForm({ name: '', route_id: '', targetOrder: null, arrival_time: '' })
      fetchStops()
    } catch (error) {
      console.error(error)
      alert(error.message)
    }
  }

  const handleDeleteRoute = async (id) => {
    if (!confirm('Delete route?')) return
    await supabase.from('bus_routes').delete().eq('id', id)
    fetchRoutes()
    fetchStops()
  }

  const handleDeleteStop = async (id) => {
    if (!confirm('Delete stop?')) return
    await supabase.from('bus_stops').delete().eq('id', id)
    fetchStops()
  }

  const getRouteStops = (routeId) => {
    return stops.filter(s => s.route_id === routeId).sort((a, b) => (a.order || 0) - (b.order || 0))
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Routes & Stops</h2>
        <p className="page-subtitle">Manage bus routes, stops, and schedules</p>
      </div>

      <div className="card" style={{
        border: 'none',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        marginBottom: '24px',
        overflow: 'hidden',
        padding: '24px'
      }}>
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '8px', display: 'block' }}>
          Select Bus to Manage
        </label>
        <select
          value={selectedBus}
          onChange={e => setSelectedBus(e.target.value)}
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
          {buses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {selectedBus && (
        <>
          <div className="section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Active Routes</h3>
              <button
                className="btn-primary"
                onClick={() => { setShowRouteForm(true); setEditingRoute(null); setRouteForm({ name: '', source: '', destination: '' }) }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                  fontSize: '14px'
                }}
              >
                + Add New Route
              </button>
            </div>

            {showRouteForm && (
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                marginBottom: '24px',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#334155' }}>
                  {editingRoute ? 'Edit Route' : 'Create New Route'}
                </h4>
                <form onSubmit={handleRouteSubmit} style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#64748b' }}>Route Name</label>
                    <input
                      placeholder="e.g., Downtown Express"
                      value={routeForm.name}
                      onChange={e => setRouteForm({ ...routeForm, name: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#64748b' }}>Source</label>
                      <input
                        placeholder="Start Station"
                        list="location-suggestions"
                        value={routeForm.source}
                        onChange={e => setRouteForm({ ...routeForm, source: e.target.value })}
                        required
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#64748b' }}>Destination</label>
                      <input
                        placeholder="End Station"
                        list="location-suggestions"
                        value={routeForm.destination}
                        onChange={e => setRouteForm({ ...routeForm, destination: e.target.value })}
                        required
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>

                  {/* Shared Datalist */}
                  <datalist id="location-suggestions">
                    {allLocations.map((loc, i) => <option key={i} value={loc} />)}
                  </datalist>

                  <div className="form-actions" style={{ marginTop: '8px' }}>
                    <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Save Route</button>
                    <button type="button" className="btn-secondary" onClick={() => setShowRouteForm(false)} style={{ padding: '10px 20px' }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {routes.map(route => {
              const routeStops = getRouteStops(route.id)
              return (
                <div key={route.id} className="card" style={{
                  marginBottom: '24px',
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  padding: 0
                }}>
                  {/* Route Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>{route.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', background: '#ecfccb', color: '#3f6212', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>Active</span>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                          {route.source} ➝ {route.destination}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-small"
                        onClick={() => {
                          setSelectedRoute(route.id);
                          setShowStopForm(true);
                          setEditingStop(null);
                          setStopForm({ name: '', route_id: route.id, targetOrder: null, arrival_time: '' })
                        }}
                        style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569' }}
                      >
                        + Add Stop
                      </button>
                      <button
                        className="btn-small"
                        onClick={() => { setEditingRoute(route); setRouteForm(route); setShowRouteForm(true) }}
                        style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569' }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-small btn-danger"
                        onClick={() => handleDeleteRoute(route.id)}
                        style={{ background: 'white', border: '1px solid #fecaca', color: '#dc2626' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Journey Visualization */}
                  <div style={{
                    padding: '15px',
                    background: 'white',
                    borderRadius: '6px',
                    maxHeight: '300px', // SCROLLABLE
                    overflowY: 'auto'
                  }}>
                    {/* ... (Journey visualizer) ... */}
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px' }}>JOURNEY</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

                      {/* Source */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '5px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#22c55e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>S</div>
                        <div style={{ fontWeight: '600' }}>{route.source}</div>
                      </div>

                      {/* Add Button after Source (Order 1) */}
                      <div style={{ paddingLeft: '11px', borderLeft: '2px solid #e2e8f0', marginLeft: '11px', paddingBottom: '10px', paddingTop: '10px' }}>
                        <button
                          onClick={() => {
                            setSelectedRoute(route.id)
                            setShowStopForm(true)
                            setEditingStop(null)
                            // Insert at index 1 (between source and first stop)
                            setStopForm({ name: '', route_id: route.id, targetOrder: 1, arrival_time: '' })
                            setShowTimePicker(false)
                          }}
                          className="btn-small"
                          style={{ fontSize: '10px', padding: '2px 6px', margin: 0, background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          title="Insert stop here"
                        >
                          + Insert Stop
                        </button>
                      </div>

                      {/* Stops */}
                      {routeStops.map((stop, idx) => (
                        <div key={stop.id}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '5px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>{idx + 1}</div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: '500' }}>{stop.name}</span>
                              {stop.arrival_time && (
                                <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                  🕒 {stop.arrival_time}
                                </span>
                              )}
                            </div>
                            <button className="btn-small" onClick={() => { setEditingStop(stop); setStopForm(stop); setShowStopForm(true); setShowTimePicker(false) }}>Edit</button>
                            <button className="btn-small btn-danger" onClick={() => handleDeleteStop(stop.id)}>Delete</button>
                          </div>

                          {/* Add Insert Button After Each Stop */}
                          <div style={{ paddingLeft: '11px', borderLeft: '2px solid #e2e8f0', marginLeft: '11px', paddingBottom: '10px', paddingTop: '10px' }}>
                            <button
                              onClick={() => {
                                setSelectedRoute(route.id)
                                setShowStopForm(true)
                                setEditingStop(null)
                                // Insert at next position
                                setStopForm({ name: '', route_id: route.id, targetOrder: (stop.order || 0) + 1, arrival_time: '' })
                                setShowTimePicker(false)
                              }}
                              className="btn-small"
                              style={{ fontSize: '10px', padding: '2px 6px', margin: 0, background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              title="Insert stop here"
                            >
                              + Insert Stop
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Destination */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>D</div>
                        <div style={{ fontWeight: '600' }}>{route.destination}</div>
                      </div>
                    </div>

                    {routeStops.length === 0 && (
                      <p style={{ color: '#64748b', fontSize: '13px', marginTop: '10px', fontStyle: 'italic' }}>
                        No intermediate stops. Use "Insert Stop" to add stops.
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {showStopForm && (
            <div className="card" style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              minWidth: '420px',
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              <h4 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                {editingStop ? 'Edit Stop' : 'Add New Stop'}
                {stopForm.targetOrder !== null && !editingStop &&
                  <span style={{ fontSize: '13px', color: '#3b82f6', marginLeft: '10px', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                    Inserting at Pos #{stopForm.targetOrder}
                  </span>
                }
              </h4>
              <form onSubmit={handleStopSubmit} style={{ display: 'grid', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#64748b' }}>Route</label>
                  <select
                    value={stopForm.route_id}
                    onChange={e => setStopForm({ ...stopForm, route_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                  >
                    <option value="">Select Route</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#64748b' }}>Stop Name</label>
                  <input
                    placeholder="e.g., Central Park"
                    list="location-suggestions"
                    value={stopForm.name}
                    onChange={e => setStopForm({ ...stopForm, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#64748b' }}>Arrival Time (Optional)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      placeholder="Click to select time"
                      value={stopForm.arrival_time || ''}
                      readOnly
                      onClick={() => setShowTimePicker(!showTimePicker)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', background: 'white' }}
                    />
                    {showTimePicker && (
                      <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translate(-50%, -10px)', zIndex: 20 }}>
                        <TimePicker
                          value={stopForm.arrival_time}
                          onChange={(val) => setStopForm({ ...stopForm, arrival_time: val })}
                          onClose={() => setShowTimePicker(false)}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-actions" style={{ marginTop: '8px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowStopForm(false)} style={{ padding: '10px 20px', borderRadius: '6px' }}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ padding: '10px 20px', borderRadius: '6px' }}>Save Stop</button>
                </div>
              </form>
            </div>
          )}

          {showStopForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={() => setShowStopForm(false)}></div>
          )}
        </>
      )}
    </div>
  )
}
