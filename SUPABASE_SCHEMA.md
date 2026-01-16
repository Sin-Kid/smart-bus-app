# Supabase Database Schema

This document describes the database schema needed for the Smart Bus application after migrating from Firebase/Firestore to Supabase.

## Tables

### `buses`
Stores bus information.

```sql
CREATE TABLE buses (
  id TEXT PRIMARY KEY,
  name TEXT,
  location JSONB, -- {lat: number, lon: number}
  last_seen TIMESTAMPTZ,
  speed NUMERIC,
  heading NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `bus_stops`
Stores bus stops associated with each bus.

```sql
CREATE TABLE bus_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id TEXT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lon NUMERIC NOT NULL,
  "order" INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX idx_bus_stops_bus_id ON bus_stops(bus_id);
CREATE INDEX idx_bus_stops_order ON bus_stops(bus_id, "order");
```

### `bus_routes`
Stores routes for buses.

```sql
CREATE TABLE bus_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id TEXT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stops JSONB, -- Array of stop objects: [{id, name, lat, lon, order}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bus_routes_bus_id ON bus_routes(bus_id);
```

### `telemetry`
Stores telemetry data from buses.

```sql
CREATE TABLE telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id TEXT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  location JSONB, -- {lat: number, lon: number}
  speed NUMERIC,
  heading NUMERIC,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_telemetry_bus_id ON telemetry(bus_id);
CREATE INDEX idx_telemetry_timestamp ON telemetry(timestamp DESC);
```

### `cards`
Stores card information for users.

```sql
CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  name TEXT,
  balance NUMERIC DEFAULT 0,
  total_recharges NUMERIC DEFAULT 0,
  last_recharge NUMERIC,
  last_recharge_date TIMESTAMPTZ,
  active_trip UUID REFERENCES trips(id),
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `trips`
Stores trip records.

```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id TEXT NOT NULL REFERENCES buses(id),
  card_id TEXT NOT NULL REFERENCES cards(id),
  start_time TIMESTAMPTZ NOT NULL,
  start_location JSONB, -- {lat: number, lon: number}
  end_time TIMESTAMPTZ,
  end_location JSONB, -- {lat: number, lon: number}
  distance_km NUMERIC,
  fare NUMERIC,
  status TEXT NOT NULL DEFAULT 'ongoing' -- 'ongoing' | 'finished'
);

CREATE INDEX idx_trips_card_id ON trips(card_id);
CREATE INDEX idx_trips_status ON trips(card_id, status);
```

### `transactions`
Stores transaction records (both trips and recharges).

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id TEXT NOT NULL REFERENCES cards(id),
  trip_id UUID REFERENCES trips(id),
  bus_id TEXT REFERENCES buses(id),
  type TEXT NOT NULL, -- 'trip' | 'recharge'
  amount NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'completed',
  payment_method TEXT
);

CREATE INDEX idx_transactions_card_id ON transactions(card_id);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp DESC);
```

### `rfid_logs`
Stores RFID event logs.

```sql
CREATE TABLE rfid_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id TEXT NOT NULL REFERENCES buses(id),
  card_id TEXT NOT NULL REFERENCES cards(id),
  event_type TEXT NOT NULL, -- 'entry' | 'exit'
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rfid_logs_card_id ON rfid_logs(card_id);
CREATE INDEX idx_rfid_logs_timestamp ON rfid_logs(timestamp DESC);
```

## Row Level Security (RLS)

You may want to enable RLS policies depending on your security requirements. For now, you can disable RLS during development:

```sql
ALTER TABLE buses DISABLE ROW LEVEL SECURITY;
ALTER TABLE bus_stops DISABLE ROW LEVEL SECURITY;
ALTER TABLE bus_routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry DISABLE ROW LEVEL SECURITY;
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE rfid_logs DISABLE ROW LEVEL SECURITY;
```

## Environment Variables

Set these environment variables:

**Admin Web App:** done
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

**User App (Expo):**  done
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

**Backend API (functions):**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for backend)
- `DEVICE_TOKEN` - Device authentication token (default: 'smart-bus')
- `PORT` - Server port (default: 3000)

