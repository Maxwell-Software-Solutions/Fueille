Here is the operator handoff briefing:

---

# Fueille — Operator Handoff Briefing

---

## 1. What This App Is

**Fueille** is an offline-first plant care PWA (Progressive Web App) built with Next.js 14. Users track their plants, schedule care tasks (watering, fertilizing, pruning), photograph plants, and arrange them visually on garden/room layout maps. AI identifies plants from photos. A Capacitor wrapper enables deployment as a native iOS/Android app.

Primary user flow: add a plant → set care tasks → get notified when tasks are due → log completion. Secondary flow: create a layout map, drop plant markers, use AI to identify plants in a photo of the space.

The app is **client-first**: nearly all data lives in IndexedDB (Dexie.js). The PostgreSQL + Prisma layer and GraphQL API are thin and currently only back User/Message entities — plant data does not sync to the server yet.

---

## 2. Architecture Map

```
Browser / Native App (Capacitor)
│
├── Next.js 14 App Router
│   ├── app/page.tsx              ← Home (due tasks, layouts)
│   ├── app/plants/[id]/          ← Plant detail/edit
│   ├── app/layouts/[id]/         ← Layout viewer/editor
│   ├── app/api/graphql/          ← Apollo Server endpoint
│   ├── app/api/identify-plants/  ← AI plant ID (OpenAI / Google)
│   └── app/api/ai-change-request/← Inline AI dev tool
│
├── Client-Side Data (offline-first)
│   ├── lib/domain/database.ts    ← Dexie.js (IndexedDB), v1+v2 schema
│   ├── lib/domain/repositories/  ← PlantRepo, CareTaskRepo, LayoutRepo,
│   │                                PlantMarkerRepo, PhotoRepo
│   └── lib/domain/services/      ← NotificationScheduler, MutationQueue,
│                                    DeepLinkService, TelemetryService
│
├── Server-Side Data (thin, partial)
│   ├── prisma/schema.prisma      ← PostgreSQL: User, Message only
│   └── lib/db.ts                 ← Prisma singleton
│
├── API / Transport
│   ├── lib/graphql/typeDefs.ts   ← Schema: User, Message, PlantIdentification
│   ├── lib/graphql/resolvers.ts  ← Resolvers (Prisma + AI SDK)
│   └── lib/apolloClient.ts       ← Apollo Client (HTTP to /api/graphql)
│
└── UI
    ├── components/               ← Feature components
    ├── components/ui/            ← shadcn/ui primitives
    └── components/layout/        ← LayoutEditor, LayoutViewer, MarkerIcon
```

**Data flow for plants**: all writes go to IndexedDB via Repositories → `MutationQueueService` queues sync ops → no server sync implemented yet.

---

## 3. How to Run Locally

**Prerequisites**: Node 20+, pnpm 8+, a PostgreSQL instance (or skip DB — the app works offline without it).

```bash
# 1. Install
pnpm install

# 2. Copy and fill env
cp .env.example .env
# Minimum required: DATABASE_URL, NEXTAUTH_SECRET
# For AI features: add OpenAI/Google API keys (see §4)

# 3. Set up DB (only needed for User/Message GraphQL features)
pnpm dlx prisma migrate dev

# 4. Run
pnpm dev
# → http://localhost:3000
```

**Mobile (Capacitor)**:
```bash
cp capacitor.config.ts.example capacitor.config.ts
# Edit appId if needed, then:
pnpm build
npx cap sync
npx cap open ios  # or android
```

**Run all quality gates before shipping**:
```bash
pnpm test:all   # jest + playwright + lighthouse
pnpm lint
```

---

## 4. Critical Env Vars / Secrets

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes (for server features) | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Session signing — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Auth callback base URL |
| `GITHUB_ID` / `GITHUB_SECRET` | Yes (if auth enabled) | OAuth provider |
| `NEXT_PUBLIC_GRAPHQL_URL` | Yes | Apollo Client endpoint |
| `OPENAI_API_KEY` | For AI features | Plant identification via OpenAI |
| `GOOGLE_API_KEY` or similar | For AI features | Alternate AI provider via `@ai-sdk/google` |
| `NEXT_PUBLIC_INLINE_AI` | Dev only | Enables the inline AI change-request overlay |

**Note**: `.env` is committed locally but should be in `.gitignore` for production. Confirm it is excluded before pushing to any remote.

---

## 5. Test and Quality Gates

| Gate | Tool | Threshold | Command |
|---|---|---|---|
| Type checking | TypeScript strict | Zero errors | `pnpm lint` (includes tsc) |
| Linting | ESLint | Zero errors | `pnpm lint` |
| Unit tests | Jest | 52% stmt/lines, 63% fn, 80% branch | `pnpm test:unit` |
| E2E tests | Playwright (Chromium, Firefox, WebKit) | All pass | `pnpm test:e2e` |
| Performance | Lighthouse CI | 90+ all categories | `pnpm test:perf` |
| Security | `pnpm audit` | No moderate+ vulns | Runs in CI |
| Formatting | Prettier | Auto-fixed | `pnpm format` |

**CI pipeline** (`.github/workflows/ci.yml`): lint → unit tests → E2E → Lighthouse → build → security audit. All run on push to `main`/`develop` and on PRs.

