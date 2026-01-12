# Plexus Clinical Dashboard

## Overview

A clinical prescreen management dashboard for patient eligibility and scheduling. The application provides a three-panel interface for searching patients, viewing their prescreens, and editing prescreen details. It connects to an external Google Apps Script API (Plexus) for all data operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Shadcn/UI component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens, supporting light/dark themes
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: Express acts as a proxy/gateway to the external Plexus API
- **Validation**: Zod schemas for request validation

### Data Flow
1. Frontend makes requests to Express backend (`/api/*` routes)
2. Backend validates requests using Zod schemas
3. Backend forwards requests to external Plexus Google Apps Script API
4. Responses flow back through the same path

### Key Design Decisions

**External API Gateway Pattern**
- All data lives in the external Plexus API (Google Apps Script)
- Express server acts as a secure proxy, hiding API keys from client
- No local database required for core functionality

**Three-Panel Dashboard Layout**
- Left panel: Patient search with debounced input
- Middle panel: Prescreen list for selected patient
- Right panel: Prescreen detail editor

**Design System**
- Follows Linear/Vercel-inspired modern aesthetic (see `design_guidelines.md`)
- Inter font family for clean readability
- Sophisticated minimalism with precise spacing and subtle shadows

## External Dependencies

### External APIs
- **Plexus API**: Google Apps Script Web App for patient and prescreen data
  - Base URL configured in `server/routes.ts`
  - API key stored in `PLEXUS_API_KEY` environment variable
  - Supports patient search, prescreen CRUD operations

### Database
- **PostgreSQL**: Configured via Drizzle ORM (schema in `shared/schema.ts`)
  - Requires `DATABASE_URL` environment variable
  - Currently used for potential session storage (connect-pg-simple)
  - Core app data comes from external Plexus API

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `express`: HTTP server framework
- `zod`: Runtime type validation
- `@radix-ui/*`: Accessible UI primitives
- `tailwindcss`: Utility-first CSS framework