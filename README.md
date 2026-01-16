# Smart Bus System Developed by Pavan G with the help of Chatgpt, gemini and claudecode. Also i have used code editor for writing the code.

A comprehensive IoT-enabled Smart Bus management system featuring real-time tracking, RFID ticketing, and seat occupancy simulation.

## Project Structure

- **admin-web/**: React-based Admin Dashboard for managing routes, buses, and viewing live simulation.
- **expo-user-app/**: React Native (Expo) mobile app for passengers to find buses, view routes, and simple ticketing.
- **arduino/**: C++ code for ESP8266/ESP32 hardware handling RFID scanning.
- **functions/**: Backend cloud functions (Node.js) for handling complex logic (optional).

---

## Quick Start Guide

### 1. Database Setup (Supabase)

1.  Go to your Supabase Project's **SQL Editor**.
2.  Open `admin-web/schema.sql` from this repository.
3.  Copy the content and run it in the SQL Editor to create all tables and functions.

### 2. Admin Web Setup

The Admin Dashboard is where you manage everything.

```bash
cd admin-web

# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env
# Edit .env and add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Start the dev server
npm run dev
```
> Access at: `http://localhost:5173`

### 3. User App Setup (Mobile)

The mobile app for passengers.

```bash
cd expo-user-app/user-app

# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env
# Edit .env and add your EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# 3. Start Expo
npx expo start
```
> Scan the QR code with your phone (Expo Go app) or run a simulator.

---

## Environment Variables

This project uses `.env` files to manage secrets securely. **Never commit your `.env` files to Git.**

**Admin Web (`admin-web/.env`):**
```ini
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

**User App (`expo-user-app/user-app/.env`):**
```ini
EXPO_PUBLIC_SUPABASE_URL=your_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
```

---

## Key Features

- **Live Simulation**: Manually set bus occupancy, "leaving" status, and updates from the Admin Dashboard.
- **Real-Time Tracking**: Admin updates are instantly reflected in the User App.
- **RFID Ticketing**: Hardware integration for "Tap On / Tap Off" logic (simulated via API).
- **Route Management**: Create routes, add stops, and set arrival times.