# Smart Bus Admin Web

Modern admin interface for managing bus routes, stops, schedules, and fleet operations.

## 🚀 Quick Start

### 1. Database Setup

**Option A: Complete Setup (Recommended)**
1. Open [Supabase SQL Editor](https://app.supabase.com)
2. Copy and run `COMPLETE_DATABASE_SETUP.sql`
3. Verify all 9 tables are created

**Option B: Fix Existing Tables**
- If you get "column does not exist" errors, run `FIX_EXISTING_TABLES.sql`
- This adds missing columns to existing tables

**Option C: Step-by-Step**
- See `DATABASE_SETUP.md` for detailed instructions

### 2. Configure Supabase Connection

Create a `.env` file in the `admin-web` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get your credentials from: Supabase Dashboard → Settings → API

### 3. Install & Run

```bash
cd admin-web
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## 📋 Features

### ✅ Active Buses Management
- Add buses with alpha-numerical keys (e.g., BUS001, A123)
- Edit bus names and information
- Delete buses (with cascade to routes/stops)
- View all active buses with timestamps

### ✅ Routes Management
- Create routes with source and destination
- Add and manage stops for each route
- Edit and delete routes and stops
- Reference time for stops (not actual clock time)

### ✅ Scheduling
- Assign buses to routes with reference time
- Manage bus schedules
- Reference time is for labeling only (not actual clock time)
- View all schedules with bus and route information

### ✅ Current Status
- View all traveling buses and their routes
- Real-time status of active buses
- Filter by bus or route
- View telemetry logs with timestamps
- See location, speed, and heading data

### ✅ Real-time Monitoring
- Connection status indicator
- Live statistics dashboard
- Telemetry logs viewer

## 📁 Project Structure

```
admin-web/
├── src/
│   ├── components/          # React components
│   │   ├── ConnectionStatus.jsx
│   │   ├── LogsViewer.jsx
│   │   └── Sidebar.jsx
│   ├── pages/               # Page components
│   │   ├── Dashboard.jsx
│   │   ├── ActiveBusesPage.jsx      # Manage active buses
│   │   ├── RoutesManagementPage.jsx # Manage routes & stops
│   │   ├── SchedulingPage.jsx       # Manage schedules
│   │   ├── CurrentStatusPage.jsx    # View current status
│   │   └── LogsPage.jsx             # View logs
│   ├── utils/              # Utilities
│   │   └── supabaseTest.js
│   ├── supabaseConfig.js   # Supabase client
│   └── styles.css          # Global styles
├── COMPLETE_DATABASE_SETUP.sql  # Run this in Supabase!
├── UPDATE_SCHEMA_FOR_ROUTES.sql # Add source/destination columns
├── DATABASE_SETUP.md       # Database setup guide
└── CONNECTION_GUIDE.md     # Connection troubleshooting
```

## 🗄️ Database Tables

The application requires these tables:

**Core Tables (Required):**
- `buses` - Bus fleet information
- `bus_stops` - Stop locations
- `bus_routes` - Route definitions
- `bus_schedules` - Schedule information ⭐ NEW

**Supporting Tables:**
- `telemetry` - Real-time location data
- `cards` - User card information
- `trips` - Trip records
- `transactions` - Transaction history
- `rfid_logs` - RFID event logs

See `DATABASE_SETUP.md` for details.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Yes |

### Supabase Setup

1. **Create Tables**: Run `COMPLETE_DATABASE_SETUP.sql`
2. **Disable RLS** (for development): Already included in setup script
3. **Enable Realtime**: Go to Database → Replication → Enable for tables

## 📖 Documentation

- **`DATABASE_SETUP.md`** - Complete database setup guide
- **`CONNECTION_GUIDE.md`** - Connection troubleshooting
- **`FEATURES.md`** - Detailed feature documentation
- **`SETUP.md`** - Detailed setup instructions

## 🐛 Troubleshooting

### Connection Issues
- Check `.env` file exists and has correct values
- Verify Supabase project is active
- Check Connection Status on Dashboard
- See `CONNECTION_GUIDE.md` for details

### Database Issues
- Verify all tables exist in Supabase Table Editor
- Check foreign key constraints
- Review Supabase logs
- See `DATABASE_SETUP.md` for verification steps

### Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 🎨 UI Features

- Modern card-based design
- Real-time connection status
- Responsive layout
- Smooth animations
- Color-coded status indicators

## 🔐 Security Notes

- Never commit `.env` files
- Anon key is safe for client-side use
- Service role key should never be exposed
- Enable RLS in production with proper policies

## 📝 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🆘 Support

1. Check browser console for errors
2. Verify Supabase connection status
3. Review documentation files
4. Check Supabase dashboard logs

## 📄 License

See project root for license information.

---

**Ready to start?** Run `schema.sql` in Supabase, then `npm run dev`!

