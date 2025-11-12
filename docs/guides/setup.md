# PTO Planner - Complete Setup Guide

This guide will walk you through setting up the PTO Planner application with Supabase.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account (free tier works great!)
- Docker (optional, for local development)

---

## Quick Start (Recommended)

### Step 1: Clone and Install Dependencies

```bash
# Navigate to project directory
cd pto-planner-v3

# Install dependencies
npm install
```

### Step 2: Set Up Supabase Project

#### Option A: Using Supabase Cloud (Recommended for Production)

1. **Create a Supabase Project**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Click "New Project"
   - Fill in your project details (name, database password, region)
   - Wait for your project to be ready (~2 minutes)

2. **Get Your API Credentials**
   - In your Supabase project dashboard, go to **Settings** → **API**
   - Note down:
     - Project URL (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
     - `anon` public key (long string starting with `eyJ...`)

3. **Create Environment File**
   ```bash
   # Create .env.local file in the project root
   cat > .env.local << EOF
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   EOF
   ```
   
   Replace the values with your actual credentials.

4. **Apply Database Migrations**
   
   **Method 1: Using Supabase Dashboard (Easiest)**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**
   - Create a new query
   - Copy the contents of `supabase/migrations/20240101000000_initial_schema.sql`
   - Paste and click "Run"
   - Repeat for `20240102000000_create_views.sql` and `20240103000000_create_functions.sql`
   - (Optional) Run `supabase/seed.sql` for test data

   **Method 2: Using Supabase CLI**
   ```bash
   # Install Supabase CLI globally
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link your project (get project ref from dashboard URL)
   supabase link --project-ref your-project-ref
   
   # Push migrations to your database
   supabase db push
   ```

#### Option B: Using Local Supabase (For Development)

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Start Local Supabase**
   ```bash
   # Start local Supabase (requires Docker)
   npm run supabase:start
   ```
   
   This will:
   - Start a local PostgreSQL database
   - Start Supabase Studio (admin UI) at http://localhost:54323
   - Start local Auth and Storage services
   - Display your local API credentials

3. **Update Environment Variables**
   ```bash
   cat > .env.local << EOF
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-start-command>
   EOF
   ```

4. **Apply Migrations Locally**
   ```bash
   # Migrations are auto-applied when you run supabase start
   # Or manually reset and apply:
   npm run supabase:reset
   ```

### Step 3: Verify Database Setup

After applying migrations, you should have these tables in your database:

- ✅ `users`
- ✅ `pto_settings`
- ✅ `pto_accrual_rules`
- ✅ `pto_transactions`
- ✅ `pto_days`
- ✅ `custom_holidays`
- ✅ `weekend_config`

You can verify in:
- **Supabase Cloud**: Dashboard → Table Editor
- **Local**: http://localhost:54323 → Table Editor

### Step 4: Run the Application

```bash
# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Detailed Configuration

### Database Schema

The application uses a comprehensive schema designed for PTO tracking:

- **User Management**: Extended Supabase Auth with custom profiles
- **PTO Configuration**: Flexible settings per user
- **Accrual System**: Support for multiple accrual frequencies
- **Transaction History**: Complete audit trail of PTO changes
- **Custom Holidays**: User-defined holidays and paid time off
- **Weekend Config**: Configurable weekend days per user

See [database-schema.md](../architecture/database-schema.md) for detailed documentation.

### Row Level Security (RLS)

All tables have RLS enabled to ensure users can only access their own data. The policies are configured in the initial migration.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | ✅ Yes |

---

## Available NPM Scripts

### Development
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Supabase CLI Commands
- `npm run supabase:install` - Install Supabase CLI globally
- `npm run supabase:login` - Login to Supabase
- `npm run supabase:start` - Start local Supabase instance
- `npm run supabase:stop` - Stop local Supabase
- `npm run supabase:status` - Check local Supabase status
- `npm run supabase:link` - Link to cloud project
- `npm run supabase:push` - Push migrations to cloud
- `npm run supabase:reset` - Reset local database
- `npm run supabase:types` - Generate TypeScript types

### Setup Shortcuts
- `npm run setup:local` - Complete local setup (start + migrate + seed)

---

## Troubleshooting

### Issue: "Invalid API key" or connection errors

**Solution**: 
- Verify your environment variables in `.env.local`
- Make sure there are no extra spaces or quotes
- Restart your dev server after changing `.env.local`

### Issue: Tables don't exist

**Solution**: 
- Make sure you ran all migration files in order
- Check Supabase dashboard → Database → Tables
- Try running migrations manually via SQL Editor

### Issue: Authentication not working

**Solution**: 
- Verify Auth is enabled in Supabase dashboard
- Check your site URL in Supabase → Authentication → URL Configuration
- Make sure your `.env.local` has the correct keys

### Issue: RLS errors (e.g., "new row violates row-level security policy")

**Solution**: 
- Make sure you're authenticated
- Check that RLS policies are properly created (run migrations)
- Verify `auth.uid()` matches your user ID in the database

### Issue: Local Supabase won't start

**Solution**: 
- Make sure Docker is running
- Check ports 54321-54326 aren't already in use
- Try `supabase stop` then `supabase start` again

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
- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)

Happy PTO planning! 🏖️
