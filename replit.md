# Plexus Clinical Dashboard

## Overview

A comprehensive Clinical Prescreen Management Dashboard (EMR-like interface) for a company that orders ancillaries at clinics. The application provides multi-view dashboards including patient search, eligibility tracking, outreach management, and billing. Features a consistent dark/teal aesthetic (liquid glass dark theme with slate-900 backgrounds and teal accents). Connects to an external Google Apps Script API (Plexus) for all data operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## Design System

### Dual Theme Support (Epic EMR-Style)
- **Theme Toggle**: Sun/moon icon in header, persists to localStorage
- **Pattern**: Dark headers/navigation remain slate-900 with teal accents in both modes; content areas switch between dark and light backgrounds

### Visual Theme
- **Color Palette**: Dual-theme EMR design
  - **Dark Mode**: slate-900/800 backgrounds, light text, glass card effects
  - **Light Mode**: White/light gray backgrounds, dark text for clinical readability
  - **Accents**: teal-400/500 (primary), violet-400/500 (AI/analysis), cyan-400 (ultrasound), rose-400 (vitalwave), amber-400 (warnings)
- **Typography**: Inter font family
- **Border Radius**: rounded-2xl for cards, rounded-xl for inputs/buttons
- **Shadows**: Subtle shadows with shadow-xl for glass cards

### Semantic Token Pattern
Use semantic tokens + dark: variants for theme-aware styling:
- Backgrounds: `bg-background`, `bg-card`, `bg-muted` + `dark:bg-slate-*` variants
- Text: `text-foreground`, `text-muted-foreground`
- Borders: `border-border`

### Status/Priority Badges
Use light-mode variants for accessibility:
- Pattern: `bg-{color}-500/20 text-{color}-700 dark:text-{color}-300 border-{color}-500/30`

### Icon Colors
Pattern: `text-{color}-600 dark:text-{color}-400` for visibility in both modes

### Glass Card Pattern (Dark Mode Only)
`bg-card border border-border shadow-xl dark:backdrop-blur-xl dark:bg-gradient-to-br dark:from-slate-800/90 dark:via-slate-850/85 dark:to-slate-900/90 dark:border-slate-700/50`

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Shadcn/UI component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme design tokens
- **Build Tool**: Vite with React plugin
- **Charts**: Recharts for data visualization

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: Express acts as a proxy/gateway to the external Plexus API
- **Validation**: Zod schemas for request validation
- **AI Integration**: OpenAI via Replit AI Integrations (gpt-4o-mini)

### Data Flow
1. Frontend makes requests to Express backend (`/api/*` routes)
2. Backend validates requests using Zod schemas
3. Backend forwards requests to external Plexus Google Apps Script API
4. Responses flow back through the same path
5. Local in-memory storage for patient profiles, outreach queue

## Multi-View Dashboard Architecture

### Views & Navigation
| View | Route | Purpose |
|------|-------|---------|
| Home | `home` | Dashboard overview with quick navigation tiles and recent activity |
| Schedule | `schedule` | Clinic schedule with patient appointment list |
| Prescreens | `prescreens` | Three-panel prescreen management interface |
| Patient Database | `patients` | EMR hub with search, demographics, medical history, AI recommendations |
| Outreach Center | `outreach` | Remote team call queue with timer tracking and outcome logging |
| Eligibility Tracker | `eligibility` | Patients due for re-testing based on cooldown rules |
| Billing | `billing` | Billing records, charts, invoice management |
| Ancillary Tracker | `ancillary` | Per-service patient tracking |
| Finance | `finance` | Financial overview with revenue charts |

### Key Features per View

**Patient Database (EMR Hub)**
- Left panel: Patient search with debounced query, recent patients list
- Right panel: Demographics banner (name, MRN, DOB, age, status)
- Contact/Address/Insurance grid
- Editable Medical History & Medications sections
- AI-powered ancillary recommendations with qualification reasoning
- Quick Order buttons for common ancillary services
- Mobile-responsive with adaptive layouts

**Outreach Center**
- Call queue with priority sorting
- Active call timer (TimeDock-optimized)
- Patient details panel with contact info
- Quick call scripts
- Outcome logging (connected, voicemail, callback, no answer)
- Recent calls history

**Eligibility Tracker**
- Patients approaching or past eligibility windows
- Service type filtering (BrainWave, VitalWave, Ultrasound)
- Status filtering (Overdue, Due Soon, Eligible)
- Date range filtering (Last 30 Days, Last 6 Months, Last Year, All Time)
- Cooldown-based calculations per payor type

**Billing Dashboard**
- Records table with dynamic columns from API
- Service type tabs for filtering
- Date range and clinician filters
- Revenue analytics with charts
- Invoice creation dialog
- External links to documents

## AI-Powered Features

