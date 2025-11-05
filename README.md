# PTO Planner v3 🏖️

A modern, user-friendly web application for tracking and optimizing your Paid Time Off (PTO) throughout the year. Built with Next.js, Supabase, and featuring a beautiful Ghibli-inspired UI.

## ✨ Features

- **Interactive Year Calendar** - Visualize your entire year at a glance
- **Smart PTO Tracking** - Track PTO in days or hours with flexible accrual rules
- **Optimization Strategies** - Get suggestions for long weekends, mini-breaks, or extended vacations
- **Public Holidays** - Automatic integration of country-specific holidays
- **Custom Weekends** - Configure which days count as your weekend
- **Real-time Balance** - See your PTO balance update as you plan
- **Magic Link Authentication** - Secure, passwordless login via email

## 🚀 Quick Start

Get up and running in 5 minutes:

```bash
# 1. Install dependencies
npm install

# 2. Set up Supabase (see SETUP.md for details)
# - Create a Supabase project at https://supabase.com
# - Copy your credentials to .env.local

# 3. Apply database migrations
# Via Supabase Dashboard or CLI (see SETUP.md)

# 4. Start the dev server
npm run dev
```

**📖 For complete setup instructions, see [SETUP.md](SETUP.md)**

## 📋 Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **Supabase account** (free tier works great!)
- **Docker** (optional, for local development)

## 🔧 Environment Setup

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from your Supabase project dashboard → Settings → API.

See [.env.example.md](.env.example.md) for more details.

## 🗄️ Database Schema

The application uses a comprehensive PostgreSQL schema with the following tables:

- **users** - Extended user profiles (linked to Supabase Auth)
- **pto_settings** - User-specific PTO configuration
- **pto_accrual_rules** - Flexible PTO accrual rules (weekly, biweekly, monthly, yearly)
- **pto_transactions** - Complete audit trail of PTO changes
- **pto_days** - Individual PTO days with status tracking
- **custom_holidays** - User-defined holidays
- **weekend_config** - Customizable weekend days

All tables include:
- ✅ Row Level Security (RLS) policies
- ✅ Automatic timestamps
- ✅ Indexed foreign keys
- ✅ Data validation triggers

**📖 For detailed schema documentation, see [docs/database-schema.md](docs/database-schema.md)**

## 📦 NPM Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
```

### Supabase Management
```bash
npm run supabase:start      # Start local Supabase (Docker)
npm run supabase:stop       # Stop local Supabase
npm run supabase:status     # Check Supabase status
npm run supabase:link       # Link to cloud project
npm run supabase:push       # Push migrations to cloud
npm run supabase:types      # Generate TypeScript types
```

### Quick Setup
```bash
npm run setup:local   # Start + migrate + seed (local)
```

## 🏗️ Project Structure

```
pto-planner-v3/
├── app/                    # Next.js app directory
│   ├── (auth-pages)/      # Authentication pages
│   ├── protected/         # Protected routes
│   └── actions.ts         # Server actions
├── components/            # React components
│   ├── tabs/             # Island Bar tab components
│   └── ui/               # Reusable UI components
├── docs/                 # Documentation
│   ├── PRD.md           # Product requirements
│   └── database-schema.md
├── supabase/
│   ├── migrations/       # Database migrations
│   ├── seed.sql         # Sample data
│   └── config.toml      # Supabase configuration
└── utils/
    └── supabase/        # Supabase client utilities
```

## 🎨 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **TypeScript**: Full type safety

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Complete setup guide
- **[docs/PRD.md](docs/PRD.md)** - Product requirements & features
- **[docs/database-schema.md](docs/database-schema.md)** - Database schema details
- **[.env.example.md](.env.example.md)** - Environment variables guide

## 🔒 Security

- **Row Level Security (RLS)** - Users can only access their own data
- **JWT Authentication** - Secure token-based auth via Supabase
- **Magic Links** - Passwordless authentication
- **Environment Variables** - Sensitive data never committed

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📄 License

MIT License - feel free to use this project as you wish.

## 🙏 Acknowledgments

- UI/UX inspired by Studio Ghibli aesthetics
- Built with ❤️ using Next.js and Supabase

---

**Ready to start planning your PTO?** Follow the [SETUP.md](SETUP.md) guide and start optimizing your time off today! 🌴
