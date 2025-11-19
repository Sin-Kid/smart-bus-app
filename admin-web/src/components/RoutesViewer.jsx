// src/components/RoutesViewer.jsx
import React, { useEffect, useState, useRef } from 'react'
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebaseConfig'
import { MapContainer, TileLayer, Polyline } from 'react-leaflet'

export default function RoutesViewer({ busId }) {
  const [routes, setRoutes] = useState([])
  const [selected, setSelected] = useState(null)
  const mapRef = useRef()

  useEffect(() => {
    if (!busId) return
    const col = collection(db, 'buses', busId, 'routes')
    const q = query(col, orderBy('ts','desc'))
    const unsub = onSnapshot(q, snap => {
      const arr = []
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }))
      setRoutes(arr)
    })
    return ()=>unsub()
  }, [busId])

  useEffect(() => {
    if (!selected) return
    const r = routes.find(x=>x.id===selected)
    if (r && r.stops && r.stops.length && mapRef.current?.flyTo) {
      mapRef.current.flyTo([r.stops[0].lat, r.stops[0].lon], 13)
    }
  }, [selected, routes])

  const deleteRoute = async (id) => {
    if(!confirm('Delete route?')) return
    await deleteDoc(doc(db,'buses', busId, 'routes', id))
  }

  const polyline = () => {
    if(!selected) return null
    const r = routes.find(x=>x.id===selected)
    if(!r || !r.stops) return null
    return r.stops.map(s=>[s.lat, s.lon])
  }

  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:12}}>
      <div>
        <MapContainer whenCreated={m=>mapRef.current = m} center={[19.076,72.8777]} zoom={12} style={{height:400,width:'100%'}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {selected && polyline() && <Polyline positions={polyline()} />}
        </MapContainer>
      </div>

      <div>
        <div style={{marginBottom:8}}>
          <select value={selected||''} onChange={e=>setSelected(e.target.value)} style={{width:'100%', padding:8}}>
            <option value=''>-- Select route --</option>
            {routes.map(r=> <option key={r.id} value={r.id}>{r.name} ({r.stops?.length || 0} stops)</option>)}
          </select>
        </div>

        <div>
          {routes.map(r => (
            <div key={r.id} style={{padding:8, border:'1px solid #eee', marginBottom:8, borderRadius:6, background: selected===r.id ? '#eaf2ff' : '#fff'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <div>
                  <strong>{r.name}</strong>
                  <div style={{fontSize:12, color:'#444'}}>{r.stops?.length || 0} stops</div>
                </div>
                <div style={{display:'flex', gap:6}}>
                  <button onClick={()=>setSelected(r.id)}>View</button>
                  <button onClick={()=> { setSelected(r.id); /* route edit can be loaded in Stops page */ }}>Edit</button>
                  <button onClick={()=>deleteRoute(r.id)} style={{marginLeft:6}}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
