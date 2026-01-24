const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const cors = require('cors');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const DEVICE_TOKEN = process.env.DEVICE_TOKEN;

// Haversine distance (km)
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Auth Middleware
app.use((req, res, next) => {
  const incoming = req.header('x-device-token') || '';
  if (incoming !== DEVICE_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

/**
 * Resolve Stop Name
 */
const resolveStop = async (busId, lat, lon) => {
  try {
    const { data: bus } = await supabase.from('buses').select('*').eq('id', busId).single();

    // 1. Simulation Check (Direct ID)
    if (bus?.current_stop_id && !['source-node', 'dest-node'].includes(bus.current_stop_id)) {
      const { data: s } = await supabase.from('bus_stops').select('*').eq('id', bus.current_stop_id).single();
      if (s) return { stop: s, stopsList: [] };
    }

    // 2. Get Route Stops
    const { data: sched } = await supabase.from('bus_schedules').select('route_id').eq('bus_id', busId).eq('status', 'active').limit(1);
    let stops = [];
    if (sched && sched.length > 0) {
      const { data: rs } = await supabase.from('bus_stops').select('*').eq('route_id', sched[0].route_id).order('order');
      if (rs) stops = rs;
    }

    // 3. Simulation Check (Name)
    if (bus?.current_location_name) {
      const match = stops.find(s => s.name === bus.current_location_name);
      if (match) return { stop: match, stopsList: stops };
    }

    // 4. GPS Check
    let cLat = lat || bus?.location?.lat;
    let cLon = lon || bus?.location?.lon;
    if (cLat && cLon && stops.length > 0) {
      let minD = Infinity, closest = null;
      stops.forEach(s => {
        const d = haversineKm(cLat, cLon, s.lat, s.lon);
        if (d < minD) { minD = d; closest = s; }
      });
      if (closest && minD < 0.5) return { stop: closest, stopsList: stops };
    }

    return { stop: bus?.current_location_name ? { name: bus.current_location_name } : null, stopsList: stops };
  } catch (err) {
    console.error('resolveStop error', err);
    return null;
  }
};

/**
 * Telemetry: Updates bus location and backfills ongoing trips
 */
app.post('/device/telemetry', async (req, res) => {
  const { busId, lat, lon, speed, heading } = req.body;
  const ts = new Date().toISOString();

  await supabase.from('buses').update({ last_seen: ts, location: { lat, lon }, speed, heading }).eq('id', busId);
  await supabase.from('telemetry').insert({ bus_id: busId, location: { lat, lon }, speed, heading, timestamp: ts });

  const ctx = await resolveStop(busId, lat, lon);
  if (ctx?.stop?.name) {
    await supabase.from('buses').update({ current_location_name: ctx.stop.name }).eq('id', busId);
    // Backfill ongoing trips for this bus that are missing a start name
    await supabase.from('trips').update({ start_stop_name: ctx.stop.name }).eq('bus_id', busId).eq('status', 'ongoing').is('start_stop_name', null);
  }
  res.json({ ok: true });
});

/**
 * RFID: Entry / Exit
 */
app.post('/device/rfid', async (req, res) => {
  const { busId, cardId, eventType, lat, lon } = req.body;
  const ts = new Date().toISOString();
  const ctx = await resolveStop(busId, lat, lon);
  const stopName = ctx?.stop?.name || null;

  if (eventType === 'entry') {
    const { data: trip } = await supabase.from('trips').insert({
      bus_id: busId, card_id: cardId, start_time: ts,
      start_location: { lat, lon }, start_stop_name: stopName,
      status: 'ongoing', fare: 0
    }).select().single();
    await supabase.from('cards').update({ active_trip: trip.id, last_seen: ts }).eq('id', cardId);
    return res.json({ ok: true, tripId: trip.id, startStop: stopName });
  }

  if (eventType === 'exit') {
    const { data: trips } = await supabase.from('trips').select('*').eq('card_id', cardId).eq('status', 'ongoing').single();
    if (!trips) return res.status(404).json({ error: 'No trip' });

    let fare = 10;
    if (ctx?.stopsList?.length > 0) {
      const sIdx = ctx.stopsList.findIndex(s => s.name === trips.start_stop_name);
      const eIdx = ctx.stopsList.findIndex(s => s.name === stopName);
      if (sIdx !== -1 && eIdx !== -1) {
        fare = 0;
        const [low, high] = sIdx < eIdx ? [sIdx, eIdx] : [eIdx, sIdx];
        for (let i = low; i <= high; i++) fare += (Number(ctx.stopsList[i].price) || 10);
      }
    }

    // Final check for start_stop_name if it's still missing
    let finalStartName = trips.start_stop_name;
    if (!finalStartName && ctx && ctx.stop && ctx.stop.name) {
      // If start is somehow still null (unlikely with telemetry backfill), use current as fallback or check bus loc again
      // But for now, we just proceed. Telemetry should have caught it.
    }

    await supabase.from('trips').update({
      end_time: ts,
      end_location: { lat, lon },
      end_stop_name: stopName,
      fare,
      status: 'finished'
    }).eq('id', trips.id);
    await supabase.from('cards').update({ active_trip: null, last_seen: ts }).eq('id', cardId);
    await supabase.from('transactions').insert({ card_id: cardId, trip_id: trips.id, amount: fare, bus_id: busId, type: 'trip', timestamp: ts });
    return res.json({ ok: true, fare, endStop: stopName });
  }
  res.status(400).json({ error: 'Invalid event' });
});

app.get('/', (req, res) => res.send('SmartBus API OK'));
app.listen(process.env.PORT || 3000, () => console.log('Server running'));
module.exports = app;
