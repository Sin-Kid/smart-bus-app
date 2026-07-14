// src/pages/BusesPage.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseConfig'

export default function BusesPage() {
    const [buses, setBuses] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [editingBus, setEditingBus] = useState(null)
    const [formData, setFormData] = useState({ id: '', name: '' })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchBuses()
    }, [])

    const fetchBuses = async () => {
        setLoading(true)
        const { data, error } = await supabase.from('buses').select('*').order('id')
        if (error) console.error('Error:', error)
        else setBuses(data || [])
        setLoading(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.id.trim() || !formData.name.trim()) return alert('Please fill all fields')

        try {
            if (editingBus) {
                const { error } = await supabase
                    .from('buses')
                    .update({ name: formData.name.trim(), updated_at: new Date().toISOString() })
                    .eq('id', editingBus.id)
                if (error) throw error
                alert('Bus updated')
            } else {
                const { error } = await supabase
                    .from('buses')
                    .insert({ id: formData.id.trim().toUpperCase(), name: formData.name.trim() })

                if (error) {
                    if (error.code === '23505') alert('Bus ID already exists')
                    else throw error
                    return
                }
                alert('Bus created')
            }
            setShowForm(false)
            setEditingBus(null)
            setFormData({ id: '', name: '' })
            fetchBuses()
        } catch (error) {
            alert('Error: ' + error.message)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this bus?')) return
        const { error } = await supabase.from('buses').delete().eq('id', id)
        if (error) alert('Error: ' + error.message)
        else fetchBuses()
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>Buses Management</h2>
                <button onClick={() => { setShowForm(true); setEditingBus(null); setFormData({ id: '', name: '' }) }} className="btn-primary">
                    Add Bus
                </button>
            </div>

            {showForm && (
                <div className="card form-card">
                    <h3>{editingBus ? 'Edit Bus' : 'New Bus'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Bus ID</label>
                            <input
                                value={formData.id}
                                onChange={e => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                                disabled={!!editingBus}
                                placeholder="e.g. BUS001"
                            />
                        </div>
                        <div className="form-group">
                            <label>Bus Name</label>
                            <input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Red Express"
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary">Save</button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {buses.map(bus => (
                            <tr key={bus.id}>
                                <td>{bus.id}</td>
                                <td>{bus.name}</td>
                                <td>{new Date(bus.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button onClick={() => { setEditingBus(bus); setFormData({ id: bus.id, name: bus.name }); setShowForm(true) }} className="btn-small">Edit</button>
                                    <button onClick={() => handleDelete(bus.id)} className="btn-small btn-danger">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
