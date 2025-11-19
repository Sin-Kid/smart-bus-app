// src/components/BusStopsManager.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

// Fix leaflet icon path for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png",
});

function LocationSelector({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
  return null;
}

export default function BusStopsManager() {
  // buses
  const [busesList, setBusesList] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState("");

  // stops
  const [stops, setStops] = useState([]); // ordered array of stop objects
  const [tempPos, setTempPos] = useState(null);
  const [editing, setEditing] = useState(null);
  const nameRef = useRef();
  const orderRef = useRef();

  // routes
  const [routes, setRoutes] = useState([]); // route docs for selected bus
  const [routeSelection, setRouteSelection] = useState(null); // selected route id
  const [routeStopsSelection, setRouteStopsSelection] = useState([]); // stop ids selected for creating route
  const routeNameRef = useRef();

  const mapRef = useRef();

  // load buses (dropdown)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "buses"), (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setBusesList(arr);
      if (!selectedBusId && arr.length) setSelectedBusId(arr[0].id);
    });
    return () => unsub();
  }, []);

  // listen stops for selected bus (ordered)
  useEffect(() => {
    if (!selectedBusId) {
      setStops([]);
      return;
    }
    const stopsCol = collection(db, "buses", selectedBusId, "stops");
    const q = query(stopsCol, orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setStops(arr);
      },
      (err) => console.error(err)
    );
    return () => unsub();
  }, [selectedBusId]);

  // listen routes for selected bus
  useEffect(() => {
    if (!selectedBusId) {
      setRoutes([]);
      return;
    }
    const col = collection(db, "buses", selectedBusId, "routes");
    const q = query(col, orderBy("ts", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setRoutes(arr);
      },
      (err) => console.error(err)
    );
    return () => unsub();
  }, [selectedBusId]);

  // Map click -> select position for new stop or move editing stop
  const onMapClick = (latlng) => {
    setTempPos(latlng);
    if (nameRef.current) nameRef.current.value = "";
    if (orderRef.current) orderRef.current.value = (stops.length + 1).toString();
    setEditing(null);
  };

  // create stop
  const createStop = async () => {
    if (!selectedBusId) return alert("Select a bus first");
    if (!tempPos) return alert("Click on map to choose location for stop");
    const name = nameRef.current.value.trim();
    const order = parseInt(orderRef.current.value || stops.length + 1, 10);
    if (!name) return alert("Enter stop name");
    const payload = {
      name,
      lat: tempPos.lat,
      lon: tempPos.lng,
      order,
      createdBy: auth?.currentUser?.uid || null,
      ts: serverTimestamp(),
    };
    try {
      const col = collection(db, "buses", selectedBusId, "stops");
      await addDoc(col, payload);
      setTempPos(null);
      if (nameRef.current) nameRef.current.value = "";
      if (orderRef.current) orderRef.current.value = "";
    } catch (e) {
      console.error(e);
      alert("Failed to create stop: " + e.message);
    }
  };

  // edit stop
  const startEdit = (s) => {
    setEditing(s);
    if (nameRef.current) nameRef.current.value = s.name;
    if (orderRef.current) orderRef.current.value = (s.order || "").toString();
    setTempPos({ lat: s.lat, lng: s.lon });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const name = nameRef.current.value.trim();
    const order = parseInt(orderRef.current.value || editing.order || 0, 10);
    if (!name) return alert("Enter name");
    try {
      const dref = doc(db, "buses", selectedBusId, "stops", editing.id);
      await updateDoc(dref, { name, order, lat: tempPos.lat, lon: tempPos.lng });
      setEditing(null);
      setTempPos(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update: " + e.message);
    }
  };

  const removeStop = async (id) => {
    if (!confirm("Delete this stop?")) return;
    try {
      await deleteDoc(doc(db, "buses", selectedBusId, "stops", id));
      // Also remove that stop from any routes that reference it? (optional)
      // For simplicity we keep historical route stop snapshots unchanged.
    } catch (e) {
      console.error(e);
      alert("Delete failed: " + e.message);
    }
  };

  // ROUTE: toggle stop selection for route creation
  const toggleRouteStopSelection = (stopId) => {
    setRouteStopsSelection((prev) =>
      prev.includes(stopId) ? prev.filter((s) => s !== stopId) : [...prev, stopId]
    );
  };

  // ROUTE: save route doc under buses/{busId}/routes
  const saveRoute = async () => {
    if (!selectedBusId) return alert("Select a bus first");
    const routeName = (routeNameRef.current?.value || "").trim();
    if (!routeName) return alert("Enter route name");
    if (!routeStopsSelection.length) return alert("Select at least one stop for the route");

    // build ordered stops array using stops list and preserving their 'order' when possible
    const selectedStops = routeStopsSelection
      .map((id) => stops.find((s) => s.id === id))
      .filter(Boolean)
      // preserve the order selected in routeStopsSelection
      .map((s, idx) => ({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        order: s.order ?? idx + 1,
      }));

    const payload = {
      name: routeName,
      stops: selectedStops,
      ts: serverTimestamp(),
    };

    try {
      const col = collection(db, "buses", selectedBusId, "routes");
      await addDoc(col, payload);
      // reset selection
      setRouteStopsSelection([]);
      if (routeNameRef.current) routeNameRef.current.value = "";
      alert("Route saved");
    } catch (e) {
      console.error(e);
      alert("Failed to save route: " + e.message);
    }
  };

  // ROUTE: delete route
  const deleteRoute = async (routeId) => {
    if (!confirm("Delete this route?")) return;
    try {
      await deleteDoc(doc(db, "buses", selectedBusId, "routes", routeId));
      if (routeSelection === routeId) setRouteSelection(null);
    } catch (e) {
      console.error(e);
      alert("Delete route failed: " + e.message);
    }
  };

  // when routeSelection changes, zoom to route
  useEffect(() => {
    if (!routeSelection) return;
    const r = routes.find((x) => x.id === routeSelection);
    if (!r || !r.stops || !r.stops.length) return;
    // fly to first stop
    const first = r.stops[0];
    if (mapRef.current && mapRef.current.flyTo)
      mapRef.current.flyTo([first.lat, first.lon], 14);
  }, [routeSelection]);

  // helper to goTo coordinates
  const goTo = (lat, lon) => {
    const map = mapRef.current;
    if (map && map.flyTo) map.flyTo([lat, lon], 16);
  };

  // build polyline coords for selected route
  const selectedRoutePolyline = () => {
    if (!routeSelection) return null;
    const r = routes.find((x) => x.id === routeSelection);
    if (!r || !r.stops) return null;
    return r.stops.map((s) => [s.lat, s.lon]);
  };

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <MapContainer
          center={[19.076, 72.8777]}
          zoom={12}
          style={{ height: "80vh", width: "100%" }}
          whenCreated={(map) => (mapRef.current = map)}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationSelector onSelect={onMapClick} />

          {stops.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lon]}>
              <Popup>
                <div>
                  <strong>{s.name}</strong>
                  <br />
                  order: {s.order}
                  <br />
                  <button onClick={() => startEdit(s)}>Edit</button>{" "}
                  <button onClick={() => removeStop(s.id)} style={{ marginLeft: 8 }}>
                    Delete
                  </button>
                  <hr />
                  <label style={{ fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={routeStopsSelection.includes(s.id)}
                      onChange={() => toggleRouteStopSelection(s.id)}
                    />{" "}
                    add to route
                  </label>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* temp marker for new/edit */}
          {tempPos && <Marker position={[tempPos.lat, tempPos.lng]} />}

          {/* draw selected route polyline */}
          {routeSelection && selectedRoutePolyline() && (
            <Polyline positions={selectedRoutePolyline()} />
          )}
        </MapContainer>
      </div>

      <div style={{ width: 420, padding: 12, background: "#f7f7f7", overflow: "auto" }}>
        <h3>Manage Bus Stops & Routes</h3>

        <div style={{ marginBottom: 10 }}>
          <label>
            <strong>Bus:</strong>
          </label>
          <br />
          <select
            value={selectedBusId}
            onChange={(e) => {
              setSelectedBusId(e.target.value);
              setRouteSelection(null);
              setRouteStopsSelection([]);
            }}
            style={{ width: "100%", padding: 8 }}
          >
            {busesList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id} — {b.name || ""}
              </option>
            ))}
          </select>
        </div>

        <section style={{ marginBottom: 12 }}>
          <small>Click map to choose location (then fill name/order and press Add)</small>
          <div style={{ marginTop: 8 }}>
            <input
              ref={nameRef}
              placeholder="Stop name"
              style={{ width: "100%", padding: 8, boxSizing: "border-box", marginBottom: 6 }}
            />
            <input
              ref={orderRef}
              placeholder="Order (1,2...)"
              style={{ width: "100%", padding: 8, boxSizing: "border-box", marginBottom: 6 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              {!editing ? (
                <button onClick={createStop} style={{ flex: 1 }}>
                  Add Stop
                </button>
              ) : (
                <>
                  <button onClick={saveEdit} style={{ flex: 1 }}>
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditing(null);
                      setTempPos(null);
                    }}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <hr />

        <section style={{ marginBottom: 12 }}>
          <h4>Create Route from Stops</h4>
          <small>
            Toggle <em>"add to route"</em> on stops (popup) or click stops below, then give route
            a name and Save Route.
          </small>

          <div style={{ marginTop: 8 }}>
            <input
              ref={routeNameRef}
              placeholder="Route name (e.g. MG Road - Station)"
              style={{ width: "100%", padding: 8, boxSizing: "border-box", marginBottom: 8 }}
            />
            <div style={{ marginBottom: 8 }}>
              <strong>Selected stops:</strong>
              <ol style={{ paddingLeft: 18 }}>
                {routeStopsSelection.map((id) => {
                  const s = stops.find((x) => x.id === id);
                  return s ? (
                    <li key={id}>
                      {s.name} — {s.lat.toFixed(5)},{s.lon.toFixed(5)}
                    </li>
                  ) : null;
                })}
              </ol>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveRoute} style={{ flex: 1 }}>
                Save Route
              </button>
              <button
                onClick={() => {
                  setRouteStopsSelection([]);
                  if (routeNameRef.current) routeNameRef.current.value = "";
                }}
                style={{ flex: 1 }}
              >
                Clear Selection
              </button>
            </div>
          </div>
        </section>

        <hr />

        <section style={{ marginBottom: 12 }}>
          <h4>Saved Routes</h4>
          <div>
            <select
              value={routeSelection || ""}
              onChange={(e) => setRouteSelection(e.target.value || null)}
              style={{ width: "100%", padding: 8, marginBottom: 8 }}
            >
              <option value="">-- Select route to view on map --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <div>
              {routes.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: 8,
                    borderRadius: 6,
                    background: routeSelection === r.id ? "#e6f0ff" : "#fff",
                    marginBottom: 8,
                    border: "1px solid #ddd",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <strong>{r.name}</strong>
                      <div style={{ fontSize: 13, color: "#444" }}>
                        {r.stops?.length || 0} stops
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => {
                          setRouteSelection(r.id);
                          // fly to first stop
                          if (r.stops && r.stops.length && mapRef.current?.flyTo) {
                            mapRef.current.flyTo([r.stops[0].lat, r.stops[0].lon], 13);
                          }
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          // populate route selection with stops from this route (so admin can tweak)
                          const stopIds = (r.stops || []).map((s) => s.id);
                          setRouteStopsSelection(stopIds);
                          if (routeNameRef.current) routeNameRef.current.value = r.name;
                        }}
                      >
                        Edit (load)
                      </button>
                      <button onClick={() => deleteRoute(r.id)} style={{ marginLeft: 6 }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr />

        <section>
          <h4>Stops (ordered)</h4>
          <ol>
            {stops.map((s) => (
              <li key={s.id} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => goTo(s.lat, s.lon)}>
                    <strong>{s.name}</strong> — {s.lat.toFixed(5)},{s.lon.toFixed(5)} — order: {s.order}
                  </div>
                  <div style={{ marginLeft: 8 }}>
                    <button onClick={() => startEdit(s)}>Edit</button>
                    <button onClick={() => removeStop(s.id)} style={{ marginLeft: 6 }}>
                      Delete
                    </button>
                    <button
                      onClick={() => toggleRouteStopSelection(s.id)}
                      style={{ marginLeft: 6 }}
                    >
                      {routeStopsSelection.includes(s.id) ? "Unselect" : "Add to Route"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
