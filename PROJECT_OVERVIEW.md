# WINOVA — Complete Project Overview

**Domain:** winova-spark-arena.lovable.app  
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS + Supabase (Lovable Cloud)  
**Supabase Project ID:** whatixmzgweolywmrsty  
**Purpose:** Fintech gamification platform — daily contests, P2P Nova transfers, team referrals, spotlight rankings

---

## 1. FOLDER STRUCTURE

```
/
├── public/                          # Static assets
│   ├── favicon.ico / favicon.png
│   ├── manifest.json                # PWA manifest
│   ├── sw.js                        # Service worker
│   └── robots.txt
├── src/
│   ├── main.tsx                     # Entry point
│   ├── App.tsx                      # Root component — all providers + routes
│   ├── App.css
│   ├── index.css                    # Design system tokens (HSL)
│   ├── vite-env.d.ts
│   ├── assets/                      # Logo variants
│   ├── components/
│   │   ├── ui/                      # shadcn/ui primitives (50+ files)
│   │   ├── auth/                    # Auth flow components
│   │   ├── layout/                  # AppLayout, Header, BottomNav, SideDrawer
│   │   ├── home/                    # Homepage cards
│   │   ├── contest/                 # Contest voting & stage UI
│   │   ├── chat/                    # DM, Team, Support chat
│   │   ├── p2p/                     # P2P marketplace components
│   │   ├── wallet/                  # Wallet cards & dialogs
│   │   ├── team/                    # Team hierarchy & rank screens
│   │   ├── spotlight/               # Spotlight leaderboard
│   │   ├── profile/                 # Profile view & edit
│   │   ├── admin/                   # Admin panel components
│   │   ├── common/                  # Shared: CountdownTimer, CurrencyBadge, etc.
│   │   └── p2p-tower/              # Admin P2P control tower
│   ├── contexts/                    # React Context providers
│   ├── hooks/                       # Custom hooks (40+ files)
│   ├── pages/                       # Route pages
│   │   ├── admin/                   # Admin dashboard pages
│   │   ├── support/                 # Support panel pages
│   │   └── policies/               # Legal pages (Terms, Privacy, etc.)
│   ├── lib/                         # Utilities & services
│   │   ├── i18n/                    # Internationalization (10 languages)
│   │   ├── ai/                      # Legacy logger (inactive)
│   │   └── ...                      # Various utility modules
│   ├── integrations/supabase/       # Auto-generated Supabase client + types
│   └── test/                        # Test setup
├── supabase/
│   ├── config.toml                  # Supabase config (auto-managed)
│   ├── migrations/                  # 139 SQL migration files
│   └── functions/                   # Edge Functions
│       ├── contest-scheduler/       # Cron-triggered contest lifecycle
│       └── p2p-auto-expire/         # Auto-expire stale P2P orders
├── database_export.sql              # Full DB export (single runnable file)
├── BACKEND_EXPORT.md                # Documented backend reference
└── Configuration files              # tsconfig, vite, tailwind, eslint, etc.
```

---

## 2. ALL ROUTES

### Public Routes (no auth required)
| Path | Page | Description |
|------|------|-------------|
| `/` | Index | Homepage — wallet preview, contest join, top winners |
| `/hall-of-fame` | HallOfFame | Historical winners display |
| `/winners` | Winners | Current winners |
| `/help` | Help | Help/FAQ page |
| `/user/:userId` | PublicProfile | View any user's public profile |
| `/terms` | Terms | Terms of service |
| `/privacy` | Privacy | Privacy policy |
| `/refund` | Refund | Refund policy |
| `/aml` | AML | Anti-money laundering policy |
| `/contact` | Contact | Contact page |

### Protected Routes (AuthGuard — requires login)
| Path | Page | Description |
|------|------|-------------|
| `/contests` | Contests | Daily contest — voting, stages, results |
| `/team` | Team | Team hierarchy, referrals, ranks |
| `/wallet` | Wallet | Nova/Aura balances, transfer, history |
| `/chat` | Chat | DM, team chat, support chat |
| `/p2p` | P2P | P2P Nova marketplace — buy/sell |
| `/spotlight` | Spotlight | Spotlight leaderboard, points, tiers |
| `/profile` | Profile | User profile view/edit |
| `/notifications` | Notifications | Notification center |
| `/lucky-leaders` | LuckyLeaders | Lucky leaders leaderboard |
| `/settings` | Settings | App settings |

