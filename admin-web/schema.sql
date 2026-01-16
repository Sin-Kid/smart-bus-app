-- =====================================================
-- MASTER SCHEMA & LOGIC SCRIPT
-- =====================================================
-- Run this ENTIRE script in the Supabase SQL Editor.
-- It will set up Tables, Columns, Indexes, and Hardware Logic.
-- =====================================================

-- =====================================================
-- 1. TABLES & COLUMNS
-- =====================================================

-- 1.1 BUSES
CREATE TABLE IF NOT EXISTS buses (
  id TEXT PRIMARY KEY,
  name TEXT,
  location JSONB,
  last_seen TIMESTAMPTZ,
  speed NUMERIC,
  heading NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simulation & Status Columns
ALTER TABLE buses ADD COLUMN IF NOT EXISTS status_message TEXT DEFAULT 'On Time';
ALTER TABLE buses ADD COLUMN IF NOT EXISTS current_stop_id UUID; -- FK reference added later if needed
ALTER TABLE buses ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 40;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS sim_occupied INTEGER DEFAULT 28;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS sim_leaving INTEGER DEFAULT 5;

-- 1.2 BUS ROUTES
CREATE TABLE IF NOT EXISTS bus_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id TEXT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stops JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS destination TEXT;

-- 1.3 BUS STOPS
CREATE TABLE IF NOT EXISTS bus_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id TEXT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lon NUMERIC NOT NULL,
  "order" INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

ALTER TABLE bus_stops ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE bus_stops ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES bus_routes(id) ON DELETE CASCADE;
ALTER TABLE bus_stops ADD COLUMN IF NOT EXISTS arrival_time TEXT; -- Format: HH:MM AM/PM

-- 1.4 BUS SCHEDULES
CREATE TABLE IF NOT EXISTS bus_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id TEXT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  days_of_week TEXT[] DEFAULT ARRAY[]::TEXT[],
  fare NUMERIC DEFAULT 50,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 CARDS
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  name TEXT,
  balance NUMERIC DEFAULT 0,
  total_recharges NUMERIC DEFAULT 0,
  last_recharge NUMERIC,
  last_recharge_date TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_number TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT 'Standard';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS active_trip UUID; -- FK to trips added below

-- 1.6 TRIPS
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id TEXT NOT NULL REFERENCES buses(id),
  card_id TEXT NOT NULL REFERENCES cards(id),
  start_time TIMESTAMPTZ NOT NULL,
  start_location JSONB,
  end_time TIMESTAMPTZ,
  end_location JSONB,
  distance_km NUMERIC,
  fare NUMERIC,
  status TEXT NOT NULL DEFAULT 'ongoing'
);

-- Linking active_trip FK safely
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips') THEN
        BEGIN
            ALTER TABLE cards 
            ADD CONSTRAINT cards_active_trip_fkey 
            FOREIGN KEY (active_trip) REFERENCES trips(id);
        EXCEPTION WHEN duplicate_object THEN
            NULL; 
        END;
    END IF;
END $$;

-- 1.7 TELEMETRY
CREATE TABLE IF NOT EXISTS telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id TEXT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  location JSONB, 
  speed NUMERIC,
  heading NUMERIC,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 1.8 TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
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

