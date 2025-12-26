# PTO Planner v3

Modern, open-source PTO planning for people who want to see the entire year at a glance. PTO Planner combines a virtualized calendar, flexible accrual tracking, and Firebase-powered sync so you can dial in consecutive-day preferences, share plans, and deploy your own instance.

## Highlights

- Plan every day of the year with a highly performant, virtualized calendar (`src/components/calendar/VirtualizedCalendar.tsx`) and a floating "Island" legend for quick filters.
- A gap-filling PTO engine (`src/lib/pto-optimizer.ts`) ranks working-day bridges between weekends/holidays so you can maximize consecutive time off with real balance awareness.
- Local-first experience driven by `src/contexts/PlannerContext.tsx`; works anonymously with localStorage or authenticated with Firebase Auth + magic links.
- Built-in holiday importer and customizable weekend configuration make the planner globally useful.
- Studio Ghibli-inspired UI built with shadcn/ui, Radix primitives, Tailwind CSS, and Framer Motion.

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions, middleware)
- **Language**: React 19 + TypeScript with strict mode
- **Data**: Firebase (Firestore, Auth, Security Rules)
- **Styling**: Tailwind CSS, shadcn/ui, Radix UI, clsx/tailwind-merge
- **Tooling**: npm, Prettier, scripts for Firebase orchestration and setup automation

## Architecture at a Glance

- `src/app` – App Router routes, public/auth flows, server actions, and middleware entry points.
- `src/contexts/PlannerContext.tsx` – Source of truth for PTO balances, selected days, suggestion preferences, weekend config, and Firebase/local persistence.
- `src/lib/pto-optimizer.ts` – Deterministic gap-filling engine that evaluates anchors, working gaps, and efficiency metrics before ranking the best streaks.
- `src/components/IslandBar.tsx` and `src/components/tabs/*` – UX for the floating legend + settings drawer that orchestrates planner state.
- `src/utils/firebase/*` – Shared helpers for SSR-safe Firebase clients, session management, and server action utilities.
- `firestore.rules` – Security rules for Firestore collections.
- `firestore.indexes.json` – Composite indexes for efficient queries.

## Repository Layout

```
pto-planner/
├── src/
│   ├── app/                # Next.js App Router entry + server actions
│   ├── components/         # UI building blocks, tabs, shadcn/ui
│   ├── contexts/           # React context providers (Planner, Calendar nav)
│   ├── hooks/              # Reusable hooks (e.g., mobile detection)
│   ├── lib/                # Business logic (optimizers, date helpers, utils)
│   ├── types/              # Shared domain types
│   └── utils/              # Firebase clients, encoders, misc helpers
├── docs/                   # Organized references (see docs/README.md)
│   ├── architecture/
│   ├── guides/
│   └── product/
├── scripts/                # Developer tooling (e.g., scripts/setup.sh)
├── public/                 # Static assets (SEO images, icons)
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Firestore composite indexes
└── package.json
```

## Getting Started

### 1. Quick setup (interactive)

```bash
git clone https://github.com/<your-org>/pto-planner.git
cd pto-planner
./scripts/setup.sh
npm run dev
```

The setup script checks prerequisites, installs dependencies, configures `.env.local`, and offers guided Firebase setup. See [`docs/guides/quickstart.md`](docs/guides/quickstart.md) for detailed steps.

### 2. Manual setup

```bash
npm install
# Create .env.local with the Firebase values listed below
npm run dev
```

1. Create a Firebase project and enable Authentication + Firestore.
2. Fill `.env.local` with credentials from Firebase Console → Project Settings.
3. Deploy Firestore rules: copy `firestore.rules` to Firebase Console or use `firebase deploy --only firestore`.
4. Start the dev server with `npm run dev`, then visit http://localhost:3000.

Full instructions (cloud setup, security rules, troubleshooting) live in [`docs/guides/setup.md`](docs/guides/setup.md).

## Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID (server) | Yes |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Yes |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Yes |

Create `.env.local` in the project root and restart `npm run dev` whenever you change these values.

## Database & Firebase

- Firestore collections: `users`, `ptoSettings`, `ptoAccrualRules`, `ptoTransactions`, `ptoDays`, `customHolidays`, and `weekendConfig`.
- All collections have security rules that ensure users can only access their own data.
- Deploy rules via Firebase Console → Firestore → Rules or CLI: `firebase deploy --only firestore`.
- Reference [`docs/architecture/database-schema.md`](docs/architecture/database-schema.md) for collection documentation, and [`docs/architecture/strategy-algorithms.md`](docs/architecture/strategy-algorithms.md) for the planner math.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js in development mode |
| `npm run build` | Production build (runs type checks + Next compiler) |
| `npm run start` | Serve the production build |

## Documentation & Support

- The documentation index lives in [`docs/README.md`](docs/README.md) with links to guides, architecture references, and the product requirements.
- Quick start: [`docs/guides/quickstart.md`](docs/guides/quickstart.md)
  Deep setup & troubleshooting: [`docs/guides/setup.md`](docs/guides/setup.md)
- Product vision: [`docs/product/prd.md`](docs/product/prd.md) and historical notes in [`docs/product/prd-notes.md`](docs/product/prd-notes.md).

## Quality & Testing

Run `npm run build` before pushing changes to ensure type safety, Next.js compilation, and Tailwind extraction all succeed. When touching Firebase or planner logic, consider adding unit coverage around `src/lib` or documenting the change under `docs/`.

## Contributing

1. Fork and create a feature branch (`git checkout -b feature/my-improvement`).
2. Keep code in `src/` organized by domain (components, contexts, lib, utils).
3. Run `npm run build` before opening a PR.
4. Update documentation when you change behavior (especially guides or architecture notes).

Issues and feature requests are welcome in the GitHub tracker. Please include screenshots or reproduction steps when reporting UI bugs.

## License

This project is released under the [MIT License](LICENSE).

## Acknowledgements

- Firebase for auth, database, and serverless infrastructure.
- shadcn/ui and Radix UI for accessible component primitives.
- Inspiration from Studio Ghibli's palettes to keep PTO planning joyful.

Ready to plan smarter breaks? Dive into [`docs/guides/quickstart.md`](docs/guides/quickstart.md) or deploy directly to Vercel with your Firebase project.
