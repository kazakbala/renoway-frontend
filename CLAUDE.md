# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on port 8080
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # ESLint validation
npm run preview    # Preview production build
```

No test suite is configured.

## Architecture

**Renoway** is a React + TypeScript SaaS for interior renovation cost calculation, targeting renovation companies. It uses a pure client-side architecture with direct Supabase integration — there is no custom backend or API layer.

### Stack
- **React 19 + Vite + TypeScript** with SWC compiler
- **Supabase** — auth, PostgreSQL database, auto-generated types in `src/integrations/supabase/types.ts`
- **TanStack React Query 5** — all server state, caching, and invalidation
- **shadcn/ui** (Radix UI + Tailwind CSS) — 40+ UI primitives in `src/components/ui/`
- **react-hook-form + zod** — forms and validation
- **@dnd-kit** — drag-and-drop for categories, tabs, timeline items
- **jspdf + jspdf-autotable** — PDF quote generation from projects
- **react-quill** — rich text for work descriptions
- **@react-google-maps/api** — meeting location mapping

### Multi-tenant data model
Every main table has a `tenant_id` column. Tenants represent companies; users belong to a tenant via the `profiles` table. All Supabase queries must filter by `tenant_id` from the authenticated user's profile.

### Core domain entities
- **works** + **categories** — renovation tasks with prices, units, and room type associations
- **projects** — quote documents linked to a client; contain rooms, works, materials, and a timeline
- **project_rooms** — rooms within a project (with floor/wall area for automatic quantity calculation)
- **project_room_works** — many-to-many linking works to rooms
- **clients**, **meetings**, **materials**, **team (profiles + invitations)**

### Key pages
- **`src/pages/ProjectForm.tsx`** (~1927 lines) — the most complex page; handles multi-tab project creation with dynamic room management, nested work selection, price calculation (multiplier/discount), timeline drag-sort, material selection, and PDF export
- **`src/pages/Works.tsx`** (~1110 lines) — category and work CRUD with drag-sort, CSV import/export, room type associations, and accordion UI
- All other pages are standard CRUD tables with modal dialogs (~230–350 lines each)

### Auth
- Supabase JWT auth via `src/contexts/AuthContext.tsx`
- `useAuth()` hook exposes `user`, `session`, `profile` (includes `tenant_id`)
- `ProtectedRoute` wrapper in `App.tsx` guards all authenticated routes

### Path alias
`@/*` resolves to `src/*` (configured in `tsconfig.app.json` and `vite.config.ts`).

### Design system
CSS HSL variables in `src/index.css` define the color palette (primary: blue, accent: orange). Dark mode is supported via Tailwind's `dark:` prefix. Tailwind config extends with sidebar-specific color tokens.

### Supabase query pattern
```typescript
const { data } = await supabase
  .from("table_name")
  .select("*, related_table(*)")
  .eq("tenant_id", profile.tenant_id)
  .order("created_at", { ascending: false });
```

### Environment variables
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

Database migrations live in `supabase/migrations/`.