-- 1.9 RFID LOGS
CREATE TABLE IF NOT EXISTS rfid_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id TEXT NOT NULL REFERENCES buses(id),
  card_id TEXT NOT NULL REFERENCES cards(id),
  event_type TEXT NOT NULL, -- 'entry' | 'exit'
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES & RLS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_bus_schedules_bus_id ON bus_schedules(bus_id);
CREATE INDEX IF NOT EXISTS idx_bus_schedules_route_id ON bus_schedules(route_id);
CREATE INDEX IF NOT EXISTS idx_cards_card_number ON cards(card_number);
CREATE INDEX IF NOT EXISTS idx_telemetry_bus_id ON telemetry(bus_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rfid_logs_card_id ON rfid_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_rfid_logs_timestamp ON rfid_logs(timestamp DESC);

-- Disable RLS for development
ALTER TABLE buses DISABLE ROW LEVEL SECURITY;
ALTER TABLE bus_stops DISABLE ROW LEVEL SECURITY;
ALTER TABLE bus_routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE bus_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE rfid_logs DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. HARDWARE LOGIC (RPC FUNCTIONS)
-- =====================================================

-- 3.1 HANDLE BUS ENTRY
CREATE OR REPLACE FUNCTION handle_bus_entry(
    p_card_uid TEXT,
    p_bus_id TEXT,
    p_lat NUMERIC DEFAULT 0,
    p_lon NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_card_record RECORD;
    v_trip_id UUID;
BEGIN
    -- Match by ID or Card Number
    SELECT * INTO v_card_record FROM cards WHERE id = p_card_uid OR card_number = p_card_uid LIMIT 1;

    IF v_card_record.id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Card not registered');
    END IF;

    -- Check Balance (Min ₹20)
    IF v_card_record.balance < 20 THEN
         RETURN jsonb_build_object('status', 'error', 'message', 'Insufficient Balance', 'balance', v_card_record.balance);
    END IF;

    -- Start Trip
    INSERT INTO trips (bus_id, card_id, start_time, start_location, status, fare)
    VALUES (p_bus_id, v_card_record.id, NOW(), jsonb_build_object('lat', p_lat, 'lon', p_lon), 'ongoing', 0)
    RETURNING id INTO v_trip_id;

    -- Update Card Active Trip
    UPDATE cards SET active_trip = v_trip_id, last_seen = NOW() WHERE id = v_card_record.id;

    -- Log
    INSERT INTO rfid_logs (bus_id, card_id, event_type) VALUES (p_bus_id, v_card_record.id, 'entry');

    RETURN jsonb_build_object('status', 'success', 'message', 'Welcome Aboard', 'balance', v_card_record.balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3.2 HANDLE BUS EXIT
CREATE OR REPLACE FUNCTION handle_bus_exit(
    p_card_uid TEXT,
    p_bus_id TEXT,
    p_lat NUMERIC DEFAULT 0,
    p_lon NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_card_record RECORD;
    v_trip_record RECORD;
    v_fare NUMERIC := 50; -- Base Fare
    v_new_balance NUMERIC;
BEGIN
    SELECT * INTO v_card_record FROM cards WHERE id = p_card_uid OR card_number = p_card_uid LIMIT 1;
    
    IF v_card_record.id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Card not registered');
    END IF;

    IF v_card_record.active_trip IS NULL THEN
         RETURN jsonb_build_object('status', 'error', 'message', 'No active trip found');
    END IF;

    SELECT * INTO v_trip_record FROM trips WHERE id = v_card_record.active_trip;

    -- Fixed Fare: ₹50
    v_fare := 50;

    -- Deduct Balance
    v_new_balance := v_card_record.balance - v_fare;
    
    UPDATE cards 
    SET balance = v_new_balance, 
        active_trip = NULL, 
        last_seen = NOW() 
    WHERE id = v_card_record.id;

    -- End Trip
    UPDATE trips 
    SET end_time = NOW(), 
        end_location = jsonb_build_object('lat', p_lat, 'lon', p_lon),
        status = 'completed',
        fare = v_fare
    WHERE id = v_trip_record.id;

    -- Record Transaction
    INSERT INTO transactions (card_id, trip_id, bus_id, type, amount, status, payment_method)
    VALUES (v_card_record.id, v_trip_record.id, p_bus_id, 'trip', v_fare, 'completed', 'wallet');

    -- Log
    INSERT INTO rfid_logs (bus_id, card_id, event_type) VALUES (p_bus_id, v_card_record.id, 'exit');

    RETURN jsonb_build_object('status', 'success', 'message', 'Trip Completed', 'deducted', v_fare, 'balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3.3 HANDLE TELEMETRY
CREATE OR REPLACE FUNCTION handle_telemetry(
    p_bus_id TEXT,
    p_lat NUMERIC,
    p_lon NUMERIC,
    p_speed NUMERIC
)
RETURNS JSONB AS $$
BEGIN
    -- Log
    INSERT INTO telemetry (bus_id, location, speed) 
    VALUES (p_bus_id, jsonb_build_object('lat', p_lat, 'lon', p_lon), p_speed);

    -- Update Live State
    UPDATE buses 
    SET location = jsonb_build_object('lat', p_lat, 'lon', p_lon),
        speed = p_speed,
        last_seen = NOW()
    WHERE id = p_bus_id;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3.4 GET BUS OCCUPANCY (Prediction)
CREATE OR REPLACE FUNCTION get_bus_occupancy(p_bus_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_capacity INTEGER;
    v_occupied INTEGER;
    v_percent INTEGER;
    v_leaving INTEGER;
BEGIN
    -- Get Capacity
    SELECT capacity INTO v_capacity FROM buses WHERE id = p_bus_id;
    IF v_capacity IS NULL THEN v_capacity := 40; END IF;

    -- SIMULATION MODE: If no real active trips, generate fake data for demo
    -- PRIORITY 1: Use Manual Simulation Values from Admin Panel if set
    -- PRIORITY 2: Use Constant fallback if inputs are empty/null (handled by defaults)
    
    SELECT sim_occupied, sim_leaving INTO v_occupied, v_leaving FROM buses WHERE id = p_bus_id;

    -- If real trips exist, they override the manual occupancy (optional, but logical)
    -- But user wants "constant", so let's check if real trips > 0 first.
    DECLARE 
        v_real_occupied INTEGER;
    BEGIN
        SELECT count(*) INTO v_real_occupied FROM trips WHERE bus_id = p_bus_id AND status = 'ongoing';
        
        IF v_real_occupied > 0 THEN
             v_occupied := v_real_occupied;
             -- For leaving, we still might want simulation as we can't know real future exits easily
             -- so we keep v_leaving from the SELECT above (or default)
        ELSE
             -- Use the fetched sim values. If null, fallback to constants
             IF v_occupied IS NULL THEN v_occupied := 28; END IF;
             IF v_leaving IS NULL THEN v_leaving := 5; END IF;
        END IF;
    END;
    
    -- Calculate %
    v_percent := (v_occupied::FLOAT / v_capacity::FLOAT) * 100;
    
    -- Bound checks
    IF v_leaving > v_occupied THEN v_leaving := v_occupied; END IF;

    RETURN jsonb_build_object(
        'occupied', v_occupied,
        'capacity', v_capacity,
        'percent', v_percent,
        'leaving_next_stop', v_leaving
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. SEED DATA / OPTIONAL SETUP
-- ==========================================

-- Link 'admin@gmail.com' to Physical Card '596B7E05' (If User Exists)
DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT := 'admin@gmail.com';
    v_hardcoded_id TEXT := '596B7E05';
BEGIN
    -- 1. Find the User UUID from Supabase Auth
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found User: % (ID: %)', v_email, v_user_id;

        -- 2. Create the New Card Record for the User (if not exists)
        INSERT INTO public.cards (id, name, card_number, balance, status, created_at)
        VALUES (v_user_id::TEXT, 'Admin User', 'TEMP_' || v_hardcoded_id, 1000.00, 'active', NOW())
        ON CONFLICT (id) DO NOTHING;

        -- 3. Migrate History from Old ID to New ID
        IF EXISTS (SELECT 1 FROM public.cards WHERE id = v_hardcoded_id) THEN
            RAISE NOTICE 'Migrating history from % to %', v_hardcoded_id, v_user_id;

            UPDATE public.trips SET card_id = v_user_id::TEXT WHERE card_id = v_hardcoded_id;
            UPDATE public.transactions SET card_id = v_user_id::TEXT WHERE card_id = v_hardcoded_id;
            
            BEGIN
                UPDATE public.rfid_logs SET card_id = v_user_id::TEXT WHERE card_id = v_hardcoded_id;
            EXCEPTION WHEN OTHERS THEN NULL; END;

            -- 4. Delete old record
            DELETE FROM public.cards WHERE id = v_hardcoded_id;
        END IF;

        -- 5. Finalize: Set correct Physical Card Number
        UPDATE public.cards
        SET card_number = v_hardcoded_id,
            name = 'Admin User',
            status = 'active'
        WHERE id = v_user_id::TEXT;

        RAISE NOTICE 'SUCCESS: Linked Physical Card % to User %', v_hardcoded_id, v_email;
    ELSE
         RAISE NOTICE 'User % not found. Skipping auto-link.', v_email;
    END IF;
END $$;
