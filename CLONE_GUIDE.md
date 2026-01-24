# 🚀 Cloning & Setup Instructions

This guide provides a comprehensive step-by-step walkthrough for cloning the Smart Bus repository and setting up all components locally.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **Expo Go** app on your mobile device ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- **Python** 3.8+ (for ML features) ([Download](https://www.python.org/))
- **Supabase Account** ([Sign up free](https://supabase.com))

---

## 1️⃣ Clone the Repository

Open your terminal or command prompt and run:

```bash
git clone <your-repository-url>
cd smart-bus-supabase
```

*Replace `<your-repository-url>` with your actual Git repository URL (e.g., `https://github.com/Sin-Kid/smart-bus-app.git`)*

---

## 2️⃣ Database Setup (Supabase)

### Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in project details and wait for setup to complete

### Run Database Schema

1. Navigate to **SQL Editor** in your Supabase project
2. Open `admin-web/schema.sql` from the cloned repository
3. Copy the entire content
4. Paste and **Run** in the SQL Editor
5. Verify tables are created (check **Table Editor**)

### Get API Credentials

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (for backend only, starts with `eyJ...`)

---

## 3️⃣ Admin Web Dashboard Setup

The Admin Dashboard is where you manage routes, buses, and view analytics.

### Navigate to folder
```bash
cd admin-web
```

### Install dependencies
```bash
npm install
```

### Configure environment variables

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in a text editor and add your credentials:
   ```ini
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key
   ```

### Start the development server
```bash
npm run dev
```

**Access at:** `http://localhost:5173`

**Default login:** `admin@gmail.com` / `admin123` (or create account via Supabase Auth)

---

## 4️⃣ User Mobile App Setup

The mobile app allows passengers to track buses and manage trips.

### Navigate to folder (from project root)
```bash
cd expo-user-app/user-app
```

### Install dependencies
```bash
npm install
```

### Configure environment variables

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in a text editor and add your credentials:
   ```ini
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key
   ```

### Start Expo
```bash
npx expo start
```

### Run on device/simulator
- **Physical Device:** Scan the QR code with Expo Go app
- **iOS Simulator:** Press `i` (requires Xcode on Mac)
- **Android Emulator:** Press `a` (requires Android Studio)

---

## 5️⃣ ML Prediction API Setup (Optional)

The Machine Learning API provides passenger demand forecasting.

### Navigate to folder (from project root)
```bash
cd functions/ml_prediction
```

### Install Python dependencies
```bash
pip install -r requirements.txt
```

*If `requirements.txt` doesn't exist, install manually:*
```bash
pip install flask flask-cors scikit-learn pandas numpy joblib
```

### Train the model
```bash
python train_model.py
```

*This generates `passenger_model_boarding.pkl` and `passenger_model_alighting.pkl`*

### Start the prediction API
```bash
python api.py
```

**API runs on:** `http://localhost:5001`

**Test endpoint:** `http://localhost:5001/health`

---

## 6️⃣ Backend Functions Setup (Optional)

The backend provides WebSocket real-time updates and additional APIs.

### Navigate to folder (from project root)
```bash
cd functions
```

### Install dependencies
```bash
npm install
```

### Configure environment variables

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your **service role key**:
   ```ini
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key
   ```

   > **⚠️ WARNING:** Never use service role key in frontend/mobile apps!

### Start the server
```bash
node index.js
```

**Server runs on:** `http://localhost:3000`

---

## 7️⃣ Arduino Hardware Setup (Optional)

For physical RFID and GPS integration.

### Hardware Required
- ESP8266 NodeMCU
- 2x RC522 RFID readers
- NEO-6M GPS module
- Jumper wires

### Setup Instructions

1. Follow wiring guide in [`arduino/HARDWARE_CONNECTION.md`](arduino/HARDWARE_CONNECTION.md)
2. Open `arduino/code1/code1.ino` in Arduino IDE
3. Update credentials:
   ```cpp
   const char* WIFI_SSID = "YOUR_WIFI_SSID";
   const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
   const char* SUPABASE_URL = "your-project.supabase.co";
   const char* SUPABASE_KEY = "your_anon_key";
   ```
4. Install required libraries (MFRC522, TinyGPSPlus, ArduinoJson)
5. Upload to ESP8266

---

## 🔐 Security Checklist

Before committing any changes:

- [ ] All `.env` files are created and configured
- [ ] `.env` files are **NOT** tracked by git (they're gitignored)
- [ ] No hardcoded credentials in source code
- [ ] Arduino code uses your actual credentials (not committed)
- [ ] Service role key is only in backend `.env`

---

## ✅ Verification Steps

### Test Admin Dashboard
1. Open `http://localhost:5173`
2. Login with admin credentials
3. Check **Status Page** for live bus data
4. Verify **ML Prediction Panel** shows forecasts (if ML API is running)

### Test Mobile App
1. Open Expo app on your device
2. Login or create account
3. Navigate to **Find Bus** screen
4. Search for a route (e.g., "WEST DOWN")

### Test ML API
```bash
curl http://localhost:5001/health
```
Expected response: `{"status": "healthy"}`

### Test Backend Functions
```bash
curl http://localhost:3000/health
```

---

## 🛠️ Troubleshooting

### "Module not found" errors
```bash
# In the respective folder (admin-web or expo-user-app/user-app)
rm -rf node_modules package-lock.json
npm install
```

### Environment variables not loading
- Ensure `.env` file is in the correct directory
- Restart the development server after editing `.env`
- Check for typos in variable names
- Ensure no spaces around `=` in `.env` files

### Supabase connection errors
- Verify your Supabase project is active
- Check API credentials are correct
- Ensure you're using **anon key** for frontend/mobile
- Ensure you're using **service role key** only for backend

### Expo app not connecting
- Ensure phone and computer are on the same Wi-Fi network
- Try tunnel mode: `npx expo start --tunnel`
- Clear Expo cache: `npx expo start -c`

### ML API errors
- Verify Python version: `python --version` (should be 3.8+)
- Check all dependencies installed: `pip list`
- Ensure model files exist after training
- Check port 5001 is not in use

### Arduino upload fails
- Select correct board: **NodeMCU 1.0 (ESP-12E Module)**
- Select correct port in Arduino IDE
- Install ESP8266 board support via Board Manager
- Install required libraries via Library Manager

---

## 📚 Next Steps

After successful setup:

1. Read **[USAGE.md](USAGE.md)** for feature guides
2. Review **[GIT_SETUP.md](GIT_SETUP.md)** for contribution guidelines
3. Explore the Admin Dashboard features
4. Test the mobile app workflows
5. Review database schema in **[SUPABASE_SCHEMA.md](SUPABASE_SCHEMA.md)**

---

## 🆘 Getting Help

If you encounter issues:

1. Check this troubleshooting section
2. Review error messages carefully
3. Verify all prerequisites are installed
4. Ensure environment variables are correctly configured
5. Check respective component documentation

---

**Setup Complete!** 🎉 You're ready to start using the Smart Bus System.
