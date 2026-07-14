-- =====================================================
-- UPDATE ALL BUSES TO CAPACITY 52
-- Run this in Supabase SQL Editor to update live data
-- =====================================================

-- 1. Update ALL existing buses to capacity 52
UPDATE buses
SET capacity = 52,
    updated_at = NOW();

-- 2. Update sample seed buses with proportional sim_occupied
UPDATE buses SET capacity = 52, sim_occupied = 36, sim_leaving = 6 WHERE id = 'BUS101';
UPDATE buses SET capacity = 52, sim_occupied = 20, sim_leaving = 4 WHERE id = 'BUS102';
UPDATE buses SET capacity = 52, sim_occupied = 42, sim_leaving = 8 WHERE id = 'BUS103';

-- 3. For ANY OTHER buses (KBS-3C Express etc.) — keep their sim_occupied as-is,
--    only update capacity to 52 (already done by step 1 above).
--    If sim_occupied > 52, cap it:
UPDATE buses
SET sim_occupied = LEAST(sim_occupied, 52)
WHERE sim_occupied > 52;

-- 4. Update the get_bus_occupancy RPC function default fallback
CREATE OR REPLACE FUNCTION get_bus_occupancy(p_bus_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_capacity INTEGER;
    v_occupied INTEGER;
    v_percent INTEGER;
    v_leaving INTEGER;
BEGIN
    SELECT capacity INTO v_capacity FROM buses WHERE id = p_bus_id;
    IF v_capacity IS NULL THEN v_capacity := 52; END IF;

    SELECT sim_occupied, sim_leaving INTO v_occupied, v_leaving FROM buses WHERE id = p_bus_id;

    IF v_occupied IS NULL THEN v_occupied := 36; END IF;
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

-- 5. Verify
SELECT id, name, capacity, sim_occupied, sim_leaving,
       ROUND((sim_occupied::FLOAT / capacity::FLOAT) * 100) AS occupancy_pct
FROM buses
ORDER BY name;
