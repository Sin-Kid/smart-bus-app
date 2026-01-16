// src/pages/SchedulesPage.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseConfig'

export default function SchedulesPage() {
  const [buses, setBuses] = useState([])
  const [routes, setRoutes] = useState([])
  const [schedules, setSchedules] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)

  const [formData, setFormData] = useState({
    bus_id: '', route_id: '', departure_time: '', arrival_time: '', days_of_week: [], fare: '', status: 'active'
  })

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayAbbr = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: bData } = await supabase.from('buses').select('*')
    setBuses(bData || [])
    const { data: rData } = await supabase.from('bus_routes').select('*')
    setRoutes(rData || [])
    fetchSchedules()
  }

  const fetchSchedules = async () => {
    const { data } = await supabase.from('bus_schedules').select('*').order('departure_time')
    setSchedules(data || [])
  }

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.bus_id || !formData.route_id || !formData.departure_time || !formData.arrival_time) return alert('Fill required fields')

    const payload = {
      ...formData,
      fare: parseFloat(formData.fare) || 0
    }

    try {
      if (editingSchedule) {
        await supabase.from('bus_schedules').update(payload).eq('id', editingSchedule.id)
      } else {
        await supabase.from('bus_schedules').insert(payload)
      }
      setShowForm(false)
      setEditingSchedule(null)
      fetchSchedules()
    } catch (error) {
      alert(error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return
    await supabase.from('bus_schedules').delete().eq('id', id)
    fetchSchedules()
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Bus Schedules</h2>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditingSchedule(null); setFormData({ bus_id: '', route_id: '', departure_time: '', arrival_time: '', days_of_week: [], fare: '', status: 'active' }) }}>Add Schedule</button>
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>{editingSchedule ? 'Edit' : 'New'} Schedule</h3>
          <form onSubmit={handleSubmit}>
            <select value={formData.bus_id} onChange={e => setFormData({ ...formData, bus_id: e.target.value })} required>
              <option value="">Select Bus</option>
              {buses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={formData.route_id} onChange={e => setFormData({ ...formData, route_id: e.target.value })} required>
              <option value="">Select Route</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="time" value={formData.departure_time} onChange={e => setFormData({ ...formData, departure_time: e.target.value })} required />
              <input type="time" value={formData.arrival_time} onChange={e => setFormData({ ...formData, arrival_time: e.target.value })} required />
            </div>
            <div style={{ display: 'flex', gap: 5, margin: '10px 0' }}>
              {days.map((d, i) => (
                <button type="button" key={d} onClick={() => toggleDay(d)} style={{ fontWeight: formData.days_of_week.includes(d) ? 'bold' : 'normal', opacity: formData.days_of_week.includes(d) ? 1 : 0.5 }}>
                  {dayAbbr[i]}
                </button>
              ))}
            </div>
            <input type="number" placeholder="Fare" value={formData.fare} onChange={e => setFormData({ ...formData, fare: e.target.value })} />
            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>Time</th><th>Details</th><th>Days</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {schedules.map(s => (
              <tr key={s.id}>
                <td>{s.departure_time} - {s.arrival_time}</td>
                <td>
                  Bus: {buses.find(b => b.id === s.bus_id)?.name}<br />
                  Route: {routes.find(r => r.id === s.route_id)?.name}
                </td>
                <td>{s.days_of_week.map(d => d.substr(0, 3)).join(', ')}</td>
                <td>{s.status}</td>
                <td>
                  <button className="btn-small" onClick={() => { setEditingSchedule(s); setFormData(s); setShowForm(true) }}>Edit</button>
                  <button className="btn-small btn-danger" onClick={() => handleDelete(s.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