**Husky pre-commit hooks** are configured (`.husky/`) — check what hooks are active before bypassing them.

---

## 6. Top 10 Important Files

| # | File | Why |
|---|---|---|
| 1 | `lib/domain/database.ts` | Dexie schema — all offline data lives here; migrations here break everything |
| 2 | `lib/domain/entities.ts` | Canonical type definitions for every domain object |
| 3 | `lib/domain/repositories/PlantRepository.ts` | Most-used repo; mutation queue sync logic |
| 4 | `app/page.tsx` | Home page; aggregates tasks + layouts; primary user landing |
| 5 | `app/layout.tsx` | Root layout; global providers, PWA metadata, service worker bootstrap |
| 6 | `lib/graphql/typeDefs.ts` + `resolvers.ts` | Server API contract; AI plant ID mutations |
| 7 | `next.config.js` | CSP headers, security config, build options |
| 8 | `.github/workflows/ci.yml` | Entire automated quality pipeline |
| 9 | `prisma/schema.prisma` | Server DB schema (thin but needed for User/auth) |
| 10 | `playwright.config.ts` | E2E test setup; browser matrix and CI retry config |

---

## 7. Known Risks / Gaps

1. **No server-side sync for plant data.** `MutationQueueService` exists but plant/task/layout data never reaches PostgreSQL. If a user clears browser storage or switches devices, all data is lost. This is the biggest product risk.

2. **Coverage thresholds were silently lowered.** `jest.config.ts` comments say 95% was the original target; it was reduced to 52-63% to "accommodate complexity." Several critical paths (GraphQL resolvers, IndexedDB layer, plant identification service) are explicitly excluded from coverage.

3. **`.env` may be committed.** The local `.env` file exists in the repo root. Verify `.gitignore` excludes it and audit git history for secret exposure.

4. **Auth is wired up but not enforced.** NextAuth + GitHub OAuth is configured, but there's no route protection visible — plants and layouts appear to be accessible without login.

5. **AI provider keys have no fallback handling.** `plantIdentificationService.ts` calls OpenAI/Google; if either key is absent or rate-limited, error handling is not confirmed to be graceful.

6. **Capacitor config is example-only.** `capacitor.config.ts` is gitignored (only `.example` is committed). Any mobile CI/CD pipeline needs this file and it must be managed outside git (secrets manager or CI env).

7. **Lighthouse CI requires a production build + server start.** The `test:perf` step is slow and will fail in environments without a build artifact — it's not suitable as a pre-commit gate.

8. **Auto-approve Copilot PR workflow** (`auto-approve-copilot-prs.yml`) auto-merges AI-generated PRs. This is a supply-chain risk if the Copilot account is compromised or produces a malicious PR.

9. **IndexedDB schema migrations are manual.** Dexie uses version numbers; bumping the schema version without a migration function causes silent data loss for existing users.

10. **No error monitoring / observability.** `TelemetryService.ts` exists but there's no Sentry, Datadog, or equivalent wired up. Production failures are invisible without log aggregation.

---

## 8. Suggested First Improvements for Reliability

**Immediate (low effort, high impact):**

1. **Audit `.gitignore` and git history for secrets** — confirm `.env` is excluded, rotate any keys that may have been committed. Run `git log --all --full-history -- .env`.

2. **Disable or gate the auto-approve Copilot PR workflow** — require at least one human review before merge. Edit `.github/workflows/auto-approve-copilot-prs.yml`.

3. **Add error monitoring** — wire Sentry (or equivalent) into `components/ErrorBoundary.tsx` and `app/api/` routes. One `SENTRY_DSN` env var and `@sentry/nextjs` gets you crash visibility immediately.

**Near-term (medium effort, eliminates data loss risk):**

4. **Implement server sync for plant data** — extend `prisma/schema.prisma` to include `Plant`, `CareTask`, `Layout`, and `PlantMarker` tables; wire `MutationQueueService` to flush queued ops to the GraphQL API on reconnect.

5. **Add Dexie migration guards** — every schema version bump in `lib/domain/database.ts` must have an explicit `upgrade()` function; add a test that seeds v1 data and confirms it survives a v2 migration.

6. **Restore meaningful coverage thresholds** — re-enable coverage for `lib/domain/services/` and `app/api/` routes; target 70%+ statements. The current exclusions hide untested critical paths.

**Longer-term (architecture hygiene):**

7. **Add route protection middleware** — create `middleware.ts` at the root to enforce auth on `/plants` and `/layouts` using NextAuth session checks.

8. **Centralize AI provider configuration** — create a single `lib/ai.ts` that selects the provider based on available keys and provides a unified retry/fallback interface, rather than having provider logic scattered in `plantIdentificationService.ts`.

9. **Add a health-check endpoint** (`app/api/health/route.ts`) that checks DB connectivity and returns 200/500 — needed for any load balancer or uptime monitoring.

10. **Replace the inline AI dev tool guard** — `NEXT_PUBLIC_INLINE_AI` is a public env var; anyone can enable it by setting it. Move the feature behind a server-validated flag or remove it from production builds entirely via a build-time constant.
