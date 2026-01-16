# Project Git Setup Guide

This project is configured to use environment variables for sensitive credentials (like Supabase Keys). These keys are **not** committed to Git for security reasons.

## Getting Started

After cloning this repository, you must set up your local environment variables.

### 1. Admin Web Setup
Navigate to the `admin-web` folder and copy the example environment file:

```bash
cd admin-web
cp .env.example .env
```

Open the `.env` file and fill in your Supabase credentials:
```ini
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Expo User App Setup
Navigate to the `expo-user-app/user-app` folder and copy the example environment file:

```bash
cd expo-user-app/user-app
cp .env.example .env
```

Open the `.env` file and fill in your credentials:
```ini
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Backend Functions Setup (Optional)
If you are running the backend functions:

```bash
cd functions
cp .env.example .env
```
Fill in the `SUPABASE_SERVICE_ROLE_KEY` (from Supabase Settings > API).

## Clean Code
- **Unused Files Removed**: Redundant test scripts (`test_rpc_connection.js`) have been removed.
- **Gitignore Configured**: `node_modules`, `.env`, and build artifacts are ignored.
- **Single Source of Truth**: Secrets are managed in `.env` files only.

## Install Dependencies
Don't forget to install dependencies in both projects:

```bash
# Admin Web
cd admin-web
npm install

# User App
cd ../expo-user-app/user-app
npm install
```
