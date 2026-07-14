-- =====================================================
-- UPDATE ALL BUSES TO CAPACITY 67 (52 Seats + 15 Standing)
-- AND INCREMENT SIMULATED OCCUPANCY BY +15 PASSENGERS
-- Run this in Supabase SQL Editor to update live data
-- =====================================================

-- 1. Update ALL existing buses to capacity 67 and add 15 standing passengers
UPDATE buses
SET capacity = 67,
    sim_occupied = LEAST(COALESCE(sim_occupied, 0) + 15, 67),
    updated_at = NOW();

-- 2. Update default column value for future insertions
ALTER TABLE buses ALTER COLUMN capacity SET DEFAULT 67;

-- 3. Update the get_bus_occupancy RPC function default fallback to 67
CREATE OR REPLACE FUNCTION get_bus_occupancy(p_bus_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_capacity INTEGER;
    v_occupied INTEGER;
    v_percent INTEGER;
    v_leaving INTEGER;
BEGIN
    SELECT capacity INTO v_capacity FROM buses WHERE id = p_bus_id;
    IF v_capacity IS NULL THEN v_capacity := 67; END IF;

    SELECT sim_occupied, sim_leaving INTO v_occupied, v_leaving FROM buses WHERE id = p_bus_id;

    IF v_occupied IS NULL THEN v_occupied := 43; END IF; -- 28 + 15
    IF v_leaving IS NULL THEN v_leaving := 5; END IF;

    v_percent := (v_occupied::FLOAT / v_capacity::FLOAT) * 100;
    
    IF v_leaving > v_occupied THEN v_leaving := v_occupied; END IF;

    RETURN jsonb_build_object(
        'occupied', v_occupied,
        'capacity', v_capacity,
        'percent', v_percent,
        'leaving_next_stop', v_leaving
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Verify
SELECT id, name, capacity, sim_occupied, sim_leaving,
       ROUND((sim_occupied::FLOAT / capacity::FLOAT) * 100) AS occupancy_pct
FROM buses
ORDER BY name;
