# PTO Planner v3

Modern, open-source PTO planning for people who want to see the entire year at a glance. PTO Planner combines a virtualized calendar, flexible accrual tracking, and Supabase-powered sync so you can explore strategies, share plans, and deploy your own instance.

## Highlights

- Plan every day of the year with a highly performant, virtualized calendar (`src/components/calendar/VirtualizedCalendar.tsx`) and a floating “Island” legend for quick filters.
- Five optimization strategies powered by `src/lib/pto-optimizer.ts` help you find balanced breaks, long weekends, or extended getaways based on your real PTO balance.
- Local-first experience driven by `src/contexts/PlannerContext.tsx`; works anonymously with localStorage or authenticated with Supabase Auth + magic links.
- Built-in holiday importer and customizable weekend configuration make the planner globally useful.
- Studio Ghibli-inspired UI built with shadcn/ui, Radix primitives, Tailwind CSS, and Framer Motion.

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions, middleware)
- **Language**: React 19 + TypeScript with strict mode
- **Data**: Supabase (PostgreSQL, Auth, Row Level Security) + Supabase CLI
- **Styling**: Tailwind CSS, shadcn/ui, Radix UI, clsx/tailwind-merge
- **Tooling**: npm, Prettier, scripts for Supabase orchestration and setup automation

## Architecture at a Glance

- `src/app` – App Router routes, public/auth flows, server actions, and middleware entry points.
- `src/contexts/PlannerContext.tsx` – Source of truth for PTO balances, selected days, suggested strategies, weekend config, and Supabase/local persistence.
- `src/lib/pto-optimizer.ts` – Deterministic suggestion engine that evaluates workday sequences, bridge days, and efficiency metrics per strategy.
- `src/components/IslandBar.tsx` and `src/components/tabs/*` – UX for the floating legend + settings drawer that orchestrates planner state.
- `src/utils/supabase/*` – Shared helpers for SSR-safe Supabase clients, middleware session updates, and action utilities.
- `supabase/migrations` – Database schema, RLS policies, triggers, and optional `seed.sql`.

## Repository Layout

```
pto-planner-v3/
├── src/
│   ├── app/                # Next.js App Router entry + server actions
│   ├── components/         # UI building blocks, tabs, tutorial, shadcn/ui
│   ├── contexts/           # React context providers (Planner, Calendar nav)
│   ├── hooks/              # Reusable hooks (e.g., mobile detection)
│   ├── lib/                # Business logic (optimizers, date helpers, utils)
│   ├── types/              # Shared domain and Supabase types
│   └── utils/              # Supabase clients, encoders, misc helpers
├── docs/                   # Organized references (see docs/README.md)
│   ├── architecture/
│   ├── guides/
│   └── product/
├── scripts/                # Developer tooling (e.g., scripts/setup.sh)
├── supabase/               # Local CLI config, migrations, seed data
├── public/                 # Static assets (SEO images, icons)
└── package.json
```

## Getting Started

### 1. Quick setup (interactive)

```bash
git clone https://github.com/<your-org>/pto-planner-v3.git
cd pto-planner-v3
./scripts/setup.sh
npm run dev
```

The setup script checks prerequisites, installs dependencies, configures `.env.local`, and offers guided Supabase linking. See [`docs/guides/quickstart.md`](docs/guides/quickstart.md) for screenshots and troubleshooting.

### 2. Manual setup

```bash
npm install
# Create .env.local with the Supabase values listed below
npm run dev
```

1. Create a Supabase project (cloud or local CLI) and run the SQL files under `supabase/migrations` in order. Optional: `supabase/seed.sql` to preload demo data.
2. Fill `.env.local` with the credentials from Supabase → Settings → API.
3. Start the dev server with `npm run dev`, then visit http://localhost:3000.

Full instructions (cloud vs. local CLI, posture checks, RLS troubleshooting) live in [`docs/guides/setup.md`](docs/guides/setup.md).

## Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL or local API URL (e.g., `http://localhost:54321`) | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key used by the client | ✅ |

Create `.env.local` in the project root and restart `npm run dev` whenever you change these values.

## Database & Supabase

- Schema covers `users`, `pto_settings`, `pto_accrual_rules`, `pto_transactions`, `pto_days`, `custom_holidays`, and `weekend_config`.
- All tables ship with Row Level Security, default timestamp triggers, and helper functions for onboarding.
- Run migrations via Supabase Dashboard → SQL editor or the CLI: `supabase login && supabase link && supabase db push`.
- Reference [`docs/architecture/database-schema.md`](docs/architecture/database-schema.md) for the ERD and table-by-table documentation, and [`docs/architecture/strategy-algorithms.md`](docs/architecture/strategy-algorithms.md) for the planner math.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js in development mode |
| `npm run build` | Production build (runs type checks + Next compiler) |
| `npm run start` | Serve the production build |
| `npm run setup:local` | Convenience wrapper: start local Supabase + migrate + seed |
| `npm run supabase:start|stop|status` | Manage local Supabase via Docker |
| `npm run supabase:link|push|pull|reset` | Sync migrations with a remote project |
| `npm run supabase:types` | Generate TypeScript types from Supabase |

## Documentation & Support

- The documentation index lives in [`docs/README.md`](docs/README.md) with links to guides, architecture references, and the product requirements.
- Quick start: [`docs/guides/quickstart.md`](docs/guides/quickstart.md)  
  Deep setup & troubleshooting: [`docs/guides/setup.md`](docs/guides/setup.md)
- Product vision: [`docs/product/prd.md`](docs/product/prd.md) and historical notes in [`docs/product/prd-notes.md`](docs/product/prd-notes.md).

## Quality & Testing

Run `npm run build` before pushing changes to ensure type safety, Next.js compilation, and Tailwind extraction all succeed. When touching Supabase or planner logic, consider adding unit coverage around `src/lib` or documenting the change under `docs/`.

## Contributing

1. Fork and create a feature branch (`git checkout -b feature/my-improvement`).
2. Keep code in `src/` organized by domain (components, contexts, lib, utils).
3. Run `npm run build` and re-run any relevant Supabase migrations before opening a PR.
4. Update documentation when you change behavior (especially guides or architecture notes).

Issues and feature requests are welcome in the GitHub tracker. Please include screenshots or reproduction steps when reporting UI bugs.

## License

This project is released under the [MIT License](LICENSE).

## Acknowledgements

- Supabase for auth, database, and local development tooling.
- shadcn/ui and Radix UI for accessible component primitives.
- Inspiration from Studio Ghibli’s palettes to keep PTO planning joyful.

Ready to plan smarter breaks? Dive into [`docs/guides/quickstart.md`](docs/guides/quickstart.md) or deploy directly to Vercel with your Supabase project. 🌴
