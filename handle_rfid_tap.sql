-- =====================================================
-- UNIFIED SINGLE RFID TAP-ON / TAP-OFF LOGIC
-- =====================================================
-- Run this script in your Supabase SQL Editor.
-- It creates a unified RPC function `handle_rfid_tap` that:
--   1. Checks if the card has an ongoing trip (active_trip is NOT NULL).
--   2. If ongoing, calls `handle_bus_exit(...)`.
--   3. If not ongoing, calls `handle_bus_entry(...)`.
-- =====================================================

CREATE OR REPLACE FUNCTION handle_rfid_tap(
    p_card_uid TEXT,
    p_bus_id TEXT,
    p_lat NUMERIC DEFAULT 0,
    p_lon NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_card_record RECORD;
BEGIN
    -- Match by ID or Card Number
    SELECT * INTO v_card_record 
    FROM cards 
    WHERE id = p_card_uid OR card_number = p_card_uid 
    LIMIT 1;

    IF v_card_record.id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Card not registered');
    END IF;

    -- Route based on the active trip status
    IF v_card_record.active_trip IS NOT NULL THEN
        -- Passenger is already on the bus, process exit/tap-off
        RETURN handle_bus_exit(p_card_uid, p_bus_id, p_lat, p_lon);
    ELSE
        -- Passenger is not on a trip, process entry/tap-on
        RETURN handle_bus_entry(p_card_uid, p_bus_id, p_lat, p_lon);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