### Support Routes (SupportGuard — requires `support` role)
| Path | Page | Description |
|------|------|-------------|
| `/support` | SupportDashboard | Support overview |
| `/support/ticket/:ticketId` | SupportTicketDetail | Individual ticket |
| `/support/disputes` | SupportDisputes | P2P dispute list |
| `/support/disputes/:orderId` | SupportDisputeDetail | Individual dispute |
| `/support/users` | SupportUsers | User management |
| `/support/staff-ratings` | SupportStaffRatings | Staff rating overview |

### Admin Routes (AdminGuard — requires `admin` role)
| Path | Page | Description |
|------|------|-------------|
| `/admin` | AdminDashboard | Platform metrics |
| `/admin/wallets` | AdminWallets | Wallet management & adjustments |
| `/admin/roles` | AdminRoles | Role assignment |
| `/admin/proposals` | AdminProposals | System proposals |
| `/admin/p2p` | AdminP2P | P2P control tower |

---

## 3. AUTHENTICATION FLOW

**Method:** Supabase Auth (email/password + OTP + Google + Apple)

### Flow:
1. `AuthProvider` wraps entire app — listens to `onAuthStateChange`
2. `GlobalAuthGuard` monitors auth state globally
3. `AuthGuard` component protects routes — redirects to login modal
4. `ProfileEnsureWrapper` ensures profile exists after signup

### Auth Components:
- `AuthLanding` — Entry screen with login/signup options
- `LoginScreen` — Email + password login
- `SignUpScreen` — Registration with referral code support
- `OTPVerificationScreen` — Email OTP verification
- `ForgotPasswordScreen` — Password reset flow
- `ProfileCompletionScreen` — Post-signup profile setup
- `AuthRequiredModal` — Popup when unauthenticated user tries protected action
- `AssignedLeaderDialog` — Shows assigned team leader after signup

### Auth Methods:
```typescript
signUp(email, password, metadata?)     // Email signup
signIn(email, password)                // Email login
signInWithOtp(email)                   // Passwordless OTP
verifyOtp(email, token)                // OTP verification
signInWithGoogle()                     // Google OAuth
signInWithApple()                      // Apple OAuth
resetPassword(email)                   // Password reset
signOut()                              // Logout
```

### Role System:
- Roles stored in `user_roles` table (NOT on profiles)
- Enum: `app_role` = `admin | moderator | user`
- Checked via `has_role(user_id, role)` SECURITY DEFINER function
- `AdminGuard` / `SupportGuard` verify roles before rendering

---

## 4. CONTEXT PROVIDERS (State Management)

| Context | Purpose |
|---------|---------|
| `AuthContext` | Auth state, user session, login/logout methods |
| `AuthRequiredContext` | Trigger login modal from anywhere |
| `UserContext` | User profile, balances, country, rank |
| `LanguageContext` | i18n language selection (10 languages) |
| `P2PContext` | P2P orders, chats, marketplace state |
| `TransactionContext` | Transaction history |
| `NotificationContext` | Push/in-app notifications |
| `BannerContext` | Global success/error banner messages |
| `SupportContext` | Support ticket state |

---

## 5. DATABASE SCHEMA (Core Tables)

### Users & Auth
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (username, avatar, country, referral_code, rank, nova_balance, aura_balance) |
| `user_roles` | Role assignments (admin, moderator, user) |
| `followers` | Follow relationships between users |

### Financial
| Table | Purpose |
|-------|---------|
| `wallets` | User wallets (nova_balance, aura_balance, is_frozen) |
| `ledger_entries` | Immutable financial ledger (all balance changes) |
| `transactions` | Transaction records with receipts |
| `nova_pricing` | Country-specific Nova pricing |

### Contests
| Table | Purpose |
|-------|---------|
| `contests` | Daily contest records (date, prize_pool, stage, status) |
| `contest_entries` | User contest registrations |
| `contest_contestants` | Active contestants per contest |
| `contest_votes` | Vote records |
| `contest_results` | Final results & prizes |

