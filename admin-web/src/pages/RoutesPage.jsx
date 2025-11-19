// src/pages/RoutesPage.jsx
import React, { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'
import RoutesViewer from '../components/RoutesViewer'

export default function RoutesPage(){
  const [buses, setBuses] = useState([])
  const [selectedBus, setSelectedBus] = useState('')

  useEffect(() => {
    const unsub = onSnapshot(collection(db,'buses'), snap => {
      const arr = []
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }))
      setBuses(arr)
      if(!selectedBus && arr.length) setSelectedBus(arr[0].id)
    })
    return ()=>unsub()
  }, [])

  return (
    <div>
      <h2>Routes</h2>
      <div style={{display:'flex',gap:12}}>
        <div style={{flex:1, background:'#fff', padding:12, borderRadius:8}}>
          <div style={{marginBottom:12}}>
            <label><strong>Bus:</strong></label>
            <select value={selectedBus} onChange={e=>setSelectedBus(e.target.value)} style={{marginLeft:8}}>
              {buses.map(b => <option key={b.id} value={b.id}>{b.id} — {b.name || ''}</option>)}
            </select>
          </div>

          {selectedBus ? (
            <RoutesViewer busId={selectedBus} />
          ) : (
            <div>Select a bus to manage routes.</div>
          )}
        </div>

        <aside style={{width:320, background:'#fff', padding:12, borderRadius:8}}>
          <h4>Notes</h4>
          <p style={{fontSize:13,color:'#444'}}>Routes are stored under <code>buses/{'{busId}'}/routes</code> and contain a snapshot of stops. You can create routes from the Stops page, or import/export here later.</p>
        </aside>
      </div>
    </div>
  )
}
