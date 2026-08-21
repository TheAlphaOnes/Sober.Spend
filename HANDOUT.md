# HANDOUT.md — Sober.Spend

A complete reference for understanding, building, and extending this app. Read this before touching anything.

---

## 1. What Is Sober.Spend

Sober.Spend is an offline-first UPI budgeting app for Gen Z. The tagline is **"Spend Like Sober"** — it sits between you and your UPI payment, showing you whether you can actually afford what you're about to pay before you pay it.

**The core loop:**

1. You scan a UPI QR code (or paste a UPI link / enter manually)
2. The app parses the VPA, merchant name, amount, and MCC code
3. It auto-categorizes the transaction (using your past VPA choices, then MCC, then keyword matching)
4. It evaluates the transaction against your monthly budget and category limits
5. You see a decision screen: a visual risk assessment (SAFE, WARNING, DANGER, BROKE, etc.) with cocky Gen Z copywriting
6. You confirm → the app opens the UPI app with the amount pre-filled
7. The expense is recorded against your monthly budget

**What makes it different:**
- It's a **pre-transaction** budgeting layer, not a post-transaction tracker
- Visual communication over text — progress bars, color-coded risk levels, oversized typography
- Offline-first — everything works without an account; login unlocks sync
- Neo-brutalist design with a dark theme, hard offset shadows, and diagonal hatch textures
- Savings pool + wishlist system that integrates into the monthly budget
- VPA category memory — remembers what category you chose for each merchant

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 57 (React Native 0.86) |
| Language | TypeScript 6 |
| Routing | Expo Router (file-based) |
| Database | expo-sqlite (local SQLite, offline-first) |
| ORM | Drizzle ORM |
| State | Zustand |
| Backend | Supabase (Postgres, Auth, RLS) |
| Animations | React Native Reanimated 4.5 |
| Icons | lucide-react-native |
| Camera | expo-camera |
| Fonts | Custom display font loaded via expo-font |

**Package manager:** pnpm

---

## 3. Project Structure

```
Sober.Spend/
├── app.json                  # Expo config (splash, icons, plugins)
├── package.json
├── tsconfig.json
├── db/
│   └── schema.ts             # SQLite tables + Drizzle schema + migrations
├── src/
│   ├── app/                  # Screens (Expo Router file-based routing)
│   │   ├── _layout.tsx       # Root layout — Stack navigator, fonts, auth init
│   │   ├── index.tsx         # Dashboard (home screen)
│   │   ├── scan.tsx          # UPI QR scanner + manual entry
│   │   ├── decision.tsx      # Pre-transaction decision screen
│   │   ├── history.tsx       # Full expense history with filters
│   │   ├── settings.tsx      # Budget, savings, categories, dev-nuke
│   │   ├── profile.tsx       # User profile, login/logout
│   │   ├── categories.tsx    # Category management
│   │   ├── wishlist.tsx      # Wishlist + savings pool
│   │   └── auth-callback.tsx  # Supabase auth redirect handler
│   ├── components/
│   │   ├── dashboard/        # Budget summary, category cards, risk banner, transaction items
│   │   └── ui/               # Neo-brutalist primitives (card, button, back button, progress bar, hatch texture)
│   ├── constants/
│   │   ├── theme.ts          # Colors, Spacing, Radii, Borders, NeoShadows, Animation, Fonts
│   │   └── categories.ts     # Default categories + default budget
│   ├── stores/
│   │   ├── auth-store.ts     # Supabase auth state
│   │   ├── budget-store.ts   # Monthly budget, savings pool, categories
│   │   ├── expense-store.ts  # Expenses + pending transaction
│   │   └── wishlist-store.ts # Wishlist items + buckets
│   ├── types/
│   │   └── index.ts          # All TypeScript interfaces
│   └── utils/
│       ├── budget-engine.ts  # Budget calculations (spent, usage %, remaining)
│       ├── decision-engine.ts # Transaction risk evaluation
│       ├── categorize.ts     # Merchant → category matching (keywords + MCC)
│       ├── upi-parser.ts     # UPI deep link parsing + VPA category memory
│       ├── format.ts         # Currency, date, number formatting
│       ├── supabase.ts       # Supabase client init
│       ├── sync.ts           # Supabase sync (expenses, categories, settings)
│       └── icons.ts          # Category icon name → Lucide component
├── supabase/
│   └── migrations/           # SQL migrations (0000 todos [stale], 0001 sober_spend_schema)
└── .info/                    # Reference materials, design docs, vision tool
```