### P2P Marketplace
| Table | Purpose |
|-------|---------|
| `p2p_orders` | Buy/sell orders (amount, price, status, escrow) |
| `p2p_messages` | In-order chat messages |
| `p2p_ratings` | Post-trade ratings |
| `p2p_payment_methods` | User payment methods |
| `p2p_disputes` | Dispute records |
| `p2p_dispute_files` | Dispute evidence uploads |

### Team & Referrals
| Table | Purpose |
|-------|---------|
| `team_hierarchy` | Parent-child referral tree |
| `team_stats` | Aggregated team statistics |

### Spotlight & Points
| Table | Purpose |
|-------|---------|
| `spotlight_points` | User point records |
| `spotlight_cycles` | Weekly/monthly cycles |
| `daily_lucky_winners` | Lucky draw winners |

### Chat & Messaging
| Table | Purpose |
|-------|---------|
| `direct_messages` | DM messages |
| `dm_conversations` | DM conversation threads |
| `team_messages` | Team chat messages |
| `notifications` | In-app notifications |

### Support
| Table | Purpose |
|-------|---------|
| `support_tickets` | Support tickets |
| `support_messages` | Ticket messages |
| `support_agent_ratings` | Agent rating records |

### AI (Legacy — inactive, tables retained as archive)
| Table | Purpose |
|-------|---------|
| `ai_agents` | AI agent definitions |
| `ai_chat_room` | AI discussion messages |
| `ai_core_*` | AI core system tables |
| Various `ai_*` tables | Agent lifecycle, metrics, etc. |

---

## 6. KEY RPC FUNCTIONS

| Function | Purpose |
|----------|---------|
| `join_contest(p_user_id, p_contest_id, p_entry_fee)` | Join daily contest — deducts Nova, validates KSA time window (00:00–19:00) |
| `cast_vote(p_voter_id, p_contestant_id, p_contest_id)` | Cast vote — deducts 1 Aura or 0.5 Nova |
| `execute_transfer(p_sender_id, p_recipient_id, p_amount, ...)` | Atomic Nova transfer between users |
| `p2p_create_order(...)` | Create P2P buy/sell order |
| `p2p_release_escrow(p_order_id, p_releaser_id)` | Release escrow after payment confirmed |
| `p2p_cancel_order(p_order_id, p_user_id)` | Cancel P2P order, return escrow |
| `p2p_open_dispute(p_order_id, p_user_id, p_reason)` | Open dispute on P2P order |
| `admin_adjust_balance(p_admin_id, p_target_user_id, p_currency, p_amount, p_reason)` | Admin manual balance adjustment |
| `has_role(p_user_id, p_role)` | Check user role (SECURITY DEFINER) |
| `get_or_create_dm_conversation(p_user1, p_user2)` | Find or create DM thread |

---

## 7. KEY HOOKS

| Hook | Purpose |
|------|---------|
| `useAuth` | Auth state & methods |
| `useUser` | Current user profile & balances |
| `useProfile` | Profile CRUD operations |
| `useWallet` | Wallet operations (transfer, convert) |
| `useWalletHistory` | Transaction history |
| `useP2PMarketplace` | P2P order listing & creation |
| `useP2PDatabase` | P2P database operations |
| `useP2PRatings` | P2P user ratings |
| `useContestEngagement` | Contest join/vote logic |
| `useTeamHierarchy` | Team tree navigation |
| `useTeamStats` | Team statistics |
| `useSpotlight` | Spotlight points & leaderboard |
| `useDirectMessages` | DM CRUD + realtime |
| `useTeamChat` | Team chat + realtime |
| `useNotifications` | Notification management |
| `useChatPresence` | Online/offline presence |
| `useFollows` | Follow/unfollow users |
| `useNovaPricing` | Country-specific Nova pricing |
| `useActiveUsers` | Real-time active user count |
| `useCycleProgress` | Spotlight cycle progress |

---

## 8. EDGE FUNCTIONS

### `contest-scheduler`
- **Trigger:** Cron job (pg_cron)
- **Purpose:** Automates daily contest lifecycle
- **Schedule (KSA Time):**
  - 00:00 — Create new contest for today
  - 10:00 — Start Stage 1
  - 19:00 — Close registration
  - 20:00 — Start Final Stage (top 50)
  - 22:00 — Calculate results, distribute prizes

