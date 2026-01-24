# 🚌 Smart Bus System

**Authors:** Pavan G (@Sin-Kid) & Nandan M Shekar (@nms-eng)

A comprehensive IoT-enabled Smart Bus management system featuring **real-time tracking**, **RFID ticketing**, **ML-powered passenger demand prediction**, and **live analytics dashboard**.

---

## 🌟 Key Features

### 🎯 Core Functionality
- **Real-Time GPS Tracking**: Live bus location updates with sub-2-second latency
- **RFID Tap-On/Tap-Off**: Automated fare calculation and passenger counting
- **Seat Occupancy Monitoring**: Live capacity tracking and availability display
- **Route Management**: Dynamic route creation with multi-stop scheduling

### 🤖 Machine Learning & Analytics
- **AI Passenger Demand Prediction**: Random Forest model with 76.7% accuracy
- **Predictive Analytics Dashboard**: Real-time boarding/alighting forecasts
- **Route Demand Visualization**: Data-driven bus deployment recommendations
- **Passenger Flow Analysis**: Hourly/daily frequency patterns with peak hour detection

### 📱 User Experience
- **Admin Web Dashboard**: React-based control center with live analytics
- **Mobile User App**: React Native (Expo) app for passengers
- **Digital Wallet**: Cashless payment system with trip history
- **Live Bus Timeline**: Real-time journey tracking with stop-by-stop updates

---

## 📁 Project Structure

```
smart-bus-supabase/
├── admin-web/              # React Admin Dashboard (Vite)
│   ├── src/
│   │   ├── components/     # MLPredictionPanel, RoutePassengerChart, etc.
│   │   └── pages/          # StatusPage, RoutesPage, SchedulesPage
│   └── schema.sql          # Complete Supabase database schema
│
├── expo-user-app/          # React Native Mobile App
│   └── user-app/
│       └── screens/        # BusListScreen, TripsScreen, TopUpScreen
│
├── arduino/                # ESP8266/ESP32 Firmware
│   └── code1/
│       └── code1.ino       # RFID + GPS integration
│
└── functions/              # Backend Services
    ├── index.js            # WebSocket server for real-time updates
    └── ml_prediction/      # Machine Learning API
        ├── train_model.py  # Random Forest training script
        └── api.py          # Flask prediction API (port 5001)
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ and npm
- Supabase account ([sign up free](https://supabase.com))
- Expo Go app (for mobile testing)
- Python 3.8+ (for ML features)

### 1️⃣ Database Setup (Supabase)

1. Create a new project at [Supabase Dashboard](https://app.supabase.com)
2. Go to **SQL Editor**
3. Copy and run `admin-web/schema.sql` to create all tables and functions
4. Note your **Project URL** and **Anon Key** from Settings → API

### 2️⃣ Admin Web Setup

```bash
cd admin-web

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your credentials:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_key

# Start development server
npm run dev
```

**Access at:** `http://localhost:5173`

### 3️⃣ User Mobile App Setup

```bash
cd expo-user-app/user-app

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your credentials:
# EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Start Expo
npx expo start
```

**Scan QR code** with Expo Go app or press `i`/`a` for iOS/Android simulator.

### 4️⃣ ML Prediction API Setup (Optional)

```bash
cd functions/ml_prediction

# Install Python dependencies
pip install -r requirements.txt

# Train the model (generates model files)
python train_model.py

# Start the prediction API
python api.py
```

**API runs on:** `http://localhost:5001`

### 5️⃣ Backend Functions Setup (Optional)

```bash
cd functions

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# Start WebSocket server
node index.js
```

---

## 🔐 Security & Environment Variables

> **⚠️ IMPORTANT:** Never commit `.env` files to Git. All sensitive credentials are gitignored.

### Required Environment Variables

#### Admin Web (`admin-web/.env`)
```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key
```

#### User App (`expo-user-app/user-app/.env`)
```ini
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key
```

#### Backend Functions (`functions/.env`)
```ini
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key
```

#### Arduino (`arduino/code1/code1.ino`)
```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* SUPABASE_URL = "your-project.supabase.co";
const char* SUPABASE_KEY = "your_anon_key";
```

### Security Best Practices
- ✅ All `.env` files are gitignored
- ✅ No hardcoded credentials in source code
- ✅ Use environment variables for all secrets
- ✅ Rotate API keys if exposed
- ✅ Use service role key only in backend (never in frontend/mobile)

---

## 📚 Additional Documentation

- **[CLONE_GUIDE.md](CLONE_GUIDE.md)** - Step-by-step cloning and setup
- **[GIT_SETUP.md](GIT_SETUP.md)** - Environment configuration for contributors
- **[USAGE.md](USAGE.md)** - User workflows and feature guides
- **[HARDWARE_CONNECTION.md](arduino/HARDWARE_CONNECTION.md)** - Arduino wiring guide
- **[SUPABASE_SCHEMA.md](SUPABASE_SCHEMA.md)** - Database schema documentation

---

## 🛠️ Technology Stack

### Frontend
- **Admin Dashboard:** React 18 + Vite + Recharts
- **Mobile App:** React Native + Expo SDK 52
- **Styling:** CSS3 with modern gradients and animations

### Backend
- **Database:** Supabase (PostgreSQL)
- **Real-Time:** Supabase Realtime subscriptions
- **API:** Node.js + Express + WebSocket

### Hardware
- **Microcontroller:** ESP8266 (NodeMCU)
- **RFID:** RC522 (dual readers for entry/exit)
- **GPS:** NEO-6M module

### Machine Learning
- **Framework:** scikit-learn (Random Forest)
- **API:** Flask + pandas + numpy
- **Training Data:** 180 days, 30,600 samples
- **Accuracy:** 76.7% (R² = 0.767)

---

## 🎓 Academic Publication

This project is documented in an IEEE-format research paper:
- **Title:** IoT-Based Smart Bus Management and Real-Time Tracking System using Cloud Computing
- **ML Performance:** 76.7% prediction accuracy, 48% improvement over baseline
- **Dataset:** 6 months operational data, 10 stops per route

---

## 📄 License

This project is developed for academic and research purposes.

**Authors:** Pavan G (@Sin-Kid) & Nandan M Shekar (@nms-eng)

---

## 🤝 Contributing

For new contributors:
1. Read [GIT_SETUP.md](GIT_SETUP.md) for environment setup
2. Never commit `.env` files or credentials
3. Follow existing code style and structure
4. Test changes locally before pushing

---

## 📞 Support

For issues or questions:
- Check documentation in respective folders
- Review `USAGE.md` for feature guides
- Ensure all environment variables are correctly configured