### Ancillary Recommendations (Patient Database)
- Uses OpenAI gpt-4o-mini via Replit AI Integrations
- Aggressive qualification logic to maximize patient eligibility
- Analyzes patient demographics, insurance, and medical history
- Returns recommendations with qualification scores and reasoning
- Fallback to deterministic logic when AI unavailable

### Cooldown Logic
- **PPO Insurance**: 6 months (180 days)
- **Medicare**: 12 months (365 days)
- **PGX Testing**: Once-only (lifetime)
- **Steroid Injection**: No cooldown limit

### 17 Ancillary Services Supported
BRAINWAVE, VITALWAVE, ULTRASOUND, PGX, CGX, PULSEWAVE, TM_FLOW, FUNCTIONAL_MEDICINE, CARDIAC_CT, DEXA_BODY_COMP, VASCULAR_ULTRASOUND, ECHO, EKG, STRESS_TEST, SLEEP_STUDY, ALLERGY_TESTING, HORMONE_PANEL

## External Dependencies

### External APIs
- **Plexus API**: Google Apps Script Web App for patient and prescreen data
  - Base URL configured in `server/routes.ts`
  - API key stored in `PLEXUS_API_KEY` environment variable
  - Supports patient search, prescreen CRUD, billing data

### Database
- **PostgreSQL**: Configured via Drizzle ORM (schema in `shared/schema.ts`)
  - Requires `DATABASE_URL` environment variable
  - Currently used for potential session storage
  - Core app data comes from external Plexus API

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `express`: HTTP server framework
- `zod`: Runtime type validation
- `@radix-ui/*`: Accessible UI primitives
- `tailwindcss`: Utility-first CSS framework
- `recharts`: Data visualization
- `openai`: AI integration

## Performance & Safety Architecture

### Rate Limiting (safeFetch wrapper)
- **Location**: `client/src/lib/safeFetch.ts`
- **Max Concurrent Requests**: 1 (ultra-conservative)
- **Min Request Interval**: 3 seconds between requests
- **Retry Strategy**: Exponential backoff (3s, 6s) with max 1 retry
- **Auth Error Handling**: Immediate failure on 401/403 (no retry)

### Caching Strategy
- **Dual-layer cache**: In-memory + localStorage
- **Patient/Billing Lists**: 15 minute TTL
- **Detail Views**: 10 minute TTL
- **Catalog Data**: 30 minute TTL
- **Cache Key Format**: Query keys match exact URL strings for proper invalidation

### Data Transfer Limits
- **Home Dashboard**: 50 records max
- **Billing View**: 100 records max
- **Ancillary Patients**: 50 records max per service
- **Manual refresh only**: No automatic polling (refetchInterval disabled)

### Why These Limits
Google Apps Script has strict quotas and the responses contain large payloads (many URL fields). Aggressive rate limiting prevents platform blocks.

## Mobile Optimization

### Responsive Design
- Single column layouts on mobile devices
- Touch-friendly targets (min 44px)
- Mobile-specific navigation with back buttons
- Adaptive card layouts
- Condensed views for smaller screens

### Future Enhancements
- Bottom navigation bar for primary actions
- Swipe gestures for navigation
- Quick call button always accessible
- Optimized for 40+ concurrent users

## File Structure

```
client/src/
├── pages/
│   ├── HomeDashboard.tsx      # Main dashboard with navigation tiles
│   ├── PatientDatabaseView.tsx # EMR hub with AI recommendations
│   ├── OutreachCenter.tsx     # Call queue and management
│   ├── EligibilityTracker.tsx # Eligibility tracking with filters
│   ├── BillingView.tsx        # Billing management
│   └── ...
├── components/
│   ├── ui/                    # Shadcn components
│   └── service-icons.tsx      # Custom service icons
├── lib/
│   ├── queryClient.ts         # React Query configuration
│   └── safeFetch.ts           # Rate-limited fetch wrapper
server/
├── routes.ts                  # API routes and Plexus proxy
├── aiAnalysis.ts             # AI analysis logic
└── storage.ts                # In-memory storage
shared/
├── schema.ts                 # Database schema and types
└── ancillaryCatalog.ts       # Service definitions
```

## Recent Changes

- 2026-01-28: Implemented comprehensive dual-theme (light/dark) support across all major views
- 2026-01-28: Added ThemeToggle component with localStorage persistence
- 2026-01-28: Converted hardcoded dark colors to semantic tokens with dark: variants
- 2026-01-28: Updated status/priority badges with light-mode variants for accessibility
- 2026-01-28: Added notification system with workflow triggers (prescreen created -> outreach queue, report/service -> billing)
- 2026-01-28: Implemented mobile bottom navigation with 5 key tabs and floating quick call button
- 2026-01-28: Connected OutreachCenter and EligibilityTracker patient navigation to main EMR profile
