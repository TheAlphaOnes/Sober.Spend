# Sober.Spend

**A Financially Responsible UPI Layer.**

Scan a UPI QR code, see exactly what it does to your budget before you pay, and build savings without thinking about it. Offline-first, neo-brutalist, built for Gen Z.

---

## What it does

Sober.Spend sits between you and your UPI payment. Instead of just paying, you scan the QR, the app shows you a before/after budget impact, and then you decide whether to send it.

- **Scan to decide** — Scan a UPI QR code, see the projected budget impact, then pay
- **Monthly budget with category limits** — Set a total monthly budget and per-category limits
- **Savings pool** — A persistent wallet that carries over month to month. Leftover budget at month-end automatically rolls into savings
- **Monthly savings target** — Set a monthly savings goal. Deposits count as "used" from your budget so the math stays honest
- **Wishlist** — Save things you want to buy. Fund them from your savings pool over time, or buy directly (recorded as an expense)
- **Flexible categories** — Create custom categories with colors, icons, and keyword matching for auto-categorization
- **Full history** — Filter by category, sort by newest/oldest/highest/lowest
- **Offline-first** — Everything works without an account. Login is optional, only needed for multi-device sync

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo Router v57 (React Native 0.86, React 19) |
| Language | TypeScript |
| Local DB | expo-sqlite + Drizzle ORM |
| State | Zustand |
| Backend | Supabase (auth + Postgres for sync) |
| UI | React Native Reanimated, custom neo-brutalist design system |
| Icons | lucide-react-native |
| Fonts | JockeyOne-Regular (display), SignPainterHouseScript (accent) |

---

## Architecture

```
Sober.Spend/
├── db/
│   └── schema.ts              # SQLite tables + Drizzle setup (expenses, settings, categories, wishlist)
├── src/
│   ├── app/                   # Expo Router screens
│   │   ├── _layout.tsx        # Root layout, fonts, auth init
│   │   ├── index.tsx          # Dashboard — budget summary, risk banner, categories, recent
│   │   ├── scan.tsx           # UPI QR scanner + manual entry
│   │   ├── decision.tsx       # Before/after budget impact, pay or cancel
│   │   ├── history.tsx        # Full transaction history with filter + sort
│   │   ├── wishlist.tsx       # Savings pool, wishlist items, buy/fund
│   │   ├── settings.tsx       # Budget, savings, category limits, reset
│   │   ├── categories.tsx     # Create/edit/delete categories
│   │   ├── profile.tsx        # Auth (login/signup), stats, sync
│   │   └── auth-callback.tsx  # Supabase email confirm redirect
│   ├── stores/                # Zustand stores
│   │   ├── budget-store.ts    # Budget, savings, categories, monthly rollover
│   │   ├── expense-store.ts   # Expenses, pending transaction, monthly reset
│   │   ├── wishlist-store.ts  # Wishlist buckets, items, buy/fund
│   │   └── auth-store.ts      # Supabase session
│   ├── utils/
│   │   ├── budget-engine.ts   # Spent calc, usage %, daily average
│   │   ├── decision-engine.ts # Transaction risk evaluation
│   │   ├── upi-parser.ts      # UPI QR string → pending transaction
│   │   ├── categorize.ts      # Keyword-based category matching
│   │   ├── format.ts          # Currency, date, percent formatters
│   │   ├── supabase.ts        # Supabase client
│   │   └── sync.ts            # Local ↔ remote merge
│   ├── components/
│   │   ├── dashboard/         # BudgetSummary, CategoryCard, RiskBanner, TransactionItem
│   │   └── ui/                # NeoCard, NeoButton, NeoBackButton, ProgressBar, HatchTexture
│   ├── constants/
│   │   ├── theme.ts           # Colors, spacing, radii, borders, shadows, animation, fonts
│   │   └── categories.ts      # Default categories
│   └── types/
│       └── index.ts           # Shared TypeScript types
├── supabase/
│   └── migrations/            # Postgres schema with RLS
└── assets/
    ├── fonts/                 # JockeyOne-Regular, SignPainterHouseScript
    └── images/                # App icons, splash
```

---

## The money model

Two separate concepts that work together:

### Savings pool (persistent wallet)
- `savingsBalance` — carries over month to month, never resets
- Deposit into it from your budget (counts as "used" from monthly budget)
- Withdraw from it back to your budget
- Use it to buy wishlist items
- Monthly rollover adds leftover budget into the pool

### Monthly savings target
- `monthlySavingsDeposited` — tracks deposits made this month toward your target
- Resets every month (new month = new counter)
- Progress bars show monthly progress, not total pool balance
- The monthly reset clears this counter but leaves the pool untouched

### Budget calculation
```
totalUsed = monthlyExpenses + monthlySavingsDeposited
remaining = monthlyBudget - totalUsed
```

Savings deposits count as "used" because the money left your spending budget — it went into savings. This keeps the budget math honest: you can't spend savings money on expenses without it showing up.

---

## Getting started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Expo CLI (comes with Expo SDK 57)
- iOS Simulator or Android Emulator (or Expo Go)

### Install

```bash
pnpm install
```

### Environment

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_your_anon_key_here
```

The app works fully offline without Supabase configured — you just won't get auth or sync.

### Run

```bash
pnpm start
```

Then press `i` for iOS simulator or `a` for Android emulator.

---

## Design system

Neo-brutalist with a dark, minimal aesthetic:

- **Thick solid borders** — 1.5px to 3px, opaque black on dark surfaces
- **Hard offset shadows** — solid accent-colored blocks, no blur
- **Oversized typography** — JockeyOne-Regular for everything, big numbers for impact
- **Category colors** — vibrant fills (mint, yellow, purple, orange, pink, blue) with black text
- **Hatch textures** — diagonal line patterns for depth on cards
- **Broken states** — overspent budget bars overflow and spill, percentages tilt
- **Staggered animations** — entrance animations cascade at 35-60ms per item, completing at different rates so the app feels alive

---

## Supabase setup (optional, for sync)

The migration in `supabase/migrations/0001_sober_spend_schema.sql` creates:

- `expenses`, `categories`, `settings` tables with `user_id` foreign keys
- Row Level Security policies (users can only access their own data)
- Indexes on `user_id` and `date` for query performance

To apply:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

---

## License

Private project.
