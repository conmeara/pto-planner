# Quick Start Guide - PTO Planner

Get your PTO Planner running in under 5 minutes! ⏱️

## Option 1: Automated Setup (Recommended) 🚀

Run the interactive setup script:

```bash
./scripts/setup.sh
```

This script will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Configure environment variables
- ✅ Set up Supabase (local or cloud)
- ✅ Apply database migrations

Then start the app:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## Option 2: Manual Setup (3 Steps) 📝

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get credentials from: [Supabase Dashboard](https://app.supabase.com) → Settings → API

### Step 3: Set Up Database

**Via Supabase Dashboard:**
1. Go to SQL Editor
2. Run `supabase/migrations/20240101000000_initial_schema.sql`
3. Run `supabase/migrations/20240102000000_create_views.sql`
4. Run `supabase/migrations/20240103000000_create_functions.sql`

**Or via CLI:**
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Step 4: Start Developing
```bash
npm run dev
```

---

## Verify Everything Works ✅

1. Open http://localhost:3000
2. Click "Sign Up" 
3. Enter an email
4. Check your email for magic link
5. Sign in and start planning! 🏖️

---

## Troubleshooting 🔧

**Can't connect to Supabase?**
- Check your `.env.local` file
- Verify credentials in Supabase dashboard
- Restart the dev server

**Tables not found?**
- Make sure you ran all 3 migration files
- Check Table Editor in Supabase dashboard

**Auth not working?**
- Enable Email auth in Supabase → Authentication → Providers
- Check your site URL is set correctly

---

## Next Steps 🎯

1. **Configure PTO Settings** - Set your initial balance and accrual rules
2. **Add Holidays** - Import or manually add your country's holidays
3. **Plan Your Year** - Start marking PTO days on the calendar!

For detailed documentation, see:
- [setup.md](./setup.md) - Complete setup guide
- [README.md](../../README.md) - Full documentation
- [prd.md](../product/prd.md) - Feature details


**Questions?** Check the [troubleshooting section in setup.md](./setup.md#troubleshooting) 📖
