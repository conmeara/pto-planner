# PTO Planner - Complete Setup Guide

This guide will walk you through setting up the PTO Planner application with Firebase.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Firebase account (free Spark plan works great!)

---

## Quick Start (Recommended)

### Step 1: Clone and Install Dependencies

```bash
# Navigate to project directory
cd pto-planner

# Install dependencies
npm install
```

### Step 2: Set Up Firebase Project

#### Create a Firebase Project

1. **Create a Firebase Project**
   - Go to [https://console.firebase.google.com](https://console.firebase.google.com)
   - Click "Create a project" or "Add project"
   - Fill in your project name
   - Optionally enable Google Analytics
   - Wait for your project to be ready

2. **Enable Authentication**
   - In your Firebase project, go to **Authentication** -> **Get Started**
   - Enable **Email/Password** sign-in method
   - Optionally enable **Email link (passwordless sign-in)**

3. **Create Firestore Database**
   - Go to **Firestore Database** -> **Create database**
   - Choose "Start in production mode"
   - Select your preferred region
   - Click **Enable**

4. **Get Your Web App Configuration**
   - Go to **Project Settings** (gear icon) -> **General**
   - Scroll to "Your apps" section
   - Click **Add app** and choose **Web** (</>)
   - Register your app with a nickname
   - Copy the Firebase SDK configuration

5. **Get Service Account Credentials**
   - Go to **Project Settings** -> **Service accounts**
   - Click **Generate new private key**
   - Save the downloaded JSON file securely

### Step 3: Configure Environment Variables

Create `.env.local` in the project root:

```bash
# Firebase Client Configuration (from Firebase SDK config)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin SDK Configuration (from service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

**Important**: The `FIREBASE_PRIVATE_KEY` must include the `\n` newline characters and be wrapped in double quotes.

### Step 4: Deploy Firestore Security Rules

**Method 1: Using Firebase Console (Easiest)**
- Go to your Firebase project dashboard
- Navigate to **Firestore Database** -> **Rules**
- Copy the contents of `firestore.rules` from the project
- Paste and click "Publish"

**Method 2: Using Firebase CLI**
```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (select Firestore)
firebase init firestore

# Deploy rules
firebase deploy --only firestore
```

### Step 5: Run the Application

```bash
# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Detailed Configuration

### Database Schema

The application uses Firestore with the following collections:

- **users**: Extended Firebase Auth with custom profiles
- **ptoSettings**: Flexible settings per user
- **ptoAccrualRules**: Support for multiple accrual frequencies
- **ptoTransactions**: Complete audit trail of PTO changes
- **ptoDays**: Individual PTO day records
- **customHolidays**: User-defined holidays and paid time off
- **weekendConfig**: Configurable weekend days per user

See [database-schema.md](../architecture/database-schema.md) for detailed documentation.

### Security Rules

All collections have security rules that ensure users can only access their own data. The rules are defined in `firestore.rules` at the project root.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key (public) | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID (server) | Yes |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Yes |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Yes |

---

## Available NPM Scripts

### Development
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Firebase CLI Commands
- `firebase login` - Login to Firebase
- `firebase deploy --only firestore` - Deploy Firestore rules and indexes
- `firebase emulators:start` - Start local Firebase emulators

---

## Troubleshooting

### Issue: "Invalid API key" or connection errors

**Solution**:
- Verify your environment variables in `.env.local`
- Make sure there are no extra spaces or quotes around values
- Check that the private key has proper `\n` newline characters
- Restart your dev server after changing `.env.local`

### Issue: Permission denied errors

**Solution**:
- Make sure Firestore security rules are deployed
- Check that you're authenticated
- Verify the user ID matches in security rules

### Issue: Authentication not working

**Solution**:
- Verify Email/Password auth is enabled in Firebase Console
- Check your authorized domains in Authentication -> Settings
- Make sure your `.env.local` has the correct API key

### Issue: "Missing or insufficient permissions"

**Solution**:
- Deploy the Firestore security rules from `firestore.rules`
- Make sure the authenticated user ID matches the `user_id` field in documents
- Check Firebase Console -> Firestore -> Rules for any syntax errors

---

## Next Steps

Once your environment is set up:

1. **Test Authentication**: Try signing up and logging in
2. **Configure PTO Settings**: Set up your initial PTO balance
3. **Add Holidays**: Configure your country's public holidays
4. **Plan PTO**: Start planning your time off!

For detailed product features and requirements, see [prd.md](../product/prd.md).

---

## Support

- **Documentation**: Browse the `/docs` folder for additional guides
- **Database Schema**: See [database-schema.md](../architecture/database-schema.md)
- **Product Requirements**: See [prd.md](../product/prd.md)
- **Firebase Docs**: [https://firebase.google.com/docs](https://firebase.google.com/docs)

Happy PTO planning!
