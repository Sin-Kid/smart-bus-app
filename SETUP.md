# Smart Bus System - Setup Guide

Complete installation and configuration instructions for the Smart Bus System.

## Prerequisites

### Required Software
- Node.js 18 or higher (https://nodejs.org/)
- Python 3.8 or higher (https://python.org/)
- Git (https://git-scm.com/)
- Supabase Account (https://supabase.com/)

### Optional Software
- Expo CLI (for mobile application development)
- MATLAB (for data generation scripts)

---

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd smart-bus-supabase
```

### 2. Supabase Configuration

1. Create a new project at supabase.com
2. Obtain your project credentials:
   - Project URL
   - Anonymous/Public Key
   - Service Role Key

3. Execute database setup:
   - Run schema.sql in Supabase SQL Editor
   - Run seed_data.sql for sample data

### 3. Administrative Dashboard Setup

```bash
cd admin-web
npm install
```

Create .env file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Start development server:
```bash
npm run dev
```

Access at: http://localhost:5173

### 4. Mobile Application Setup

```bash
cd expo-user-app
npm install
```

Create .env file:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Start Expo development server:
```bash
npx expo start
```

Scan QR code with Expo Go application on mobile device.

### 5. Edge Functions Setup

```bash
cd functions
npm install
```

Deploy to Supabase:
```bash
supabase functions deploy
```

### 6. Analytics Setup

```bash
cd functions/ml_prediction
pip install -r requirements.txt
```

Generate visualizations:
```bash
python3 simple_bus_viz.py
```

---

## Configuration

### Administrative Dashboard

Environment Variables (.env):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Mobile Application

Environment Variables (.env):
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Analytics

Python Dependencies (requirements.txt):
```
pandas
numpy
matplotlib
```

Installation:
```bash
pip install -r requirements.txt
```

---

## Database Schema

### Primary Tables

**buses**
- id, name, location, speed, heading, status, capacity

**bus_routes**
- id, bus_id, name, source, destination, stops

**bus_stops**
- id, bus_id, route_id, name, code, lat, lon, order, arrival_time

**cards**
- id, name, card_number, balance, card_type, status

**trips**
- id, bus_id, card_id, start_time, end_time, fare, status

**rfid_logs**
- id, bus_id, card_id, event_type, timestamp

---

## Running the System

### Development Mode

**1. Administrative Dashboard:**
```bash
cd admin-web
npm run dev
```

**2. Mobile Application:**
```bash
cd expo-user-app
npx expo start
```

**3. Analytics Generation:**
```bash
cd functions/ml_prediction
python3 simple_bus_viz.py
```

### Production Build

**Administrative Dashboard:**
```bash
cd admin-web
npm run build
```

**Mobile Application:**
```bash
cd expo-user-app
eas build --platform android
eas build --platform ios
```

---

## Mobile Application Features

### User Features
- Real-time bus location tracking
- Route search and planning
- Estimated arrival time calculations
- RFID card balance management

### Setup Process
1. Install Expo Go on mobile device
2. Scan QR code from npx expo start
3. Login with user credentials

---

## Administrative Dashboard

### Features
- Fleet management and monitoring
- Route planning and management
- Real-time bus tracking
- Passenger analytics and reporting
- Driver management and assignment

### Access
- URL: http://localhost:5173
- Credentials: Configure in Supabase Authentication

---

## Analytics System

### Simple Bus Visualization

**Location:** functions/ml_prediction/

**Generate Reports:**
```bash
python3 simple_bus_viz.py
```

**Output Files:**
- image1_occupancy.png - Daily occupancy (0-40 passengers)
- image2_entering_exiting.png - Passenger flow visualization

**Features:**
- Weekday: 25-40 passengers
- Weekend: 15-25 passengers
- Day names displayed on charts
- Simple condition-based logic

---

## Security

### Environment Variables
- Never commit .env files to version control
- Use .env.example as template
- Rotate keys regularly for production

### Supabase Row Level Security
- Enable Row Level Security on all tables
- Configure appropriate access policies
- Use service role key only in backend functions

---

## Troubleshooting

### Common Issues

**1. Supabase Connection Error**
- Verify .env file contains correct credentials
- Confirm Supabase project is active
- Check network connectivity

**2. Mobile Application Not Loading**
- Clear Expo cache: npx expo start -c
- Reinstall dependencies: rm -rf node_modules && npm install
- Verify Expo Go application is updated

**3. Analytics Script Errors**
- Install Python dependencies: pip install -r requirements.txt
- Verify Python version: python3 --version
- Check matplotlib backend configuration

**4. Build Errors**
- Clear build cache
- Delete node_modules and reinstall
- Verify Node.js version compatibility

---

## Additional Resources

### Documentation
- Supabase Documentation: https://supabase.com/docs
- React Documentation: https://react.dev/
- Expo Documentation: https://docs.expo.dev/
- Python Matplotlib: https://matplotlib.org/

### Support
- Create an issue on GitHub
- Review existing issues and documentation
- Contact: pavan@example.com

---

## Updates and Maintenance

### Updating Dependencies

**Administrative Dashboard:**
```bash
cd admin-web
npm update
```

**Mobile Application:**
```bash
cd expo-user-app
npm update
```

**Python Packages:**
```bash
pip install --upgrade -r requirements.txt
```

---

## Verification Checklist

After completing setup, verify the following:

- [ ] Administrative dashboard loads at localhost:5173
- [ ] Mobile application runs in Expo Go
- [ ] Supabase connection established
- [ ] Analytics script generates images
- [ ] Database tables created successfully
- [ ] Authentication system functional
- [ ] Sample data populated correctly

---

## Database Setup Steps

### Step 1: Create Database Schema

1. Open Supabase SQL Editor in your project dashboard
2. Copy and paste the entire contents of schema.sql
3. Execute the script to create:
   - All database tables (buses, routes, stops, cards, trips, etc.)
   - Indexes for performance optimization
   - Hardware logic functions (entry, exit, telemetry)
   - Row Level Security settings

### Step 2: Populate Sample Data

1. After schema.sql completes successfully
2. Copy and paste the entire contents of seed_data.sql
3. Execute the script to populate:
   - 3 sample buses (BUS101, BUS102, BUS103)
   - 3 routes (2 WEST DOWN, 1 WEST UP)
   - 10 bus stops with GPS coordinates
   - 4 sample RFID cards with balances
   - 3 bus schedules

### Step 3: Verify Installation

Run the verification query at the end of seed_data.sql to confirm:
```sql
SELECT 'Buses' as table_name, COUNT(*) as count FROM buses
UNION ALL
SELECT 'Routes', COUNT(*) FROM bus_routes
UNION ALL
SELECT 'Stops', COUNT(*) FROM bus_stops
UNION ALL
SELECT 'Cards', COUNT(*) FROM cards
UNION ALL
SELECT 'Schedules', COUNT(*) FROM bus_schedules;
```

Expected results:
- Buses: 3
- Routes: 3
- Stops: 10
- Cards: 4
- Schedules: 3

### Step 4: Configure Row Level Security

Configure appropriate RLS policies based on your security requirements.

### Notes

- seed_data.sql uses ON CONFLICT DO UPDATE, making it safe to re-run
- Sample data is intended for development and testing only
- Modify seed data as needed for your specific use case
- For production, replace sample data with actual operational data

---

## Development Workflow

1. Start Supabase project
2. Run administrative dashboard (npm run dev)
3. Run mobile application (npx expo start)
4. Make changes to code
5. Test functionality
6. Commit changes to version control

---

Setup complete. Your Smart Bus System is ready for development and testing.
