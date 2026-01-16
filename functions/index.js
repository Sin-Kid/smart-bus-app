const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const cors = require('cors');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase Config! Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GeoPoint is no longer used. We rely on standard JavaScript Date objects for timestamps.

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Device token: prefer env var
const DEVICE_TOKEN = process.env.DEVICE_TOKEN;
console.log('>>> FUNCTIONS STARTUP DEVICE_TOKEN =', DEVICE_TOKEN);

// Basic Haversine distance (km)
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Middleware: device auth
app.use((req, res, next) => {
  const incoming = req.header('x-device-token') || '';
  console.log('>>> INCOMING x-device-token header =', JSON.stringify(incoming));
  if (!incoming || incoming !== DEVICE_TOKEN) {
    console.log('>>> TOKEN MISMATCH: expected=', DEVICE_TOKEN, ' got=', incoming);
    return res.status(401).json({ error: 'Unauthorized - invalid device token' });
  }
  next();
});

/**
 * POST /device/telemetry
 * body: { busId, lat, lon, speed?, heading?, timestamp? }
 * Writes to: buses table (last_seen, location), and a log in telemetry table
 */
app.post('/device/telemetry', async (req, res) => {
  try {
    console.log('>>> TELEMETRY REQ BODY =', JSON.stringify(req.body));
    const { busId, lat, lon, speed, heading, timestamp } = req.body;
    if (!busId || typeof lat !== 'number' || typeof lon !== 'number') {
      return res.status(400).json({ error: 'Missing busId or lat/lon' });
    }

    // Use standard Date objects for timestamps
    const ts = timestamp ? new Date(timestamp) : new Date();

    // Update bus record
    const { error: busUpdateError } = await supabase
      .from('buses')
      .update({
        last_seen: ts.toISOString(),
        location: { lat, lon },
        speed: (typeof speed === 'number') ? speed : null,
        heading: heading || null,
      })
      .eq('id', busId);

    if (busUpdateError) {
      console.error('Error updating bus:', busUpdateError);
      // If bus doesn't exist, create it
      const { error: insertError } = await supabase
        .from('buses')
        .insert({
          id: busId,
          last_seen: ts.toISOString(),
          location: { lat, lon },
          speed: (typeof speed === 'number') ? speed : null,
          heading: heading || null,
        });
      if (insertError) {
        console.error('Error inserting bus:', insertError);
        throw insertError;
      }
    }

    // Add telemetry log
    const { error: telemetryError } = await supabase
      .from('telemetry')
      .insert({
        bus_id: busId,
        location: { lat, lon },
        speed: (typeof speed === 'number') ? speed : null,
        heading: heading || null,
        timestamp: ts.toISOString(),
      });

    if (telemetryError) {
      console.error('Error inserting telemetry:', telemetryError);
      throw telemetryError;
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('telemetry error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'internal', details: err.message });
  }
});

/**
 * POST /device/rfid
 * body: { busId, cardId, eventType, lat?, lon?, timestamp? }
 * eventType: 'entry' | 'exit'
 * Basic logic:
 * - on entry: create a trip document (trips) with startTime/location/busId/cardId and mark user/card activeTrip
 * - on exit: find active trip for cardId, set endTime/endLocation, compute distance and fare, create transaction doc
 */
app.post('/device/rfid', async (req, res) => {
  try {
    const { busId, cardId, eventType, lat, lon, timestamp } = req.body;
    if (!busId || !cardId || !eventType) {
      return res.status(400).json({ error: 'Missing busId, cardId or eventType' });
    }
    // Use standard Date object
    const ts = timestamp ? new Date(timestamp) : new Date();

    if (eventType === 'entry') {
      // create trip
      const tripData = {
        bus_id: busId,
        card_id: cardId,
        start_time: ts.toISOString(),
        start_location: (typeof lat === 'number' && typeof lon === 'number')
          ? { lat, lon }
          : null,
        end_time: null,
        end_location: null,
        fare: null,
        status: 'ongoing',
      };

      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert(tripData)
        .select()
        .single();

      if (tripError) throw tripError;

      // set card active_trip pointer
      const { error: cardUpdateError } = await supabase
        .from('cards')
        .update({
          active_trip: trip.id,
          last_seen: ts.toISOString(),
          updated_at: ts.toISOString(),
        })
        .eq('id', cardId);

      if (cardUpdateError) {
        console.error('Error updating card:', cardUpdateError);
        // Card might not exist, create it
        await supabase
          .from('cards')
          .insert({
            id: cardId,
            active_trip: trip.id,
            last_seen: ts.toISOString(),
            created_at: ts.toISOString(),
            updated_at: ts.toISOString(),
          });
      }

      // log event
      await supabase
        .from('rfid_logs')
        .insert({
          bus_id: busId,
          card_id: cardId,
          event_type: 'entry',
          timestamp: ts.toISOString(),
        });

      return res.json({ ok: true, tripId: trip.id });
    }

    if (eventType === 'exit') {
      // find active trip
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('card_id', cardId)
        .eq('status', 'ongoing')
        .order('start_time', { ascending: false })
        .limit(1);

      if (tripsError) throw tripsError;

      if (!trips || trips.length === 0) {
        return res.status(404).json({ error: 'No ongoing trip found for card' });
      }

      const trip = trips[0];

      const endLoc = (typeof lat === 'number' && typeof lon === 'number')
        ? { lat, lon }
        : null;

      // compute distance if startLocation exists
      let distanceKm = null;
      if (trip.start_location && endLoc) {
        // Access coordinates using .lat and .lon (plain object keys)
        distanceKm = haversineKm(
          trip.start_location.lat,
          trip.start_location.lon,
          endLoc.lat,
          endLoc.lon
        );
      }

      // Basic fare logic: base fare + per km
      const baseFare = 10; // currency units
      const perKm = 5; // currency units per km
      let fare = null;
      if (distanceKm !== null) {
        // Round to 2 decimal places
        fare = Math.max(baseFare, Math.round((baseFare + perKm * distanceKm) * 100) / 100);
      } else {
        fare = baseFare;
      }

      // update trip
      const { error: updateError } = await supabase
        .from('trips')
        .update({
          end_time: ts.toISOString(),
          end_location: endLoc ? endLoc : null,
          distance_km: distanceKm,
          fare,
          status: 'finished',
        })
        .eq('id', trip.id);

      if (updateError) throw updateError;

      // clear card active_trip
      await supabase
        .from('cards')
        .update({
          active_trip: null,
          last_seen: ts.toISOString(),
          updated_at: ts.toISOString(),
        })
        .eq('id', cardId);

      // create transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          card_id: cardId,
          trip_id: trip.id,
          amount: fare,
          timestamp: ts.toISOString(),
          bus_id: busId,
          type: 'trip',
        });

      if (txError) throw txError;

      // log rfid
      await supabase
        .from('rfid_logs')
        .insert({
          bus_id: busId,
          card_id: cardId,
          event_type: 'exit',
          timestamp: ts.toISOString(),
        });

      return res.json({ ok: true, tripId: trip.id, fare });
    }

    return res.status(400).json({ error: 'invalid eventType' });
  } catch (err) {
    console.error('rfid error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'internal', details: err.message });
  }
});

// default healthcheck
app.get('/', (req, res) => res.send('SmartBus API OK'));

// Export for use with serverless platforms or Express server
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SmartBus API server running on port ${PORT}`);
  });
}

module.exports = app;
