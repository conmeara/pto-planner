# Quick Start Guide - PTO Planner

Get your PTO Planner running in under 5 minutes!

## Option 1: Automated Setup (Recommended)

Run the interactive setup script:

```bash
./scripts/setup.sh
```

This script will:
- Check prerequisites
- Install dependencies
- Configure environment variables
- Set up Firebase (optional)
- Deploy Firestore rules (optional)

Then start the app:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Option 2: Manual Setup (3 Steps)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment

Create `.env.local`:
```bash
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Get credentials from: [Firebase Console](https://console.firebase.google.com) -> Project Settings

### Step 3: Set Up Firestore

**Via Firebase Console:**
1. Go to Firebase Console -> Firestore Database
2. Create a database in production mode
3. Go to Rules tab and paste contents of `firestore.rules`
4. Publish the rules

**Or via CLI:**
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore
```

### Step 4: Start Developing
```bash
npm run dev
```

---

## Verify Everything Works

1. Open http://localhost:3000
2. Click "Sign Up"
3. Enter an email
4. Check your email for magic link
5. Sign in and start planning!

---

## Troubleshooting

**Can't connect to Firebase?**
- Check your `.env.local` file
- Verify credentials in Firebase console
- Restart the dev server

**Permission errors?**
- Make sure Firestore security rules are deployed
- Check that you're authenticated

**Auth not working?**
- Enable Email/Password auth in Firebase Console -> Authentication -> Sign-in method
- Check your authorized domains

---

## Next Steps

1. **Configure PTO Settings** - Set your initial balance and accrual rules
2. **Add Holidays** - Import or manually add your country's holidays
3. **Plan Your Year** - Start marking PTO days on the calendar!

For detailed documentation, see:
- [setup.md](./setup.md) - Complete setup guide
- [README.md](../../README.md) - Full documentation
- [prd.md](../product/prd.md) - Feature details


**Questions?** Check the [troubleshooting section in setup.md](./setup.md#troubleshooting)
