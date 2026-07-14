-- =====================================================
-- SEED DATA FOR SMART BUS SYSTEM
-- =====================================================
-- Run this after schema.sql to populate sample data
-- =====================================================

-- =====================================================
-- 1. SAMPLE BUSES
-- =====================================================

INSERT INTO buses (id, name, location, speed, heading, status_message, capacity, sim_occupied, sim_leaving, current_location_name)
VALUES 
    ('BUS101', 'Bus 101', '{"lat": 12.9716, "lon": 77.5946}', 0, 0, 'On Time', 67, 51, 6, 'KSR Bengaluru'),
    ('BUS102', 'Bus 102', '{"lat": 12.9716, "lon": 77.5946}', 0, 0, 'On Time', 67, 35, 4, 'Vijayanagar'),
    ('BUS103', 'Bus 103', '{"lat": 12.9716, "lon": 77.5946}', 0, 0, 'On Time', 67, 57, 8, 'RR Nagar')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    capacity = EXCLUDED.capacity,
    sim_occupied = EXCLUDED.sim_occupied,
    sim_leaving = EXCLUDED.sim_leaving,
    current_location_name = EXCLUDED.current_location_name;

-- =====================================================
-- 2. SAMPLE ROUTES
-- =====================================================

INSERT INTO bus_routes (id, bus_id, name, source, destination, stops)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'BUS101', 'WEST DOWN', 'KSR Bengaluru', 'Vijayanagar', 
     '["KSR Bengaluru", "Jhananbharati", "Pattangere", "Kengeri", "Challaghatta", "RR Nagar", "Nagarbhavi", "Ullal", "Attiguppe", "Vijayanagar"]'::jsonb),
    ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'BUS102', 'WEST DOWN', 'KSR Bengaluru', 'Vijayanagar',
     '["KSR Bengaluru", "Jhananbharati", "Pattangere", "Kengeri", "Challaghatta", "RR Nagar", "Nagarbhavi", "Ullal", "Attiguppe", "Vijayanagar"]'::jsonb),
    ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'BUS103', 'WEST UP', 'Vijayanagar', 'KSR Bengaluru',
     '["Vijayanagar", "Attiguppe", "Ullal", "Nagarbhavi", "RR Nagar", "Challaghatta", "Kengeri", "Pattangere", "Jhananbharati", "KSR Bengaluru"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    destination = EXCLUDED.destination,
    stops = EXCLUDED.stops;

-- =====================================================
-- 3. SAMPLE BUS STOPS (WEST DOWN ROUTE)
-- =====================================================

INSERT INTO bus_stops (id, bus_id, route_id, name, code, lat, lon, "order", arrival_time, price)
VALUES 
    ('650e8400-e29b-41d4-a716-446655440001'::uuid, 'BUS101', '550e8400-e29b-41d4-a716-446655440001'::uuid, 'KSR Bengaluru', 'KSR', 12.9716, 77.5946, 1, '06:00 AM', 0),
    ('650e8400-e29b-41d4-a716-446655440002'::uuid, 'BUS101', '550e8400-e29b-41d4-a716-446655440001'::uuid, 'Jhananbharati', 'JNB', 12.9650, 77.5850, 2, '06:10 AM', 10),
    ('650e8400-e29b-41d4-a716-446655440003'::uuid, 'BUS101', '550e8400-e29b-41d4-a716-446655440001'::uuid, 'Pattangere', 'PTG', 12.9600, 77.5750, 3, '06:20 AM', 10),
    ('650e8400-e29b-41d4-a716-446655440004'::uuid, 'BUS101', '550e8400-e29b-41d4-a716-446655440001'::uuid, 'Kengeri', 'KNG', 12.9550, 77.5650, 4, '06:30 AM', 10),
    ('650e8400-e29b-41d4-a716-446655440005'::uuid, 'BUS101', '550e8400-e29b-41d4-a716-446655440001'::uuid, 'Challaghatta', 'CHL', 12.9500, 77.5550, 5, '06:40 AM', 10),
    ('650e8400-e29b-41d4-a716-446655440006'::uuid, 'BUS101', '550e8400-e29b-41d4-a716-446655440001'::uuid, 'RR Nagar', 'RRN', 12.9450, 77.5450, 6, '06:50 AM', 10),
    ('650e8400-e29b-41d4-a716-446655440007'::uuid, 'BUS101', '550e8400-e29b-41d4-a716-446655440001'::uuid, 'Nagarbhavi', 'NGB', 12.9400, 77.5350, 7, '07:00 AM', 10),
    ('650e8400-e29b-41d4-a716-446655440008'::uuid, 'BUS101', '550e8400-e29b-41d4-a716-446655440001'::uuid, 'Ullal', 'ULL', 12.9350, 77.5250, 8, '07:10 AM', 10),
    ('650e8400-e29b-41d4-a716-446655440009'::uuid, 'BUS101', '550e8400-e29b-41d4-a716-446655440001'::uuid, 'Attiguppe', 'ATG', 12.9300, 77.5150, 9, '07:20 AM', 10),
    ('650e8400-e29b-41d4-a716-446655440010'::uuid, 'BUS101', '550e8400-e29b-41d4-a716-446655440001'::uuid, 'Vijayanagar', 'VJN', 12.9250, 77.5050, 10, '07:30 AM', 10)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    arrival_time = EXCLUDED.arrival_time,
    price = EXCLUDED.price;

