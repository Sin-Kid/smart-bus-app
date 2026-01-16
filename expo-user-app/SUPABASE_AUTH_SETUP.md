# Supabase Email Authentication Setup Guide

This guide will help you enable email authentication in Supabase for the expo-user-app.

## Steps to Enable Email Authentication in Supabase

### 1. Go to Supabase Dashboard
- Navigate to [https://app.supabase.com](https://app.supabase.com)
- Select your project

### 2. Enable Email Authentication
1. Go to **Authentication** → **Providers** in the left sidebar
2. Find **Email** in the providers list
3. Make sure it's **Enabled** (toggle should be ON)
4. Configure email settings:
   - **Enable email confirmations**: Toggle ON if you want users to verify their email (recommended for production)
   - **Secure email change**: Toggle ON (recommended)
   - **Double confirm email changes**: Toggle ON (recommended)

### 3. Configure Email Templates (Optional)
1. Go to **Authentication** → **Email Templates**
2. Customize the email templates if needed:
   - **Confirm signup**: Email sent when user signs up
   - **Magic Link**: Email sent for passwordless login
   - **Change Email Address**: Email sent when changing email
   - **Reset Password**: Email sent when resetting password

### 4. Set Up Site URL (Important)
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your app's URL:
   - For development: `http://localhost:19006` (Expo default)
   - For production: Your production app URL
3. Add **Redirect URLs**:
   - `exp://localhost:19000` (Expo Go development)
   - `exp://192.168.*.*:19000` (Local network)
   - Your production URLs if applicable

### 5. Test Authentication
1. Run your Expo app: `npm start`
2. Try to sign up with a new email
3. Check your email for the confirmation link (if email confirmation is enabled)
4. Sign in with your credentials

## Troubleshooting

### Issue: "Email not confirmed" error
**Solution**: 
- Go to **Authentication** → **Providers** → **Email**
- Disable "Enable email confirmations" for development
- Or check your email and click the confirmation link

### Issue: Sign up works but sign in fails
**Solution**:
- Make sure the email is confirmed (if confirmations are enabled)
- Check Supabase logs: **Logs** → **Auth Logs**

### Issue: Redirect URL mismatch
**Solution**:
- Add your app's URL to **Redirect URLs** in URL Configuration
- For Expo Go, use: `exp://localhost:19000`

## Security Best Practices

1. **Enable Email Confirmation** for production
2. **Use Row Level Security (RLS)** on your tables
3. **Set up proper RLS policies** to restrict data access
4. **Use Service Role Key** only on the server side, never in client code
5. **Enable Rate Limiting** to prevent abuse

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Auth Helpers for React Native](https://supabase.com/docs/guides/auth/auth-helpers/react-native)

