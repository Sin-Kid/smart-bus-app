-- =====================================================
-- DYNAMIC DISTANCE-BASED FARE CALCULATION LOGIC
-- =====================================================
-- Run this script in your Supabase SQL Editor.
-- It updates `handle_bus_exit` to calculate distance between
-- the start location (from tap-on) and end location (from tap-off)
-- using the Haversine formula, and applies a dynamic fare structure.
-- =====================================================

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
    v_start_lat NUMERIC;
    v_start_lon NUMERIC;
    v_distance_km NUMERIC := 0;
    v_cos_val NUMERIC;
    v_fare NUMERIC := 10; -- Base fare (up to 2km)
    v_new_balance NUMERIC;
    v_end_stop_name TEXT;
BEGIN
    -- 1. Fetch Card Record
    SELECT * INTO v_card_record 
    FROM cards 
    WHERE id = p_card_uid OR card_number = p_card_uid 
    LIMIT 1;
    
    IF v_card_record.id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Card not registered');
    END IF;

    -- 2. Verify Active Trip
    IF v_card_record.active_trip IS NULL THEN
         RETURN jsonb_build_object('status', 'error', 'message', 'No active trip found');
    END IF;

    -- 3. Fetch Trip Record
    SELECT * INTO v_trip_record 
    FROM trips 
    WHERE id = v_card_record.active_trip;

    -- Extract Tap-On GPS Coordinates
    v_start_lat := (v_trip_record.start_location->>'lat')::NUMERIC;
    v_start_lon := (v_trip_record.start_location->>'lon')::NUMERIC;

    -- 4. Calculate Distance Covered using Haversine Formula
    IF (p_lat = 0 OR p_lon = 0 OR v_start_lat = 0 OR v_start_lon = 0 OR v_start_lat IS NULL OR v_start_lon IS NULL) THEN
        -- Fallback to a base distance of 2.0 km if GPS coordinates are missing or invalid
        v_distance_km := 2.0;
    ELSE
        -- Haversine formula calculation
        v_cos_val := cos(radians(v_start_lat)) * cos(radians(p_lat)) *
                     cos(radians(p_lon) - radians(v_start_lon)) +
                     sin(radians(v_start_lat)) * sin(radians(p_lat));
                     
        -- Bound check to prevent NaN in acos
        IF v_cos_val > 1.0 THEN v_cos_val := 1.0; END IF;
        IF v_cos_val < -1.0 THEN v_cos_val := -1.0; END IF;
        
        v_distance_km := 6371.0 * acos(v_cos_val);
    END IF;

    -- 5. Calculate Fare (Base ₹10 for <= 2.0 km, then ₹5 per additional km)
    IF v_distance_km <= 2.0 THEN
        v_fare := 10.0;
    ELSE
        v_fare := 10.0 + round((v_distance_km - 2.0) * 5.0);
    END IF;

    -- 6. Resolve Stop Name (for simulation/route naming)
    v_end_stop_name := resolve_stop_name(p_bus_id, p_lat, p_lon);

    -- 7. Deduct Balance from Card
    v_new_balance := v_card_record.balance - v_fare;
    
    UPDATE cards 
    SET balance = v_new_balance, 
        active_trip = NULL, 
        last_seen = NOW() 
    WHERE id = v_card_record.id;

    -- 8. End Trip in Database (Save time, end location, stop, distance, and fare)
    UPDATE trips 
    SET end_time = NOW(), 
        end_location = jsonb_build_object('lat', p_lat, 'lon', p_lon),
        end_stop_name = v_end_stop_name,
        status = 'completed',
        fare = v_fare,
        distance_km = round(v_distance_km, 3)
    WHERE id = v_trip_record.id;

    -- 9. Record Transaction Log
    INSERT INTO transactions (card_id, trip_id, bus_id, type, amount, status, payment_method)
    VALUES (v_card_record.id, v_trip_record.id, p_bus_id, 'trip', v_fare, 'completed', 'wallet');

    -- 10. Log RFID Event
    INSERT INTO rfid_logs (bus_id, card_id, event_type) 
    VALUES (p_bus_id, v_card_record.id, 'exit');

    -- 11. Synchronize Dashboard Simulation Occupancy (-1)
    UPDATE buses 
    SET sim_occupied = GREATEST(COALESCE(sim_occupied, 0) - 1, 0),
        last_seen = NOW()
    WHERE id = p_bus_id;

    -- 12. Return Success Payload with detailed metrics
    RETURN jsonb_build_object(
        'status', 'success', 
        'message', 'Trip Completed', 
        'distance_km', round(v_distance_km, 2),
        'deducted', v_fare, 
        'balance', v_new_balance,
        'destination', COALESCE(v_end_stop_name, 'GPS Location')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
