# Database Setup Guide

This guide will help you set up all the required database tables in your Supabase project.

## Quick Setup (Recommended)

1. **Open Supabase SQL Editor**
   - Go to your [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Navigate to **SQL Editor** in the left sidebar

2. **Run the Complete Setup Script**
   - Open the file `COMPLETE_DATABASE_SETUP.sql` in this directory
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

3. **Verify Tables Created**
   - Go to **Table Editor** in Supabase
   - You should see these tables:
     - ✅ `buses`
     - ✅ `bus_stops`
     - ✅ `bus_routes`
     - ✅ `bus_schedules` (new)
     - ✅ `telemetry`
     - ✅ `cards`
     - ✅ `trips`
     - ✅ `transactions`
     - ✅ `rfid_logs`

## Tables Required for Admin Web

The admin web application requires the following tables:

### Core Tables (Required)
1. **`buses`** - Stores bus information
2. **`bus_stops`** - Stores bus stop locations
3. **`bus_routes`** - Stores route definitions
4. **`bus_schedules`** - Stores schedule information (NEW - for scheduling feature)

### Supporting Tables (Optional but Recommended)
5. **`telemetry`** - Stores real-time bus location data
6. **`cards`** - Stores user card information
7. **`trips`** - Stores trip records
8. **`transactions`** - Stores transaction history
9. **`rfid_logs`** - Stores RFID event logs

## Manual Setup (Step by Step)

If you prefer to create tables one by one, follow this order:

### Step 1: Create Core Tables
Run these in order (they have dependencies):

```sql
-- 1. buses (no dependencies)
CREATE TABLE buses (...);

-- 2. bus_stops (depends on buses)
CREATE TABLE bus_stops (...);

-- 3. bus_routes (depends on buses)
CREATE TABLE bus_routes (...);

-- 4. bus_schedules (depends on buses and bus_routes)
CREATE TABLE bus_schedules (...);
```

### Step 2: Create Supporting Tables
These can be created in any order:

```sql
-- telemetry (depends on buses)
CREATE TABLE telemetry (...);

-- cards (no dependencies)
CREATE TABLE cards (...);

-- trips (depends on buses and cards)
CREATE TABLE trips (...);

-- transactions (depends on cards, trips, buses)
CREATE TABLE transactions (...);

-- rfid_logs (depends on buses and cards)
CREATE TABLE rfid_logs (...);
```

## What Each Table Does

### `buses`
- **Purpose**: Stores bus fleet information
- **Used by**: All admin features
- **Key Fields**: `id`, `name`, `location`, `last_seen`

### `bus_stops`
- **Purpose**: Stores bus stop locations
- **Used by**: Stops management, Route creation
- **Key Fields**: `id`, `bus_id`, `name`, `code`, `lat`, `lon`, `order`

### `bus_routes`
- **Purpose**: Stores route definitions with stop sequences
- **Used by**: Routes management, Route search
- **Key Fields**: `id`, `bus_id`, `name`, `stops` (JSONB array)

### `bus_schedules` ⭐ NEW
- **Purpose**: Stores schedule information (departure/arrival times, days, fare)
- **Used by**: Schedule management feature
- **Key Fields**: `id`, `bus_id`, `route_id`, `departure_time`, `arrival_time`, `days_of_week`, `fare`

### `telemetry`
- **Purpose**: Stores real-time bus location updates
- **Used by**: Logs viewer, Real-time tracking
- **Key Fields**: `id`, `bus_id`, `location`, `timestamp`

### `cards`
- **Purpose**: Stores user card information
- **Used by**: User app features
- **Key Fields**: `id`, `name`, `balance`, `active_trip`

### `trips`
- **Purpose**: Stores trip records
- **Used by**: Trip tracking, Fare calculation
- **Key Fields**: `id`, `bus_id`, `card_id`, `start_time`, `end_time`, `fare`

### `transactions`
- **Purpose**: Stores all transactions (trips and recharges)
- **Used by**: Transaction history
- **Key Fields**: `id`, `card_id`, `type`, `amount`, `timestamp`

### `rfid_logs`
- **Purpose**: Stores RFID entry/exit events
- **Used by**: Event logging
- **Key Fields**: `id`, `bus_id`, `card_id`, `event_type`, `timestamp`

## Row Level Security (RLS)

For development, RLS is typically disabled. For production, you should:

1. **Enable RLS** on all tables
2. **Create policies** based on your security requirements
3. **Test thoroughly** before deploying

To disable RLS for development (run after creating tables):
```sql
ALTER TABLE buses DISABLE ROW LEVEL SECURITY;
ALTER TABLE bus_stops DISABLE ROW LEVEL SECURITY;
ALTER TABLE bus_routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE bus_schedules DISABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)
```

## Verification Checklist

After running the setup script, verify:

- [ ] All 9 tables are created
- [ ] Indexes are created (check in Table Editor → Indexes)
- [ ] Foreign key constraints are set up correctly
- [ ] RLS is configured (disabled for dev, enabled for prod)
- [ ] Connection status shows "Connected" in admin web
- [ ] Can create a test bus record
- [ ] Can create a test stop record
- [ ] Can create a test route record
- [ ] Can create a test schedule record

## Troubleshooting

### Error: "relation does not exist"
- **Cause**: Tables not created yet
- **Solution**: Run `COMPLETE_DATABASE_SETUP.sql`

### Error: "foreign key constraint fails"
- **Cause**: Trying to create dependent table before parent
- **Solution**: Run tables in order (buses → bus_stops/bus_routes → bus_schedules)

### Error: "column does not exist" (e.g., column "code" does not exist)
- **Cause**: Table exists but missing a column (common if table was created before)
- **Solution**: 
  1. Run `FIX_EXISTING_TABLES.sql` to add missing columns
  2. OR run `MIGRATION_ADD_CODE_COLUMN.sql` for just the code column
  3. The updated `COMPLETE_DATABASE_SETUP.sql` now handles this automatically

### Tables exist but admin web shows "Disconnected"
- **Cause**: Connection credentials issue
- **Solution**: Check `.env` file and Supabase credentials

## Next Steps

After setting up the database:

1. ✅ Verify connection in admin web Dashboard
2. ✅ Create your first bus: Go to Routes → Select/Create Bus
3. ✅ Add stops: Go to Stops → Add stops for your bus
4. ✅ Create routes: Go to Routes → Create route with stops
5. ✅ Add schedules: Go to Routes → Select route → Schedule tab

## Files Reference

- **`COMPLETE_DATABASE_SETUP.sql`** - Complete setup script (run this!)
- **`SUPABASE_SCHEMA.md`** - Detailed schema documentation (in project root)
- **`BUS_SCHEDULES_TABLE.sql`** - Just the schedules table (if you only need that)

## Support

If you encounter issues:
1. Check browser console for detailed errors
2. Verify Supabase project is active
3. Check that all tables exist in Table Editor
4. Review Supabase logs in Dashboard

