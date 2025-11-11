# Fueille - Development & Deployment Runbook

**Version**: 1.0.0  
**Last Updated**: November 11, 2025  
**Target Audience**: Developers, DevOps, Release Managers

---

## 📋 Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Testing](#testing)
5. [Building](#building)
6. [Mobile Development](#mobile-development)
7. [Deployment](#deployment)
8. [CI/CD](#cicd)
9. [Release Process](#release-process)
10. [Troubleshooting](#troubleshooting)
11. [Environment Variables](#environment-variables)

---

## 🚀 Local Development Setup

### Prerequisites

- **Node.js**: v20.x or later
- **pnpm**: v8.x or later
- **Git**: Latest version
- **VS Code**: Recommended (with extensions)

**Optional (for mobile)**:

- **Android Studio**: Latest (for Android development)
- **Xcode**: 15+ (for iOS development, macOS only)
- **Capacitor CLI**: `pnpm add -g @capacitor/cli`

### Initial Setup

```powershell
# Clone repository
git clone https://github.com/Maxwell-Software-Solutions/Fueille.git
cd Fueille

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Generate Prisma client
pnpm prisma generate

# Start dev server
pnpm dev
```

**Expected Output**:

```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Environments: .env

✓ Ready in 2.5s
```

### VS Code Setup

**Recommended Extensions** (`.vscode/extensions.json`):

- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
- Prisma (`Prisma.prisma`)
- Jest (`Orta.vscode-jest`)

**Settings** (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## 📁 Project Structure

```
Fueille/
├── app/                      # Next.js 14 App Router
│   ├── layout.tsx            # Root layout with providers
│   ├── page.tsx              # Home page with task list
│   ├── globals.css           # Global styles + neumorphic design
│   ├── api/                  # API routes
│   │   └── graphql/          # GraphQL endpoint
│   └── plants/               # Plant pages
│       ├── page.tsx          # Plant list
│       ├── new/page.tsx      # Add plant
│       └── [id]/page.tsx     # Plant detail
│
├── components/               # React components
│   ├── ui/                   # shadcn/ui components
│   │   ├── button.tsx
│   │   └── card.tsx
│   ├── OfflineIndicator.tsx  # Network status banner
│   ├── ErrorBoundary.tsx     # Global error handler
│   └── PremiumSection.tsx    # Coming soon features
│
├── lib/                      # Utilities and domain logic
│   ├── domain/               # Domain layer (DDD)
│   │   ├── entities.ts       # TypeScript types
│   │   ├── database.ts       # IndexedDB wrapper
│   │   ├── repositories/     # Data access layer
│   │   │   ├── PlantRepository.ts
│   │   │   ├── CareTaskRepository.ts
│   │   │   └── PhotoRepository.ts
│   │   └── services/         # Business logic
│   │       ├── MutationQueueService.ts
│   │       ├── NotificationScheduler.ts
│   │       ├── DeepLinkService.ts
│   │       └── TelemetryService.ts
│   ├── graphql/              # GraphQL schema & resolvers
│   ├── apolloClient.ts       # Apollo Client setup
│   └── utils.ts              # Utilities (cn, etc.)
│
├── mobile-wrapper/           # Native bridge
│   ├── nativeBridge.ts       # Provider-agnostic interface
│   └── README.md             # Mobile integration guide
│
├── prisma/                   # Prisma ORM (unused but kept)
│   └── schema.prisma         # Database schema reference
│
├── public/                   # Static assets
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker
│   └── icons/                # App icons
│
├── tests/                    # E2E tests
│   └── e2e/
│       └── home.spec.ts      # Playwright tests
│
├── docs/                     # Documentation
│   ├── MILESTONE-*.md        # Milestone completion reports
│   └── RUNBOOK.md            # This file
│
├── .github/                  # GitHub config
│   └── workflows/            # CI/CD pipelines
│
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript config
├── next.config.js            # Next.js config
├── tailwind.config.ts        # Tailwind CSS config
├── jest.config.ts            # Jest config
├── playwright.config.ts      # Playwright config
└── pnpm-lock.yaml            # Lockfile (DO NOT EDIT MANUALLY)
```

### Key Architectural Patterns

1. **Offline-First**: IndexedDB → Repositories → Components
2. **GraphQL API**: Optional sync layer (future)
3. **Domain-Driven Design**: Entities, Repositories, Services
4. **Component-Driven**: Atomic design with shadcn/ui
5. **Test-Driven**: Jest (unit) + Playwright (E2E)

---

## 🔄 Development Workflow

### Daily Development

```powershell
# Start dev server
pnpm dev

# Run tests in watch mode
pnpm test:unit:watch

# Type-check in watch mode
pnpm type-check --watch

# Format code
pnpm format
```

### Code Generation

**Use Plop generators** (enforced for consistency):

```powershell
# Generate component + test
pnpm generate:component
# Prompts: Name, Type (server/client)
# Creates: components/YourComponent.tsx + YourComponent.test.tsx

# Generate API route + test
pnpm generate:api
# Creates: app/api/your-route/route.ts + route.test.ts

# Generate GraphQL resolver + test
pnpm generate:resolver
# Creates: lib/graphql/resolvers/yourResolver.ts + test

# Generate E2E test
pnpm generate:e2e
# Creates: tests/e2e/your-test.spec.ts
```

### Branch Strategy

```
main          # Production-ready code
  ├── develop # Integration branch
  │   ├── feature/add-plant-sharing
  │   ├── fix/notification-crash
  │   └── chore/update-deps
```

**Commit Message Format** (Conventional Commits):

```
feat: add plant sharing feature
fix: resolve notification crash on iOS
docs: update installation guide
chore: bump dependencies
test: add E2E tests for task completion
```

### Pull Request Checklist

- [ ] All tests pass (`pnpm test:all`)
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Code formatted (`pnpm format`)
- [ ] New features have tests (85%+ coverage)
- [ ] Documentation updated (if needed)
- [ ] Reviewed by at least 1 person

---

## 🧪 Testing

### Unit Tests (Jest + React Testing Library)

```powershell
# Run all tests
pnpm test:unit

# Run with coverage
pnpm test:unit --coverage

# Run specific test file
pnpm test:unit PlantRepository.test.ts

# Watch mode (TDD)
pnpm test:unit:watch

# Update snapshots
pnpm test:unit -u
```

**Coverage Thresholds** (enforced in CI):

- Statements: 85%
- Branches: 85%
- Functions: 85%
- Lines: 85%

**Excluded from Coverage**:

- `components/Providers.tsx`
- `lib/apolloClient.ts`
- Test files (`*.test.ts`, `*.spec.ts`)

### E2E Tests (Playwright)

```powershell
# Run all E2E tests (headless)
pnpm test:e2e

# Run with UI (debug mode)
pnpm test:e2e:ui

# Run specific test
pnpm test:e2e home.spec.ts

# Run on specific browser
pnpm test:e2e --project=chromium
```

**Browsers Tested**:

- Chromium (desktop)
- Firefox (desktop)
- WebKit (Safari)

### Performance Tests (Lighthouse CI)

```powershell
# Run Lighthouse audit
pnpm test:perf
```

**Thresholds**:

- Performance: ≥ 90
- Accessibility: ≥ 90
- Best Practices: ≥ 90
- SEO: ≥ 90
- FCP: < 2s
- LCP: < 2.5s
- CLS: < 0.1

### Integration Testing

```powershell
# Run all tests (unit + E2E + perf)
pnpm test:all
```

---

## 🏗️ Building

### Web Build

```powershell
# Development build
pnpm build

# Production build with optimizations
pnpm build
pnpm start  # Test production server locally

# Static export (for hosting)
pnpm build
pnpm next export  # Creates 'out/' directory
```

**Build Artifacts**:

- `.next/` - Next.js build output
- `out/` - Static HTML/CSS/JS (after export)

**Build Process**:

1. Prisma client generation
2. TypeScript compilation
3. Next.js optimization (SWC)
4. Bundle splitting
5. Image optimization
6. Security header injection

### Build Troubleshooting

**Issue**: `Cannot find module '@prisma/client'`

```powershell
# Solution
pnpm prisma generate
pnpm build
```

**Issue**: Out of memory during build

```powershell
# Solution: Increase Node heap size
$env:NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

**Issue**: Hydration errors in production

```powershell
# Solution: Use suppressHydrationWarning or ensure SSR compatibility
# Check app/page.tsx for examples
```

---

## 📱 Mobile Development

### Setup Capacitor

```powershell
# Add Capacitor
pnpm add -D @capacitor/cli @capacitor/core @capacitor/camera @capacitor/local-notifications

# Initialize (one-time)
pnpm cap init "Fueille" "com.fueille.app" --web-dir=out

# Add platforms
pnpm cap add android
pnpm cap add ios
```

### Android Development

**Prerequisites**:

- Android Studio installed
- Android SDK 33+ installed
- Java 17+ installed

**Workflow**:

```powershell
# Build web assets
pnpm build
pnpm next export

# Sync to native project
pnpm cap sync android

# Open in Android Studio
pnpm cap open android

# Or build via CLI
cd android
./gradlew assembleDebug

# Install on device
adb install app/build/outputs/apk/debug/app-debug.apk
```

**Testing**:

```powershell
# Run on emulator
cd android
./gradlew installDebug
adb shell am start -n com.fueille.app/.MainActivity

# View logs
adb logcat | grep -i fueille
```

### iOS Development

**Prerequisites**:

- macOS required
- Xcode 15+ installed
- CocoaPods installed (`gem install cocoapods`)
- Apple Developer account (for device testing)

**Workflow**:

```powershell
# Build web assets
pnpm build
pnpm next export

# Sync to native project
pnpm cap sync ios

# Install pods
cd ios/App
pod install

# Open in Xcode
pnpm cap open ios

# Or build via CLI
xcodebuild -workspace App.xcworkspace \
           -scheme App \
           -configuration Debug \
           build
```

**Testing**:

```bash
# Run on simulator
open -a Simulator
xcrun simctl boot "iPhone 15"
xcrun simctl install booted ios/App/build/Debug-iphonesimulator/App.app
xcrun simctl launch booted com.fueille.app
```

### Native Bridge Implementation

**Example**: Camera integration

```typescript
// In mobile-wrapper/nativeBridge.ts
import { Camera, CameraResultType } from '@capacitor/camera';

window.NativePlantBridge = {
  async takePhoto() {
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
      });
      return { uri: photo.dataUrl };
    } catch (error) {
      return { canceled: true };
    }
  },
  // ... other methods
};
```

---

## 🚀 Deployment

### Web Deployment

#### Vercel (Recommended)

```powershell
# Install Vercel CLI
pnpm add -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Vercel Configuration** (`vercel.json`):

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_GRAPHQL_URL": "https://fueille.vercel.app/api/graphql"
  }
}
```

#### Netlify

```powershell
# Install Netlify CLI
pnpm add -g netlify-cli

# Deploy
netlify deploy --prod
```

**Netlify Configuration** (`netlify.toml`):

```toml
[build]
  command = "pnpm build && pnpm next export"
  publish = "out"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Cloudflare Pages

```powershell
# Via Wrangler CLI
pnpm add -g wrangler

# Deploy
wrangler pages publish out
```

### Mobile Deployment

#### Google Play (Android)

```powershell
# Build release bundle
cd android
./gradlew bundleRelease

# Upload to Play Console
# Manual: https://play.google.com/console
# Or via Fastlane:
fastlane supply --aab app/build/outputs/bundle/release/app-release.aab
```

**Tracks**:

- Internal: < 100 testers, instant publishing
- Closed: Up to 100 testers, review required
- Open: Unlimited testers, review required
- Production: Public, phased rollout

#### Apple App Store (iOS)

```powershell
# Build and upload via Fastlane
cd ios
fastlane beta

# Or manual via Xcode:
# Product → Archive → Distribute App → App Store Connect
```

**TestFlight**:

- Internal Testing: Up to 100 testers
- External Testing: Unlimited, review required

---

## ⚙️ CI/CD

### GitHub Actions

**Workflow Files** (`.github/workflows/`):

1. **ci.yml** - Run on all PRs
   - Lint, type-check, test
   - Build verification
   - Coverage reporting

2. **deploy-web.yml** - Deploy on merge to main
   - Build and deploy to Vercel/Netlify
   - Run smoke tests

3. **deploy-mobile.yml** - Deploy on release tags
   - Build Android APK/AAB
   - Build iOS archive
   - Upload to internal tracks

### Secrets Configuration

**GitHub Repository Settings → Secrets**:

**Web**:

- `VERCEL_TOKEN` - Vercel API token

**Android**:

- `ANDROID_KEYSTORE` - Base64 encoded keystore
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

**iOS**:

- `APPLE_ID`
- `APPLE_TEAM_ID`
- `MATCH_PASSWORD`
- `APP_STORE_CONNECT_API_KEY`

### Running CI Locally

```powershell
# Using Act (GitHub Actions simulator)
choco install act-cli

# Run CI workflow
act push

# Run specific job
act push -j test
```

---

## 📦 Release Process

### 1. Version Bump

```powershell
# Choose version type
pnpm version:patch  # 1.0.0 → 1.0.1 (bug fixes)
pnpm version:minor  # 1.0.1 → 1.1.0 (new features)
pnpm version:major  # 1.1.0 → 2.0.0 (breaking changes)
```

**Updates**:

- `package.json` version
- Creates git tag
- Updates `package-lock.json` / `pnpm-lock.yaml`

### 2. Generate Changelog

```powershell
# Auto-generate from commits
pnpm changelog

# Review and edit CHANGELOG.md
code CHANGELOG.md
```

### 3. Create Release

```powershell
# Push tags
git push --follow-tags

# Create GitHub release
gh release create v1.1.0 \
  --title "Release v1.1.0" \
  --notes-file CHANGELOG.md
```

### 4. Deploy

**Web**: Automatically deployed via CI on tag push

**Mobile**:

```powershell
# Android
cd android
fastlane internal  # Internal track
fastlane beta      # Closed beta
fastlane production  # Production (phased)

# iOS
cd ios
fastlane beta          # TestFlight
fastlane release       # App Store submission
```

### 5. Post-Release

- [ ] Monitor crash reports (Firebase, Sentry)
- [ ] Check user reviews and feedback
- [ ] Respond to issues within 24h
- [ ] Plan next sprint based on feedback

---

## 🔧 Troubleshooting

### Common Issues

#### Issue: `pnpm install` fails

**Error**: `ERR_PNPM_UNSUPPORTED_ENGINE`

**Solution**:

```powershell
# Update Node.js to v20+
nvm install 20
nvm use 20

# Update pnpm
pnpm add -g pnpm@latest
```

#### Issue: Build fails with memory error

**Solution**:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

#### Issue: IndexedDB not working

**Symptoms**: Plants not saving, tasks disappearing

**Solution**:

1. Check browser console for quota errors
2. Clear browser data and retry
3. Check IndexedDB storage in DevTools → Application

#### Issue: Notifications not showing

**Checklist**:

1. Permission granted? (`notificationScheduler.getPermission()`)
2. Service worker registered? (DevTools → Application → Service Workers)
3. Task has valid `dueAt` timestamp?
4. Browser supports notifications? (Chrome/Firefox/Edge yes, Safari limited)

#### Issue: Dark mode not working

**Solution**:

```powershell
# Check theme toggle component
# Ensure html tag has 'dark' class

# In DevTools console:
document.documentElement.classList.toggle('dark')
```

#### Issue: Hot reload not working

**Solution**:

```powershell
# Clear Next.js cache
rm -rf .next
pnpm dev
```

### Debug Mode

**Enable verbose logging**:

```powershell
$env:DEBUG="*"
$env:NODE_ENV="development"
pnpm dev
```

**Check database**:

```typescript
// In browser console
const db = await window.indexedDB.open('plant-care-db', 1);
// Inspect tables in DevTools → Application → IndexedDB
```

---

## 🔐 Environment Variables

### `.env` File

```bash
# Development (optional, has defaults)
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_GRAPHQL_URL="http://localhost:3000/api/graphql"

# Features
NEXT_PUBLIC_INLINE_AI="0"  # Set to "1" to enable AI inline editor

# Telemetry (future)
NEXT_PUBLIC_MIXPANEL_TOKEN=""
NEXT_PUBLIC_SENTRY_DSN=""

# Mobile (Capacitor)
CAPACITOR_SERVER_URL="http://192.168.1.100:3000"  # For testing on device
```

### Production Environment

**Web (Vercel/Netlify)**:

```bash
NEXT_PUBLIC_GRAPHQL_URL="https://fueille.app/api/graphql"
NODE_ENV="production"
```

**Mobile (Build time)**:

```bash
CAPACITOR_SERVER_URL=""  # Empty for production (uses packaged assets)
```

---

## 📚 Additional Resources

- **Architecture**: See `.ai-context/project-structure.md`
- **Testing Guide**: See `docs/LOCAL-TESTING-GUIDE.md`
- **Milestone Reports**: See `docs/MILESTONE-*.md`
- **Contributing**: See `.github/CONTRIBUTING.md` (if exists)

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Maxwell-Software-Solutions/Fueille/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Maxwell-Software-Solutions/Fueille/discussions)
- **Email**: support@fueille.app

---

**Last Updated**: November 11, 2025  
**Maintainer**: Maxwell Software Solutions  
**Version**: 1.0.0
