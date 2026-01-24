# 🔐 Git Setup & Security Guide

This guide explains how to configure environment variables and maintain security best practices when contributing to the Smart Bus project.

---

## 🎯 Overview

This project uses **environment variables** to manage sensitive credentials (Supabase keys, API tokens, etc.). These credentials are **never committed to Git** for security reasons.

> **⚠️ CRITICAL:** All `.env` files are gitignored. Never commit credentials to the repository.

---

## 🚀 Quick Setup for New Contributors

After cloning the repository, follow these steps to configure your local environment:

### 1️⃣ Admin Web Setup

Navigate to the `admin-web` folder and create your environment file:

```bash
cd admin-web
cp .env.example .env
```

Open `.env` and fill in your Supabase credentials:

```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key
```

**Where to find these:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy **Project URL** and **anon/public key**

---

### 2️⃣ Expo User App Setup

Navigate to the `expo-user-app/user-app` folder and create your environment file:

```bash
cd expo-user-app/user-app
cp .env.example .env
```

Open `.env` and fill in your credentials:

```ini
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key
```

> **Note:** Expo requires the `EXPO_PUBLIC_` prefix for environment variables.

---

### 3️⃣ Backend Functions Setup (Optional)

If you're running the backend WebSocket server:

```bash
cd functions
cp .env.example .env
```

Fill in the **service role key** (⚠️ **NEVER use this in frontend/mobile!**):

```ini
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key
```

**Where to find service role key:**
1. Supabase Dashboard → **Settings** → **API**
2. Copy **service_role key** (under "Project API keys")

---

### 4️⃣ ML Prediction API Setup (Optional)

The ML API doesn't require environment variables, but you need to:

```bash
cd functions/ml_prediction
pip install -r requirements.txt
python train_model.py  # Generate model files
```

---

## 🔒 Security Best Practices

### ✅ DO:
- ✅ Use `.env` files for all sensitive credentials
- ✅ Copy from `.env.example` templates
- ✅ Keep `.env` files local (they're gitignored)
- ✅ Use **anon key** for frontend/mobile apps
- ✅ Use **service role key** only in backend
- ✅ Rotate keys if accidentally exposed
- ✅ Review changes before committing

### ❌ DON'T:
- ❌ Commit `.env` files to Git
- ❌ Hardcode credentials in source code
- ❌ Share service role keys publicly
- ❌ Use service role keys in frontend/mobile
- ❌ Commit debug scripts with credentials
- ❌ Push sensitive data to public repositories

---

## 🛡️ Credential Rotation

If you accidentally expose credentials:

### 1. Rotate Supabase Keys

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Settings** → **API**
3. Click **"Reset API Key"** for the exposed key
4. Update all `.env` files with new keys
5. Restart all running services

### 2. Update Git History (if committed)

If credentials were committed to Git:

```bash
# Remove from history (use with caution!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (only if you own the repo)
git push origin --force --all
```

> **Better approach:** Rotate the keys instead of rewriting history.

---

## 📦 Install Dependencies

After setting up environment variables, install dependencies:

### Admin Web
```bash
cd admin-web
npm install
npm run dev  # Start at http://localhost:5173
```

### User App
```bash
cd expo-user-app/user-app
npm install
npx expo start  # Scan QR code with Expo Go
```

### Backend Functions
```bash
cd functions
npm install
node index.js  # Start at http://localhost:3000
```

### ML Prediction API
```bash
cd functions/ml_prediction
pip install -r requirements.txt
python train_model.py
python api.py  # Start at http://localhost:5001
```

---

## 🧹 Clean Code Standards

### Files Removed (Security Cleanup)
The following files have been removed and gitignored:
- ❌ `functions/debug_rfid_logs.js` (hardcoded credentials)
- ❌ `functions/verify_bus_data.js` (hardcoded credentials)
- ❌ `functions/debug_resolution.js` (hardcoded credentials)
- ❌ `IEEE_REPORT.tex` (contains project details)
- ❌ `IEEE_REPORT_DRAFT.md` (academic publication draft)

### Gitignore Configuration
The `.gitignore` file excludes:
- `node_modules/` (dependencies)
- `.env` and `.env.*` (credentials)
- `*.log`, `*.tmp` (temporary files)
- `build/`, `dist/`, `coverage/` (build artifacts)
- `arduino/**/build/` (Arduino compiled files)
- Debug scripts with hardcoded credentials
- IEEE report files

---

## 🤝 Contributing Guidelines

### Before Committing

1. **Check for credentials:**
   ```bash
   # Search for potential leaks
   grep -r "supabase.co" --exclude-dir=node_modules --exclude="*.md"
   grep -r "eyJ" --exclude-dir=node_modules --exclude="*.md"
   ```

2. **Verify gitignore:**
   ```bash
   git status  # Ensure no .env files are staged
   ```

3. **Test locally:**
   - Admin Web: `npm run dev`
   - User App: `npx expo start`
   - Backend: `node index.js`
   - ML API: `python api.py`

### Commit Message Format

```
<type>: <description>

[optional body]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat: add ML prediction panel to admin dashboard
fix: resolve RFID duplicate scan issue
docs: update README with ML setup instructions
```

---

## 📋 Pre-Commit Checklist

Before pushing changes:

- [ ] All `.env` files are local (not staged)
- [ ] No hardcoded credentials in code
- [ ] Code tested locally
- [ ] Dependencies updated if needed
- [ ] Documentation updated if needed
- [ ] Commit message follows format
- [ ] No debug files with credentials
- [ ] Arduino code uses placeholders

---

## 🔍 Verification Commands

### Check for credential leaks
```bash
# From project root
git diff --cached | grep -i "password\|api_key\|secret"
```

### Verify environment setup
```bash
# Check if .env exists (should exist locally)
ls -la admin-web/.env
ls -la expo-user-app/user-app/.env

# Check if .env is gitignored (should not appear)
git status | grep ".env"
```

### Test connections
```bash
# Admin Web
cd admin-web && npm run dev

# User App
cd expo-user-app/user-app && npx expo start

# Backend
cd functions && node index.js

# ML API
cd functions/ml_prediction && python api.py
```

---

## 📚 Additional Resources

- **[README.md](README.md)** - Project overview and quick start
- **[CLONE_GUIDE.md](CLONE_GUIDE.md)** - Detailed setup instructions
- **[USAGE.md](USAGE.md)** - Feature guides and workflows
- **[SUPABASE_SCHEMA.md](SUPABASE_SCHEMA.md)** - Database documentation
- **[arduino/HARDWARE_CONNECTION.md](arduino/HARDWARE_CONNECTION.md)** - Hardware setup

---

## 🆘 Troubleshooting

### "Missing environment variables" error
- Ensure `.env` file exists in the correct directory
- Verify variable names match exactly (case-sensitive)
- Restart development server after editing `.env`

### "Supabase connection failed" error
- Check Supabase project is active
- Verify API keys are correct
- Ensure using correct key type (anon vs service role)

### Git shows `.env` as untracked
- This is normal! `.env` should remain untracked
- Never run `git add .env`

---

## ✅ Summary

1. **Clone** the repository
2. **Copy** `.env.example` to `.env` in each component
3. **Fill** in your Supabase credentials
4. **Install** dependencies (`npm install`)
5. **Test** locally before committing
6. **Never** commit `.env` files or credentials

---

**Security is everyone's responsibility!** 🔐

If you discover a security issue, please report it immediately to the project maintainers.
