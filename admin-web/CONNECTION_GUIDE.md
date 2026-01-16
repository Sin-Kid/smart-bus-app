# Supabase Connection Guide

## Quick Start

Your admin web app is already configured to connect to Supabase! Here's what you need to know:

## Current Setup

- **Supabase Client**: Installed and configured  
- **Connection Test**: Available on Dashboard  
- **Environment Variables**: Supported via `.env` file

## Connection Status

The Dashboard now shows a **Connection Status** indicator at the top:
- **Green (Connected)**: Successfully connected to Supabase
- **Red (Disconnected)**: Connection issue - check credentials
- **Yellow (Loading)**: Testing connection...

Click the RETRY button to retry the connection.

## Configuration Options

### Option 1: Use Environment Variables (Recommended)

Create a `.env` file in the `admin-web` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Benefits:**
- Secure (not committed to git)
- Easy to switch between environments
- Follows best practices

### Option 2: Use Fallback Values (Development Only)

The app currently uses these fallback values:
- **URL**: `YOUR_SUPABASE_PROJECT_URL`
- **Anon Key**: `YOUR_SUPABASE_ANON_KEY`

**Note**: These are for development. Replace with your own credentials for production!

## Getting Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** -> **API**
4. Copy:
   - **Project URL** -> `VITE_SUPABASE_URL`
   - **anon/public key** -> `VITE_SUPABASE_ANON_KEY`

## Testing the Connection

### Method 1: Visual Indicator
- Open the Dashboard
- Check the Connection Status component at the top

### Method 2: Browser Console
Open browser DevTools (F12) and check the console for:
```
Supabase Connection: { url: "...", usingEnv: true/false, keyLength: ... }
```

### Method 3: Programmatic Test
```javascript
import { testSupabaseConnection } from './utils/supabaseTest'

const result = await testSupabaseConnection()
console.log(result)
```

## Troubleshooting

### "Disconnected" Status

**Check:**
1. `.env` file exists and has correct values
2. Restarted dev server after creating `.env`
3. Supabase project is active
4. Network connection is working
5. Browser console for detailed errors

**Common Issues:**

| Issue | Solution |
|------|----------|
| "Invalid API key" | Check that you copied the full anon key |
| "Table does not exist" | Run database migrations (see SETUP.md) |
| "Network error" | Check internet connection and Supabase status |
| Environment variables not loading | Restart dev server, check variable names start with `VITE_` |

### Tables Missing

If you see errors about missing tables, run the SQL migrations:

1. Open Supabase SQL Editor
2. Run `SUPABASE_SCHEMA.md` migrations
3. Run `BUS_SCHEDULES_TABLE.sql` for schedules

## Security Notes

**Safe to Expose:**
- Anon/Public key (used in client-side code)
- Project URL

**Never Expose:**
- Service Role Key (server-side only)
- Database passwords
- JWT secrets

## Files Related to Connection

- `src/supabaseConfig.js` - Main Supabase client configuration
- `src/utils/supabaseTest.js` - Connection testing utilities
- `src/components/ConnectionStatus.jsx` - Visual connection indicator
- `.env` - Your environment variables (create this)

## Next Steps

1. Create `.env` file with your credentials
2. Restart the dev server
3. Check Connection Status on Dashboard
4. Verify tables exist in Supabase
5. Start using the admin features!

## Need Help?

- Check browser console for detailed error messages
- Verify Supabase project is active in dashboard
- Review `SETUP.md` for complete setup instructions
- Check Supabase [documentation](https://supabase.com/docs)