### `p2p-auto-expire`
- **Trigger:** Cron job
- **Purpose:** Auto-cancel P2P orders that exceed time limits
- **Logic:** Returns escrowed Nova to seller if buyer doesn't pay within window

---

## 9. INTERNATIONALIZATION (i18n)

**Supported Languages (10):**
| Code | Language |
|------|----------|
| `ar` | Arabic (RTL — primary) |
| `en` | English |
| `fr` | French |
| `de` | German |
| `es` | Spanish |
| `tr` | Turkish |
| `fa` | Farsi (RTL) |
| `ur` | Urdu (RTL) |
| `nl` | Dutch |
| `it` | Italian |

**Implementation:** `react-i18next` with per-language locale files in `src/lib/i18n/locales/`

---

## 10. DESIGN SYSTEM

- **Fonts:** Cairo (Arabic), Inter (Latin), Montserrat, Poppins
- **Theme:** Light/Dark mode via CSS variables in `index.css`
- **Tokens:** HSL-based semantic tokens (`--primary`, `--background`, `--nova`, `--aura`, etc.)
- **Component Library:** shadcn/ui (50+ components in `src/components/ui/`)
- **Animations:** Framer Motion
- **Special Colors:**
  - `--nova` — Gold (#F5B301) — Nova currency
  - `--aura` — Purple (#8B5CF6) — Aura points
  - `--primary` — Pink/Magenta — Main brand accent

---

## 11. KEY FEATURES SUMMARY

### 💰 Wallet System
- Dual currency: Nova (И) = earnings, Aura (✦) = voting points
- Nova has country-specific pricing (via `nova_pricing` table)
- Transfers between users via `execute_transfer` RPC
- Wallet freeze capability (admin)
- Guard trigger prevents direct balance manipulation

### 🏆 Daily Contests
- KSA-time-aligned lifecycle (midnight → 10 PM)
- Entry fee: 10 Nova
- Stage 1: 10 AM–8 PM (voting, 1 free vote)
- Final: 8 PM–10 PM (top 50, paid votes only)
- Prize distribution: 50/20/15/10/5% to top 5

### 🤝 P2P Marketplace
- Buy/sell Nova for local currency
- Escrow-based: seller's Nova locked until confirmed
- In-order chat with dispute system
- Auto-expire for stale orders
- Rating system post-trade

### 👥 Team & Referrals
- Multi-level referral tree
- Ranks: Subscriber → Marketer → Manager → Leader → President
- Team chat per hierarchy
- Promotion tracking

### 🌟 Spotlight
- Points-based leaderboard
- Weekly/monthly cycles
- Tier ranking system
- Daily lucky winners draw

### 💬 Chat
- Direct messages (DM) with realtime
- Team chat (hierarchy-based)
- Support chat (ticket-based)
- Typing indicators, read receipts, reactions
- Message search, forwarding, reply

### 🔧 Admin Panel
- Dashboard with platform metrics
- Wallet management (add/deduct Nova)
- Role management
- P2P control tower (live market, risk engine)

### 🎧 Support Panel
- Ticket management
- P2P dispute resolution
- User lookup
- Staff performance ratings

---

## 12. SECURITY

- **RLS:** Enabled on all tables with appropriate policies
- **Wallet Guard:** Trigger blocks direct balance updates — must use RPCs with `app.bypass_wallet_guard`
- **Roles:** Stored in `user_roles` table, checked via `has_role()` SECURITY DEFINER function
- **Auth Guards:** `AuthGuard`, `SupportGuard`, `AdminGuard` components
- **No anonymous signups** — email verification required

---

## 13. EXTERNAL INTEGRATIONS

| Integration | Purpose |
|-------------|---------|
| Supabase Auth | Authentication (email, OTP, Google, Apple) |
| Supabase Database | PostgreSQL with RLS |
| Supabase Realtime | Live updates (chat, notifications, P2P) |
| Supabase Storage | File uploads (dispute evidence, avatars) |
| Supabase Edge Functions | Serverless contest/P2P automation |
| pg_cron | Scheduled database jobs |

---

## 14. PWA SUPPORT

- `manifest.json` — App manifest for installability
- `sw.js` — Service worker for offline support
- `pwaUtils.ts` — PWA installation helpers
