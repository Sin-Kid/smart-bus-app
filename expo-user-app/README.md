# Expo User App - Smart Bus

This is the user-facing mobile app for the Smart Bus system, built with React Native and Expo.

## Features

- ✅ **Email Authentication** - Login with email and password via Supabase
- ✅ **Find Bus** - Search for buses by source, destination, or route ID
- ✅ **Bus Information** - View arrival time, stops, predictions, and departure time
- ✅ **Card Management** - View card balance and recharge
- ✅ **QR Code** - Generate QR codes for bus boarding
- ✅ **Trip History** - View past trips and transactions

## Setup Instructions

### 1. Install Dependencies

```bash
cd expo-user-app/user-app
npm install
```

### 2. Configure Supabase

1. Create a `.env` file in the `user-app` directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

2. Follow the [Supabase Auth Setup Guide](./SUPABASE_AUTH_SETUP.md) to enable email authentication.

### 3. Run the App

```bash
# Start the Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

### 4. Port Configuration (Optional)

By default, Expo automatically finds an available port. To specify a port:

```bash
# For web
npm run web -- --port 8002

# Or set environment variable
PORT=8002 npm start
```

## Project Structure

```
user-app/
├── screens/
│   ├── LoginScreen.js       # Email authentication (first screen)
│   ├── FindBusScreen.js     # Search for buses by route
│   ├── BusInfoScreen.js     # Bus details with 4-part layout
│   ├── CardInfoScreen.js    # Card balance and recharge
│   ├── QRCodeScreen.js      # QR code generation
│   └── TripsScreen.js       # Trip history
├── components/
│   └── ErrorBoundary.js     # Error handling
├── utils/
│   ├── maps.js              # Maps for native platforms
│   └── maps.web.js          # Maps stub for web
├── supabaseConfig.js        # Supabase client configuration
├── App.js                   # Main app navigation
└── index.js                 # App entry point
```

## Navigation Flow

1. **Login Screen** - First screen, requires email authentication
2. **Main Tabs** - After login:
   - **Find Bus** - Search and select routes
   - **My Trips** - View trip history
   - **QR Code** - Generate QR codes
   - **Card Info** - Manage card and recharge
3. **Bus Info Screen** - Shows after selecting a route from Find Bus

## Database Requirements

Make sure your Supabase database has these tables:

- `buses` - Bus fleet information
- `bus_routes` - Route definitions with source/destination
- `bus_stops` - Bus stop locations
- `bus_schedules` - Schedule information (arrival/departure times)
- `cards` - User card information
- `transactions` - Transaction history (trips and recharges)
- `trips` - Trip records

See the `admin-web/COMPLETE_DATABASE_SETUP.sql` file for the complete schema.

## Key Features Explained

### Email Authentication

The app uses Supabase Auth for email/password authentication. Users must sign up or sign in before accessing the app features.

### Find Bus Screen

- Search by source location
- Search by destination location
- Search by Route ID or name
- View available routes with stops information
- Tap on a route to see detailed bus information

### Bus Info Screen (4-Part Layout)

The bus information is displayed in a 2x2 grid:

1. **Top Left - Arrival Time**: Shows arrival time in 24-hour format
2. **Top Right - Stops**: Lists all stops from source to destination
3. **Bottom Left - Prediction**: Shows bus availability prediction (to be connected later)
4. **Bottom Right - Departure**: Shows departure time in 24-hour format

### Card Recharge

- View current balance (calculated from transactions)
- Recharge with quick amount buttons (₹100, ₹200, ₹500, ₹1000)
- Enter custom recharge amount
- Balance is calculated as: Total Recharges - Total Trip Expenses

### QR Code

- Generates QR code with card information
- Preserves all original styling
- Can be shared or saved

## Troubleshooting

### "Unable to resolve module" errors
- Make sure all dependencies are installed: `npm install`
- Clear cache: `npx expo start -c`

### Authentication not working
- Check Supabase Auth is enabled in dashboard
- Verify `.env` file has correct credentials
- See [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md) for detailed setup

### Maps not showing on web
- Maps are only available on native platforms (iOS/Android)
- Web shows a fallback with coordinates and Google Maps link

### Balance calculation issues
- Balance is calculated from transactions: Recharges - Trip Expenses
- Make sure transactions are being recorded correctly in Supabase

## Development Notes

- The app preserves all original styling and design
- QR code functionality is preserved as-is
- All screens maintain the Namma Smart Bus branding (#0BA360 green theme)
- React Native Maps are conditionally loaded (native only)

## License

Private project - All rights reserved