-- =====================================================
-- 4. SAMPLE CARDS
-- =====================================================

INSERT INTO cards (id, name, card_number, balance, card_type, status)
VALUES 
    ('CARD001', 'Test User 1', '596B7E05', 1000.00, 'Standard', 'active'),
    ('CARD002', 'Test User 2', 'A1B2C3D4', 500.00, 'Standard', 'active'),
    ('CARD003', 'Test User 3', 'E5F6G7H8', 750.00, 'Student', 'active'),
    ('CARD004', 'Test User 4', 'I9J0K1L2', 250.00, 'Senior', 'active')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    card_number = EXCLUDED.card_number,
    balance = EXCLUDED.balance,
    card_type = EXCLUDED.card_type,
    status = EXCLUDED.status;

-- =====================================================
-- 5. SAMPLE SCHEDULES
-- =====================================================

INSERT INTO bus_schedules (id, bus_id, route_id, departure_time, arrival_time, days_of_week, fare, status)
VALUES 
    ('750e8400-e29b-41d4-a716-446655440001'::uuid, 'BUS101', '550e8400-e29b-41d4-a716-446655440001'::uuid, '06:00', '07:30', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], 50, 'active'),
    ('750e8400-e29b-41d4-a716-446655440002'::uuid, 'BUS102', '550e8400-e29b-41d4-a716-446655440002'::uuid, '06:30', '08:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], 50, 'active'),
    ('750e8400-e29b-41d4-a716-446655440003'::uuid, 'BUS103', '550e8400-e29b-41d4-a716-446655440003'::uuid, '07:00', '08:30', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], 50, 'active')
ON CONFLICT (id) DO UPDATE SET
    departure_time = EXCLUDED.departure_time,
    arrival_time = EXCLUDED.arrival_time,
    days_of_week = EXCLUDED.days_of_week,
    fare = EXCLUDED.fare,
    status = EXCLUDED.status;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check inserted data
SELECT 'Buses' as table_name, COUNT(*) as count FROM buses
UNION ALL
SELECT 'Routes', COUNT(*) FROM bus_routes
UNION ALL
SELECT 'Stops', COUNT(*) FROM bus_stops
UNION ALL
SELECT 'Cards', COUNT(*) FROM cards
UNION ALL
SELECT 'Schedules', COUNT(*) FROM bus_schedules;

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- This seed data provides:
-- - 3 sample buses (BUS101, BUS102, BUS103)
-- - 3 routes (2 WEST DOWN, 1 WEST UP)
-- - 10 stops for WEST DOWN route
-- - 4 sample RFID cards with balances
-- - 3 sample schedules
--
-- All data uses ON CONFLICT DO UPDATE to allow re-running
-- without errors or duplicates.
--
-- =====================================================
