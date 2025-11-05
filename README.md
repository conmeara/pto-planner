# PTO Planner v3

A modern, user-friendly application for tracking and managing Paid Time Off (PTO).

## Database Schema Setup

This application uses Supabase as the backend database service. Follow these steps to set up the database schema:

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in.
2. Create a new project with a name of your choice.
3. Make note of your project URL and public anon key, which you'll need for the environment variables.

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory of your project with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace `your_supabase_url` and `your_supabase_anon_key` with the values from your Supabase project settings.

### 3. Apply Database Migrations

There are two ways to set up the database schema:

#### Option 1: Using Supabase CLI (Recommended for Development)

1. Install the Supabase CLI if you haven't already:
   ```
   npm install -g supabase
   ```

2. Login to Supabase:
   ```
   supabase login
   ```

3. Link your project:
   ```
   supabase link --project-ref your-project-ref
   ```

4. Push the migrations to your Supabase project:
   ```
   supabase db push
   ```

#### Option 2: Manual SQL Execution

1. Go to the SQL Editor in your Supabase dashboard.
2. Copy the contents of `supabase/migrations/20240101000000_initial_schema.sql`.
3. Paste and execute the SQL in the Supabase SQL Editor.
4. Optionally, also execute the `supabase/seed.sql` file to add test data.

### 4. Verify Setup

You should now have the following tables in your Supabase database:
- users
- pto_settings
- pto_accrual_rules
- pto_transactions
- pto_days
- custom_holidays
- weekend_config

## Database Schema Documentation

For detailed information about the database schema, see [Database Schema Documentation](docs/database-schema.md).

## Development

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Supabase account

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Run the development server:
   ```
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema Overview

The PTO Planner uses the following tables:

1. **users** - Extended user profiles linked to Supabase Auth
2. **pto_settings** - User-specific PTO configuration
3. **pto_accrual_rules** - Rules defining how PTO accrues
4. **pto_transactions** - Record of all PTO balance changes
5. **pto_days** - Individual PTO days requested by users
6. **custom_holidays** - User-defined holidays
7. **weekend_config** - Which days are considered weekends

For a visual representation and detailed description, see the [database schema documentation](docs/database-schema.md).
