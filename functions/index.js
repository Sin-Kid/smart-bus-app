const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// GeoPoint is no longer used. We rely on standard JavaScript Date objects for timestamps.
const { FieldValue } = admin.firestore; 

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Device token: prefer functions config, fallback to env var
const DEVICE_TOKEN = (functions.config && functions.config().device && functions.config().device.token) || process.env.DEVICE_TOKEN || 'smart-bus';
console.log('>>> FUNCTIONS STARTUP DEVICE_TOKEN =', DEVICE_TOKEN);

// Basic Haversine distance (km)
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
 * Writes to: /buses/{busId} (lastSeen, location), and a log in /telemetry/{autoid}
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

    const busRef = db.collection('buses').doc(busId);

    console.log('>>> ABOUT TO SET busRef', busId, 'ts=', ts, 'lat/lon=', lat, lon);
    await busRef.set({
      lastSeen: ts,
      // Store location as a plain object { lat, lon }
      location: { lat, lon }, 
      speed: (typeof speed === 'number') ? speed : null,
      heading: heading || null,
    }, { merge: true });
    console.log('>>> busRef.set OK');

    console.log('>>> ABOUT TO ADD telemetry log');
    await db.collection('telemetry').add({
      busId,
      // Store location as a plain object { lat, lon }
      location: { lat, lon },
      speed: (typeof speed === 'number') ? speed : null,
      heading: heading || null,
      timestamp: new Date(),
    });
    console.log('>>> telemetry.add OK');

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
      const tripRef = db.collection('trips').doc();
      const tripData = {
        busId,
        cardId,
        startTime: ts, // Store as Date
        // Store location as a plain object { lat, lon }
        startLocation: (typeof lat === 'number' && typeof lon === 'number') 
          ? { lat, lon }
          : null,
        endTime: null,
        endLocation: null,
        fare: null,
        status: 'ongoing',
      };
      await tripRef.set(tripData);

      // set user/card activeTrip pointer
      const cardRef = db.collection('cards').doc(cardId);
      await cardRef.set({ 
        activeTrip: tripRef.id, 
        lastSeen: new Date() 
      }, { merge: true });

      // log event
      await db.collection('rfidLogs').add({ 
        busId, 
        cardId, 
        eventType: 'entry', 
        timestamp: new Date() 
      });

      return res.json({ ok: true, tripId: tripRef.id });
    }

    if (eventType === 'exit') {
      // find active trip
      const tripsQ = await db.collection('trips')
        .where('cardId', '==', cardId)
        .where('status', '==', 'ongoing')
        .orderBy('startTime', 'desc')
        .limit(1)
        .get();

      if (tripsQ.empty) {
        return res.status(404).json({ error: 'No ongoing trip found for card' });
      }

      const tripDoc = tripsQ.docs[0];
      const trip = tripDoc.data();

      const endLoc = (typeof lat === 'number' && typeof lon === 'number') 
        ? { lat, lon } 
        : null;

      // compute distance if startLocation exists
      let distanceKm = null;
      if (trip.startLocation && endLoc) {
        // Access coordinates using .lat and .lon (plain object keys)
        distanceKm = haversineKm(
          trip.startLocation.lat, 
          trip.startLocation.lon, 
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
      await tripDoc.ref.update({
        endTime: ts, // Store as Date
        // Store end location as the plain object { lat, lon }
        endLocation: endLoc ? endLoc : null,
        distanceKm: distanceKm,
        fare,
        status: 'finished',
      });

      // clear card activeTrip
      const cardRef = db.collection('cards').doc(cardId);
      await cardRef.set({ 
        activeTrip: null, 
        lastSeen: new Date() 
      }, { merge: true });

      // create transaction
      const txRef = db.collection('transactions').doc();
      await txRef.set({
        cardId,
        tripId: tripDoc.id,
        amount: fare,
        timestamp: ts, // Store as Date
        busId,
      });

      // log rfid
      await db.collection('rfidLogs').add({ 
        busId, 
        cardId, 
        eventType: 'exit', 
        timestamp: new Date() 
      });

      return res.json({ ok: true, tripId: tripDoc.id, fare });
    }

    return res.status(400).json({ error: 'invalid eventType' });
  } catch (err) {
    console.error('rfid error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'internal', details: err.message });
  }
});

// default healthcheck
app.get('/', (req, res) => res.send('SmartBus functions OK'));

exports.api = functions.https.onRequest(app);