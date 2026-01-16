# Firebase to Supabase Migration Summary

## ✅ Completed Migration

All Firebase and Firestore dependencies have been removed and replaced with Supabase.

### Files Changed

#### Configuration Files
- ✅ Created `admin-web/src/supabaseConfig.js` - Supabase config for admin web app
- ✅ Created `expo-user-app/user-app/supabaseConfig.js` - Supabase config for user app
- ✅ Deleted `admin-web/src/firebaseConfig.js`
- ✅ Deleted `expo-user-app/user-app/firebaseConfig.js`
- ✅ Deleted `firebase.json`

#### Admin Web App (`admin-web/`)
- ✅ `src/components/BusStopsManager.jsx` - Migrated to Supabase
- ✅ `src/components/LogsViewer.jsx` - Migrated to Supabase
- ✅ `src/components/RoutesViewer.jsx` - Migrated to Supabase
- ✅ `src/pages/RoutesPage.jsx` - Migrated to Supabase
- ✅ `package.json` - Removed Firebase, added `@supabase/supabase-js`

#### User App (`expo-user-app/user-app/`)
- ✅ `screens/BusLiveScreen.js` - Migrated to Supabase
- ✅ `screens/TripsScreen.js` - Migrated to Supabase
- ✅ `screens/CardInfoScreen.js` - Migrated to Supabase
- ✅ `package.json` - Removed Firebase, added `@supabase/supabase-js` and `react-native-url-polyfill`

#### Backend (`functions/`)
- ✅ `index.js` - Completely rewritten to use Supabase instead of Firebase Admin
- ✅ `package.json` - Removed Firebase dependencies, added `@supabase/supabase-js`

### Key Changes

#### Data Model Changes
- Firestore collections → PostgreSQL tables
- Subcollections (e.g., `buses/{busId}/stops`) → Separate tables with foreign keys
- Field names converted from camelCase to snake_case (e.g., `busId` → `bus_id`, `cardId` → `card_id`)
- Timestamps now use ISO strings instead of Firestore Timestamp objects

#### API Changes
- `collection()` → `supabase.from()`
- `onSnapshot()` → Supabase realtime subscriptions
- `addDoc()` → `.insert()`
- `updateDoc()` → `.update()`
- `deleteDoc()` → `.delete()`
- `getDoc()` / `getDocs()` → `.select()`
- `query()` with `where()` → `.eq()`, `.order()`, etc.
- `serverTimestamp()` → `new Date().toISOString()`

### Next Steps

1. **Install Dependencies**
   ```bash
   # Admin web app
   cd admin-web
   npm install
   
   # User app
   cd expo-user-app/user-app
   npm install
   
   # Backend
   cd functions
   npm install
   ```

2. **Set up Supabase Project**
   - Create a new Supabase project at https://supabase.com
   - Get your project URL and API keys

3. **Create Database Schema**
   - See `SUPABASE_SCHEMA.md` for the complete schema
   - Run the SQL commands in your Supabase SQL editor to create all tables

4. **Configure Environment Variables**

   **Admin Web App** (`.env` or `.env.local`):
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   **User App** (`.env`):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   **Backend** (`.env`):
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   DEVICE_TOKEN=smart-bus
   PORT=3000
   ```

5. **Run the Applications**
   ```bash
   # Admin web app
   cd admin-web
   npm run dev
   
   # User app
   cd expo-user-app/user-app
   npm start
   
   # Backend API
   cd functions
   npm start
   ```

### Important Notes

- **Data Migration**: If you have existing Firestore data, you'll need to write a migration script to transfer it to Supabase. The schema changes (camelCase to snake_case, subcollections to separate tables) will require data transformation.

- **Authentication**: If you were using Firebase Authentication, you'll need to migrate to Supabase Auth separately. This migration only covered Firestore/Firebase database operations.

- **Real-time Subscriptions**: Supabase real-time works similarly to Firestore but uses PostgreSQL's logical replication. Make sure to enable it in your Supabase project settings.

- **Row Level Security (RLS)**: The schema document shows RLS disabled for development. You should enable and configure RLS policies for production.

### Testing Checklist

- [ ] Test bus stop creation/editing/deletion
- [ ] Test route creation/deletion
- [ ] Test telemetry log viewing
- [ ] Test live bus tracking
- [ ] Test card info display
- [ ] Test trip history
- [ ] Test card recharge
- [ ] Test backend API endpoints (`/device/telemetry`, `/device/rfid`)

### Support

If you encounter any issues:
1. Check that all environment variables are set correctly
2. Verify the database schema matches `SUPABASE_SCHEMA.md`
3. Check Supabase dashboard for any errors
4. Review browser/console logs for detailed error messages

