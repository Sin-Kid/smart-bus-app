# Admin Web - New Features

## Overview
The admin web interface has been enhanced with a modern UI similar to train tracking apps, specifically designed for bus management.

## New Features

### 1. **Enhanced Routes Page** (`EnhancedRoutesPage.jsx`)
- **Search Routes**: Find routes by selecting source and destination stops
- **View All Routes**: Browse all routes for a selected bus
- **Schedule Management**: Add and manage schedules for each route
- **Tab-based Navigation**: Switch between Search, Routes, and Schedule views

### 2. **Route Search Component** (`RouteSearch.jsx`)
- **Source-Destination Search**: Select stops from dropdown lists
- **Auto-complete**: Search stops by name or code
- **Swap Functionality**: Easily swap source and destination
- **Route Results**: Display matching routes with stop counts

### 3. **Bus Schedules Manager** (`BusSchedulesManager.jsx`)
- **Add Schedules**: Create new schedules with departure/arrival times
- **Days of Week**: Select which days the schedule runs
- **Fare Management**: Set fare for each schedule
- **Status Control**: Activate/deactivate schedules
- **Edit & Delete**: Full CRUD operations for schedules

### 4. **Enhanced Stops Manager** (`EnhancedBusStopsManager.jsx`)
- **Add Stops**: Create new bus stops with name, code, and coordinates
- **Edit Stops**: Update existing stop information
- **Reorder Stops**: Move stops up/down in the sequence
- **Delete Stops**: Remove stops from the system
- **Stop Codes**: Add short codes (like "CST", "SBC") for easy identification

### 5. **Modern Dashboard**
- **Statistics Cards**: Real-time counts of buses, routes, stops, and schedules
- **Quick Actions**: Fast access to common tasks
- **Hero Section**: Prominent call-to-action buttons
- **Info Cards**: Helpful guidance for new users

## Database Schema

### New Table: `bus_schedules`
```sql
CREATE TABLE bus_schedules (
  id UUID PRIMARY KEY,
  bus_id TEXT NOT NULL,
  route_id UUID NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  days_of_week TEXT[],
  fare NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Updated Table: `bus_stops`
- Added `code` column for short stop codes (e.g., "CST", "SBC")

## UI Features

### Design Elements
- **Modern Card-based Layout**: Clean, organized interface
- **Color-coded Elements**: Visual distinction for different states
- **Responsive Design**: Works on desktop and tablet
- **Smooth Animations**: Hover effects and transitions
- **Icon Integration**: Emoji icons for better visual recognition

### Color Scheme
- Primary: Blue (#0b5ff, #667eea)
- Success: Green (#10b981)
- Muted: Gray (#6b7280)
- Cards: White with subtle shadows

## Usage Guide

### Managing Stops
1. Navigate to **Stops** page
2. Select a bus from the dropdown
3. Click **+ Add Stop** to create new stops
4. Fill in name, code (optional), coordinates, and order
5. Use up/down arrows to reorder stops
6. Click edit/delete icons to modify stops

### Managing Routes
1. Navigate to **Routes** page
2. Select a bus
3. Use **Search Routes** tab to find routes by source-destination
4. Use **All Routes** tab to view and manage all routes
5. Click on a route to view/edit it

### Managing Schedules
1. Go to **Routes** page
2. Select a bus and route
3. Click on **Schedule** tab
4. Click **+ Add Schedule** to create new schedules
5. Set departure/arrival times, days of week, fare, and status
6. Edit or delete schedules as needed

## File Structure

```
admin-web/src/
├── components/
│   ├── BusSchedulesManager.jsx      # Schedule management
│   ├── EnhancedBusStopsManager.jsx  # Enhanced stops manager
│   ├── RouteSearch.jsx              # Source-destination search
│   └── RoutesViewer.jsx             # Route display (existing)
├── pages/
│   ├── Dashboard.jsx                # Enhanced dashboard
│   ├── EnhancedRoutesPage.jsx      # New routes page
│   └── StopsPage.jsx                # Enhanced stops page
└── styles.css                       # Comprehensive styling
```

## Setup Instructions

1. **Run the SQL migration**:
   ```sql
   -- Execute BUS_SCHEDULES_TABLE.sql in your Supabase SQL editor
   ```

2. **Install dependencies** (if needed):
   ```bash
   cd admin-web
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

## Notes

- The `bus_schedules` table must be created before using schedule features
- Stop codes are optional but recommended for better UX
- All components use Supabase for real-time updates
- The UI is responsive and works on various screen sizes

