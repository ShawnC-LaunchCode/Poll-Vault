# Railway Deployment Verification Checklist

**Created:** 2025-10-20
**Purpose:** Verify Google OAuth and Railway environment configuration

---

## ✅ Step 1: Google Cloud Console Setup

### 1.1 Create/Verify OAuth 2.0 Client ID

**Navigate to:** [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

**Select:** Your project → Credentials → Create Credentials → OAuth 2.0 Client ID

**Application Type:** Web application

### 1.2 Configure Authorized JavaScript Origins

Add these URLs (replace `your-app` with your actual Railway subdomain):

```
https://your-app.up.railway.app
```

**Note:** Do NOT include trailing slashes or paths

### 1.3 Configure Authorized Redirect URIs

Add these URLs:

```
https://your-app.up.railway.app
https://your-app.up.railway.app/
```

**Note:** Railway uses the root domain for OAuth callbacks

### 1.4 Copy Your Client IDs

You will see TWO important values:

1. **Client ID** - This is used for BOTH variables:
   - `GOOGLE_CLIENT_ID` (server-side token verification)
   - `VITE_GOOGLE_CLIENT_ID` (client-side login button)

**Format:** `xxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`

**Important:** For Poll-Vault, you use the SAME client ID for both variables.

---

## ✅ Step 2: Railway Environment Variables

### 2.1 Required Variables

Go to Railway → Your Project → Variables and add:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `NODE_ENV` | `production` | Sets production mode |
| `DATABASE_URL` | `postgresql://...` | Your PostgreSQL connection string (from Neon or Railway) |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Server-side OAuth client ID |
| `VITE_GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | **CRITICAL:** Client-side OAuth client ID (embedded at build time) |
| `SESSION_SECRET` | `<32+ char random string>` | Session encryption key |
| `ALLOWED_ORIGIN` | `your-app.up.railway.app` | **Hostname only** (no https://) |

### 2.2 Optional Variables

| Variable Name | Default | Description |
|---------------|---------|-------------|
| `SENDGRID_API_KEY` | (none) | For sending email invitations |
| `SENDGRID_FROM_EMAIL` | (none) | From address for emails |
| `MAX_FILE_SIZE` | `10485760` | Max file upload size (10MB) |
| `UPLOAD_DIR` | `./uploads` | File upload directory |
| `PORT` | `5000` | Railway overrides this automatically |

### 2.3 Generate Strong SESSION_SECRET

**Option 1 - Node.js (in terminal):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2 - Online:**
```bash
https://www.random.org/strings/?num=1&len=32&digits=on&upperalpha=on&loweralpha=on&unique=on&format=plain
```

Copy the output and paste it as your `SESSION_SECRET`.

---

## ✅ Step 3: Verify Environment Variables in Railway

### 3.1 Check All Variables Are Set

In Railway Dashboard → Variables, verify you see:

- ✅ `NODE_ENV`
- ✅ `DATABASE_URL`
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `VITE_GOOGLE_CLIENT_ID` ← **Most common missing variable!**
- ✅ `SESSION_SECRET`
- ✅ `ALLOWED_ORIGIN`

### 3.2 Common Mistakes

| Issue | Problem | Solution |
|-------|---------|----------|
| "Dev Login" button showing | Missing `VITE_GOOGLE_CLIENT_ID` | Add the variable and redeploy |
| CORS errors | `ALLOWED_ORIGIN` includes `https://` | Use hostname only: `your-app.up.railway.app` |
| Session not persisting | Missing `SESSION_SECRET` | Generate and add a 32+ char secret |
| Database connection errors | Invalid `DATABASE_URL` | Verify connection string format |
| OAuth redirect errors | Wrong redirect URIs in Google Console | Add exact Railway URL to authorized redirect URIs |

---

## ✅ Step 4: Trigger Rebuild

**Why?** Vite embeds `VITE_*` variables at BUILD TIME, not runtime.

### 4.1 Redeploy in Railway

**Option 1 - Dashboard:**
1. Go to Deployments tab
2. Click three dots (•••) on latest deployment
3. Click "Redeploy"

**Option 2 - Push New Commit:**
```bash
git commit --allow-empty -m "Trigger Railway rebuild"
git push
```

**Option 3 - Railway CLI:**
```bash
railway up
```

### 4.2 Watch Build Logs

In Railway → Deployments → Click on the running deployment → View logs

**Look for:**
- ✅ "Building..."
- ✅ "Running build command: npm run build"
- ✅ No build errors
- ✅ "Deployment successful"

---

## ✅ Step 5: Test Your Deployment

### 5.1 Visit Your App

Open: `https://your-app.up.railway.app`

### 5.2 Check Login Button

**Expected:** Google "Sign in with Google" button
**Not Expected:** "Dev Login" button

**If you still see "Dev Login":**
1. Check browser console for errors
2. Verify `VITE_GOOGLE_CLIENT_ID` is set in Railway
3. Verify you triggered a rebuild AFTER adding the variable
4. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### 5.3 Test Login Flow

1. Click "Sign in with Google"
2. Select your Google account
3. You should be redirected back to Poll-Vault
4. You should see your name in the header with a "Sign Out" button

### 5.4 Common Login Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "redirect_uri_mismatch" | Railway URL not in Google Console | Add exact URL to authorized redirect URIs |
| "Invalid origin" | CORS/Origin mismatch | Verify `ALLOWED_ORIGIN` matches Railway domain |
| "Token verification failed" | Client ID mismatch | Ensure both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` use the same value |
| "Session creation failed" | Database connection issue | Check `DATABASE_URL` and database migrations |

---

## ✅ Step 6: Verify in Browser DevTools

### 6.1 Check Environment Variable Embedding

1. Open your deployed app
2. Open DevTools (F12)
3. Go to "Sources" tab
4. Search for your client ID (Ctrl+F)
5. You should find it embedded in the JavaScript bundle

**If NOT found:** The variable wasn't set during build time. Redeploy.

### 6.2 Check Network Requests

1. Open DevTools → Network tab
2. Click "Sign in with Google"
3. Look for `/api/auth/google` request
4. Check request payload includes `idToken`
5. Check response status (should be 200 OK)

### 6.3 Check Console for Errors

Common errors:
- `VITE_GOOGLE_CLIENT_ID is undefined` → Variable not set during build
- CORS errors → Check `ALLOWED_ORIGIN` configuration
- 401 errors → Token verification failed (check Google Console client ID)

---

## ✅ Step 7: Database Migration

### 7.1 Run Database Migration

**Important:** Run this ONCE after first deployment

**Option 1 - Railway CLI:**
```bash
railway login
railway link  # Select your project
railway run npm run db:push
```

**Option 2 - Railway Dashboard:**
1. Go to Settings
2. Add a one-off deployment command
3. Run: `npm run db:push`

### 7.2 Verify Tables Exist

Connect to your database and verify these tables exist:
- `users`
- `sessions`
- `surveys`
- `surveyPages`
- `questions`
- `responses`
- `answers`
- (and others from schema)

---

## ✅ Troubleshooting Commands

### Check Railway Logs
```bash
railway logs
```

### Check Environment Variables (Railway CLI)
```bash
railway variables
```

### Connect to Database
```bash
railway run psql $DATABASE_URL
```

### Force Rebuild
```bash
railway up --detach
```

---

## 📋 Quick Reference: Your Configuration

**Fill this out as you go:**

```
Railway URL: https://______________________.up.railway.app

Google OAuth Client ID: ______________________.apps.googleusercontent.com

Environment Variables Set:
[ ] NODE_ENV=production
[ ] DATABASE_URL
[ ] GOOGLE_CLIENT_ID
[ ] VITE_GOOGLE_CLIENT_ID  ← Don't forget this one!
[ ] SESSION_SECRET
[ ] ALLOWED_ORIGIN

Google Console Authorized Origins:
[ ] https://______________________.up.railway.app

Google Console Authorized Redirect URIs:
[ ] https://______________________.up.railway.app
[ ] https://______________________.up.railway.app/

Tests Passed:
[ ] Landing page loads
[ ] "Sign in with Google" button appears (not "Dev Login")
[ ] Login flow completes successfully
[ ] User name appears in header after login
[ ] Can create a survey
[ ] Database connection works
```

---

## 🆘 Still Having Issues?

**Check:**
1. Railway build logs for errors
2. Railway runtime logs for errors
3. Browser console for JavaScript errors
4. Network tab for failed API calls
5. Google Cloud Console audit logs

**Common Issues:**
- **"Dev Login" still showing** → `VITE_GOOGLE_CLIENT_ID` not set OR not rebuilt
- **CORS errors** → Check `ALLOWED_ORIGIN` format (hostname only)
- **OAuth redirect errors** → Verify exact URL match in Google Console
- **Session not persisting** → Check `SESSION_SECRET` is set
- **Database errors** → Run `npm run db:push` via Railway CLI

**Get Help:**
- Railway Discord: https://discord.gg/railway
- Google OAuth Docs: https://developers.google.com/identity/gsi/web
- Poll-Vault Issues: Check application logs in Railway dashboard

---

**Good luck! 🚀**
