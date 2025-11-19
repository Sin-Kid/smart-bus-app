// src/pages/StopsPage.jsx
import React from 'react'
import BusStopsManager from '../components/BusStopsManager'

export default function StopsPage(){
  return (
    <div style={{padding:8}}>
      <h2>Stops — Map Editor</h2>
      <p style={{color:'#555'}}>Add / edit / delete stops for a selected bus. Click the map to set a location.</p>
      <div style={{background:'#fff', padding:12, borderRadius:8}}>
        <BusStopsManager />
      </div>
    </div>
  )
}
