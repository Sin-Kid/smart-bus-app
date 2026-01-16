# Admin Web - Setup Guide

## Supabase Connection Setup

### 1. Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** -> **API**
4. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 2. Configure Environment Variables

Create a `.env` file in the `admin-web` directory:

```bash
cd admin-web
touch .env
```

Add your Supabase credentials to `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** 
- The `.env` file is already in `.gitignore` and won't be committed
- Never commit your Supabase service role key to version control
- The app will use fallback values if environment variables are not set (for development only)

### 3. Verify Database Tables

Make sure you have the following tables in your Supabase database:

- `buses`
- `bus_stops`
- `bus_routes`
- `bus_schedules` (run `BUS_SCHEDULES_TABLE.sql` if not created)
- `telemetry`
- `cards`
- `trips`
- `transactions`
- `rfid_logs`

### 4. Run Database Migrations

Execute the SQL file to create the schedules table:

```sql
-- Run this in Supabase SQL Editor
-- File: admin-web/BUS_SCHEDULES_TABLE.sql
```

### 5. Install Dependencies

```bash
cd admin-web
npm install
```

### 6. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in terminal).

### 7. Verify Connection

1. Open the app in your browser
2. Check the **Connection Status** indicator at the top of the Dashboard
3. It should show:
   - **Connected** (green) - if connection is successful
   - **Disconnected** (red) - if there's an issue

## Troubleshooting

### Connection Issues

**Problem:** Connection status shows "Disconnected"

**Solutions:**
1. Verify your `.env` file has correct credentials
2. Check that your Supabase project is active
3. Ensure your Supabase URL and anon key are correct
4. Check browser console for detailed error messages
5. Verify that RLS (Row Level Security) is disabled or policies are set correctly

### Missing Tables

**Problem:** "Table does not exist" errors

**Solutions:**
1. Run the SQL migrations from `SUPABASE_SCHEMA.md`
2. Check that all required tables exist in your Supabase database
3. Verify table names match exactly (case-sensitive)

### Environment Variables Not Loading

**Problem:** App uses fallback values instead of `.env` values

**Solutions:**
1. Make sure `.env` file is in the `admin-web` directory (not parent)
2. Restart the development server after creating/modifying `.env`
3. Variable names must start with `VITE_` for Vite to expose them
4. Clear browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

## Current Configuration

The app currently uses these fallback values (for development):
- **URL:** `YOUR_SUPABASE_PROJECT_URL`
- **Anon Key:** `YOUR_SUPABASE_ANON_KEY`

**Important:** Replace these with your own credentials in production!

## Testing Connection

You can test the connection programmatically:

```javascript
import { testSupabaseConnection } from './utils/supabaseTest'

const result = await testSupabaseConnection()
console.log(result) // { connected: true/false, error?: string }
```

## Security Notes

- Never commit `.env` files to version control
- The anon key is safe to use in client-side code
- For server-side operations, use the service role key (never expose this)
- Enable RLS (Row Level Security) in production with proper policies