---

## 4. Data Model

### Local SQLite Tables (`db/schema.ts`)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `expenses` | Every recorded transaction | amount, category, merchant, note, date |
| `settings` | Key-value store for app settings | key, value |
| `categories` | User categories (flexible, not fixed) | name, color, icon, budget_limit, keywords, sort_order |
| `wishlist_buckets` | Optional grouping for wishlist items | name, color, icon, sort_order |
| `wishlist_items` | Things the user wants to buy | name, price, funded_amount, url, bucket_id, status, date_created |
| `vpa_category_map` | VPA → category memory | vpa (PK), category, updated_at |

### Key Types (`src/types/index.ts`)

- `Category` — id, name, color, icon, budgetLimit, keywords[], sortOrder
- `Expense` — id, amount, category, merchant, note, date
- `PendingTransaction` — merchant, amount, category, note, pa (VPA), aiRoast, budgetStatus
- `UPIData` — pa, pn, am, cu, mc, tr, tn, mam, tid, url
- `DecisionResult` — warningLevel (safe/near_limit/exceeded), warningMessage, projectedPercent, currentPercent, totalProjectedPercent, totalCurrentPercent, categorySpent, categoryLimit, budgetStatus, warningMessage
- `WishlistItem` — id, name, price, fundedAmount, url, bucketId, status (funding/ready/bought), dateCreated
- `WishlistBucket` — id, name, color, icon, sortOrder

### Supabase Tables

- `0001_sober_spend_schema.sql` — `expenses`, `categories`, `settings` with `user_id` + RLS
- `0002_profiles.sql` — `profiles` (`id`, `display_name`) used by `ensureProfile`
- Wishlist and VPA maps stay local-only for now

---

## 5. State Management

Four Zustand stores, each owning one domain. All reads go through Drizzle to SQLite.

### `auth-store.ts`
- Holds: user, session, isLoading, isInitialized
- Actions: initialize, signInWithEmail, signUpWithEmail, signOut
- On login / app launch / token refresh: ensures a `profiles` row exists and runs `fullSync()`.
- After local mutations, stores call `schedulePush()` so signed-in devices upload expenses, categories, and settings (including savings).

### `budget-store.ts`
- Holds: monthlyBudget, monthlySavingsTarget, savingsBalance, monthlySavingsDeposited, categories
- Actions: loadSettings, setMonthlyBudget, setMonthlySavingsTarget, setCategoryLimit, addCategory, deleteCategory, addToSavings, deductFromSavings, rolloverIfNeeded, resetMonth
- **Savings architecture**: `savingsBalance` is a persistent wallet (does NOT reset monthly). `monthlySavingsDeposited` is a per-month counter that counts as "used" from the monthly budget. On month rollover, `rolloverIfNeeded()` resets the monthly counter but keeps the savings pool.
- **Monthly savings key format**: `savings_deposits_2026-08` — one counter per calendar month.

### `expense-store.ts`
- Holds: expenses[], pendingTransaction
- Actions: loadExpenses, addExpense, removeExpense, setPendingTransaction, confirmPendingTransaction, clearAll, resetCurrentMonth, mergeRemoteExpenses
- `confirmPendingTransaction` writes the expense to SQLite and clears the pending state.

### `wishlist-store.ts`
- Holds: items[], buckets[]
- Actions: loadWishlist, addItem, buyItem, removeItem, createBucket, deleteBucket
- **Savings integration**: `buyItem` spends the full price from the savings pool when the pool covers it (`spendFromSavings`). If savings are short, the full price is recorded as an Other expense. Per-item fund/unfund is not used — affordability is computed from the pool vs price.

---

## 6. Core Engines

### Budget Engine (`src/utils/budget-engine.ts`)
- `totalSpent(expenses)` — sum of all amounts
- `spentByCategory(expenses)` — map of category → total
- `usagePercent(spent, limit)` — percentage, returns 0 if no limit
- `remaining(spent, limit)` — max(0, limit - spent)
- `projectedUsage(currentSpent, newAmount, limit)` — what the % would be after this expense
- `currentMonthExpenses(expenses)` — filters to current calendar month

### Decision Engine (`src/utils/decision-engine.ts`)
- `evaluateTransaction(merchant, amount, category, expenses, monthlyBudget, monthlySavingsDeposited)`
- Returns a `DecisionResult` with:
  - `warningLevel`: 'safe' | 'near_limit' | 'exceeded'
  - `warningMessage`: human-readable text (e.g. "Exceeds Food by ₹250")
  - `projectedPercent` / `currentPercent`: category-level usage
  - `totalProjectedPercent` / `totalCurrentPercent`: overall budget usage
- **Budget used** = expenses + savings deposits (savings counts as spent from budget)
- If category has no limit, falls back to monthly budget for the percentage

### UPI Parser (`src/utils/upi-parser.ts`)
- `parseUPIString(raw)` — parses `upi://pay?pa=...&pn=...&am=...&mc=...` into UPIData
- `upiToPendingTransaction(upi, categories)` — converts to PendingTransaction with auto-categorization
- `saveVpaCategory(vpa, category)` — saves a VPA → category mapping
- `buildUPIDeepLink(vpa, name, amount, note)` — builds a UPI payment link

**Categorization priority (in `upiToPendingTransaction`):**
1. Saved VPA mapping (user's past choice) — `vpa_category_map` table
2. MCC code from the QR — `categorizeMCC()` maps merchant category codes
3. Merchant name keyword matching — `categorize()` checks category keywords
4. Falls back to "Other"

### Categorize (`src/utils/categorize.ts`)
- `categorize(merchant, categories)` — keyword-based matching against category keywords
- `categorizeMCC(mcc, categories)` — maps MCC code ranges to category names (Food, Travel, Entertainment, Bills, Shopping)

---

## 7. User Flows

### Scan → Decide → Pay
1. **Scan screen** (`scan.tsx`): Camera view with QR detection, or manual entry (merchant + amount + category)
2. QR is parsed → `setPendingTransaction()` → navigate to `/decision`
3. **Decision screen** (`decision.tsx`): Shows merchant, amount, category (with override option), budget impact (before/after), risk level, and a Pay button
4. User can override category → on confirm, the VPA → category mapping is saved
5. Pay button → confirms the expense in SQLite, opens UPI app with pre-filled link, dismisses

### Dashboard
- Budget summary hero card (spent / budget, progress bar, overspent state)
- Risk banner (second hero card — color-coded with oversized risk level text and cocky message)
- Category cards (per-category spending with progress bars)
- Recent transactions (last 6)
- Quick actions: scan, history, wishlist, settings, profile

### Wishlist + Savings
- Wishlist screen shows items with funding progress
- Savings pool is shown with monthly target progress
- Fund item → moves money from savings pool to item
- Buy item → if fully funded, marks bought; if partial, spends the difference as an expense
- Savings deposits count as "used" from the monthly budget

### Monthly Rollover
- `rolloverIfNeeded()` checks if the month changed since last run
- Resets the monthly savings deposit counter
- Does NOT touch the savings pool balance (that's persistent)
- Expenses are NOT deleted — they're filtered by `currentMonthExpenses()`

### Auth (Optional)
- Login is NOT required for core functionality
- Profile screen has login/signup
- Auth triggers Supabase sync (expenses, categories, settings)
- Onboarding does NOT block on login

---

## 8. Design System

### Theme: Neo-Brutalist Dark

The design lives in `src/constants/theme.ts`. Core principles:

- **Thick solid borders** — black on light, white on dark (1.5px / 2px / 3px)
- **Hard offset shadows** — solid colored blocks behind cards, NOT blurred drop shadows. The signature neo-brutalist element. Shadow color is the accent color (`#C54770`), not harsh white.
- **Bold, oversized typography** — numbers and labels are large and heavy
- **High contrast** — white text on near-black background
- **Clean and minimal** — neo-brutalism without clutter

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `bg` | `#0A0A0A` | App background |
| `surface` | `#1A1A1A` | Card background |
| `surfaceLight` | `#2A2A2A` | Input backgrounds, chips |
| `text` | `#FFFFFF` | Primary text |
| `textSecondary` | `#C0C0C0` | Secondary text |
| `textMuted` | `#9A9A9A` | Tertiary text |
| `accent` | `#C54770` | Primary accent (buttons, shadows, highlights) |
| `accentLight` | `#D65A83` | Hover/active states |
| `mint` | `#A8E6CF` | Category color / safe status |
| `yellow` | `#FFD93D` | Category color / near-limit |
| `purple` | `#C3AED6` | Category color |
| `orange` | `#FFB347` | Category color / warning |
| `pink` | `#FFB3BA` | Category color |
| `blue` | `#87CEEB` | Category color |
| `safe` | `#A8E6CF` | Budget safe status |
| `nearLimit` | `#FFD93D` | Budget near limit |
| `exceeded` | `#FF6B6B` | Budget exceeded |
| `border` | `#333333` | Default border |
| `black` | `#000000` | Neo-brutalist borders on colored cards |

### Spacing

`xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48`

### Radii

`sm: 8, md: 12, lg: 16, xl: 20, pill: 999`

### Borders

`thin: 1.5, medium: 2, thick: 3`

### Neo Shadows (hard offset, not blurred)

`sm: { offset: 6, color: accent }, md: { offset: 8, color: accent }, lg: { offset: 10, color: accent }`

### Animation Timing

- **Press/hover**: 100-150ms (snappy, tactile)
- **State changes**: 200-280ms (deliberate, visible)
- **Entrance**: 300-450ms (staggered, layered)
- **Stagger per item**: 35-60ms (cascading reveal)

**Rule**: Break animations into small segments that complete at different rates so the app feels alive and rich, not monotonous.

---

## 9. UI Components

### `NeoCard` (`src/components/ui/neo-card.tsx`)
- Props: `color`, `borderColor`, `shadowColor`, `offset` (sm/md/lg/false), `textured`, `style`
- Renders a solid-fill card with thick border and optional hard offset shadow
- The shadow is a `View` positioned behind the card at `top: offset, left: offset` — a solid block, not a blur
- `textured` prop adds a diagonal hatch pattern overlay (only on dark surface cards)
- Border color is black on colored cards, `Colors.border` on dark surface cards

### `NeoButton` (`src/components/ui/neo-button.tsx`)
- Props: `title`, `variant` (primary/outline/danger), `size` (sm/md/lg), `icon`
- Compact, not chunky — tight padding
- **Press animation**: two-phase spring — scale 0.97 + translateY 2px on press in, spring back on release. Damping: 30, stiffness: 500, mass: 0.6

### `NeoBackButton` (`src/components/ui/neo-back-button.tsx`)
- Same press animation as NeoButton (scale 0.9, spring back)
- Uses `router.back()` with a fallback to `router.push('/')`

### `ProgressBar` (`src/components/ui/progress-bar.tsx`)
- Props: `percent`, `height`, `color`, `backgroundColor`, `showBorder`
- Color auto-shifts: safe (<70%), nearLimit (70-89%), exceeded (90%+)
- Thick border, solid fill, rounded

### `HatchTexture` (`src/components/ui/hatch-texture.tsx`)
- Diagonal hatch pattern overlay — white diagonal lines on transparent background
- Uses a 64x64 PNG tile (base64 data URI) with `resizeMode: 'repeat'`
- Default opacity: 0.12 — subtle, adds depth without distraction

### `BudgetSummary` (`src/components/dashboard/budget-summary.tsx`)
- Hero card at top of dashboard
- Shows spent amount, budget, progress bar
- **Overspent state**: bar overflows past container edge (broken, spilling red), percentage tilts slightly (animated rotation, slow oscillation), card border turns red
- **Full state**: bar fills completely, no animation

### `RiskBanner` (`src/components/dashboard/risk-banner.tsx`)
- Second hero card — color-coded by risk level
- Risk levels: BROKE, DANGER, WASTED, WARNING, SUS, SAFE, CHILL
- Each level has an icon (Skull, Siren, ShieldAlert, TriangleAlert, Eye, ShieldCheck, Coffee)
- Risk level text is oversized (60-72px depending on length)
- Message uses black text on colored background — high contrast

### `CategoryCard` (`src/components/dashboard/category-card.tsx`)
- Per-category spending with progress bar
- Category color fills the card, black text on color

### `TransactionItem` (`src/components/dashboard/transaction-item.tsx`)
- Flat list row for a single expense — merchant, date, amount, category color dot

---

## 10. Animation Patterns

### Entry animations
- Use `FadeIn` from `react-native-reanimated` (not `FadeInDown` — keep it subtle)
- Duration: 200ms for cards, 160ms for list items
- Stagger: 30-60ms per item, capped at ~5 items
- Example: `entering={FadeIn.delay(80 + index * 30).duration(160)}`

### Press animations
- Two-phase spring: quick scale-down on press, slightly slower spring-back on release
- `withSpring(0.97, { damping: 30, stiffness: 500, mass: 0.6 })` on press
- `withSpring(1, Animation.spring)` on release

### Overspent state (BudgetSummary)
- Slow tilt animation using `withRepeat` + `withSequence` + `withTiming`
- Tilts between -3deg and +3deg over 2-4 second cycles
- Static feel — looks broken, not shaking

### Rules
- **Keep it subtle** — no bouncy, exaggerated entrance animations
- **Stagger** — don't animate everything at once; cascade items
- **Different rates** — different elements complete at different times for richness
- **Tactile press** — buttons should feel physical (translate + scale)

---

## 11. Copywriting

The app speaks to Gen Z with a cocky, playful tone. The user should feel smart for using the app, not dumb for spending.

**Risk banner messages** (from `index.tsx`):
- BROKE: "You hit zero. Iconic. But like, in a bad way."
- DANGER: "Bro you're basically running on fumes. One more swipe and it's over."
- WASTED: "Yeah you absolutely cooked your {category} budget. RIP."
- WARNING: "Bro {category} is eating you alive. Maybe slow down? Just a thought."
- SUS: "Halfway through {category} already? It's literally the 17th."
- SAFE: "Okay {category} spending is giving responsible adult. We love to see it."
- CHILL: "You're actually being responsible? Who even are you right now."

**Tone rules:**
- Clever, cocky, playful
- Never make the user feel dumb — make them feel smart for using the app
- Short, punchy sentences
- Gen Z slang but not forced

---

## 12. Build & Run

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android

# Type check
npx tsc --noEmit

# Lint
pnpm lint
```

### Environment
Create `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_KEY=<your-supabase-anon-key>
```

### Supabase
```bash
# Push migrations
supabase db push

# Start local Supabase
supabase start
```

---

## 13. Key Architecture Decisions

### Offline-first
- All data lives in local SQLite first
- Supabase sync is optional (requires login)
- The app is fully functional without an account
- Sync layer (`src/utils/sync.ts`) pushes expenses, categories, and settings to Supabase when logged in

### Category identity = name (string), not id
- Expenses store the category **name**, not the numeric id
- This keeps UPI parsing and keyword matching simple — they produce names
- If a category is renamed, old expenses keep the old name

### Savings = wallet, not monthly
- `savingsBalance` is persistent — it does NOT reset monthly
- `monthlySavingsDeposited` is a per-month counter that counts as "used" from the budget
- This means: if you deposit ₹500 into savings, your budget shows ₹500 less available
- At month rollover, the counter resets but the savings pool stays

### VPA category memory
- When a user overrides the category for a UPI payment, the VPA → category mapping is saved
- Next time the same VPA is scanned, the saved category is used automatically
- Priority: VPA map → MCC code → keyword matching → "Other"

### Flexible categories
- Categories are not fixed — users can create, edit, and delete them
- Default categories are seeded on first launch (Food, Travel, Entertainment, Bills, Shopping, Other)
- Each category has: name, color, icon, optional budget limit, keywords for auto-matching

---

## 14. Known Issues & Technical Debt

- `expo-contacts` and `expo-updates` are in package.json but no longer used
- `src/components/themed-text.tsx`, `themed-view.tsx`, `src/hooks/*` — Expo boilerplate, not imported
- `supabase/migrations/0000_create_todos.sql` — stale, creates a `todos` table the app doesn't use
- ESLint: `settings.tsx` has a setState-in-effect warning (pre-existing)
- ESLint: `neo-button.tsx` and `neo-back-button.tsx` have Reanimated shared value mutation false positives
- Wishlist `funded_amount` / bucket grouping exist in the schema but the UI buys from the savings pool in one shot
- Category identity is the name string; renaming a category does not rewrite old expenses
