# Design — Phase 4a: App Shell + Dashboard + CRUD

> Second of Phase 4's four sub-projects (4d icon tool shipped first). 4a turns speclr from "a placeholder home page + one tool" into a real admin app: a persistent shell, the documents dashboard, and full CRUD for clients, employees, and services — all wired to the Server Actions already built in Phase 3. It establishes the design language (nav, shadcn look, form pattern) that 4b (sheets) and 4c (editors) inherit.

## What this is

The chrome and data-management surfaces of the admin tool, rebuilt in shadcn + Tailwind. The entire backend (Server Actions + Postgres store) already exists and is tested — 4a is UI that reads via the store and writes via the actions. No new domain logic, no new server actions.

## Scope

**In scope:**
- `(admin)` route-group shared layout (shell): persistent left sidebar + main content area, dark, `noindex`, auth-gated for nav visibility (each page/action still self-guards).
- Dashboard at `/` — documents table (newest first).
- CRUD surfaces: `/clients`, `/employees`, `/services` — each a table + create/edit form (in a Sheet) + delete (where the action exists).
- Friendly placeholder pages for `/docs/[id]` and `/docs/new/[type]` so nav never 404s (replaced by 4b/4c).
- Full test coverage; a11y; verification incl. live-DB manual pass.

**Out of scope (later sub-projects):** document sheets/preview/print (4b), the new/edit document editors + finalize UI (4c). 4a only *links* to those; it does not build them.

## Locked decisions

- **Form pattern: shadcn `Form`** (react-hook-form + `@hookform/resolvers/zod`), validating with the existing domain schemas (`clientInputSchema`, etc.). This is the convention for ALL forms including 4b/4c editors. Set `z.config({ jitless: true })` centrally — production CSP forbids eval, so zod must not JIT.
- **Navigation: persistent left sidebar** (shadcn `sidebar` primitive), collapsing to a `Sheet` on mobile.
- **CRUD layout: Table + Sheet + AlertDialog** — the table is the primary surface; Add/Edit open the form in a slide-out `Sheet`; Delete confirms in an `AlertDialog`.
- **Dangling links: render them + add friendly placeholders** at `/docs/[id]` and `/docs/new/[type]` ("Coming in the next phase") so the shell feels complete.

## Route structure

```
src/app/(admin)/
  layout.tsx              ← shell: SidebarProvider + AdminSidebar + <main id="main-content">
  page.tsx                ← Dashboard (documents Table); replaces the root placeholder
  clients/page.tsx        ← Clients CRUD
  employees/page.tsx      ← Employees CRUD
  services/page.tsx       ← Services CRUD
  spec/page.tsx           ← already built (4d) — moves under the shared shell
  docs/[id]/page.tsx      ← PLACEHOLDER (4b replaces)
  docs/new/[type]/page.tsx ← PLACEHOLDER (4c replaces)
```

- The current `src/app/page.tsx` placeholder (with the temp /spec link) is **removed**; `/` is now the dashboard, living inside `(admin)`.
- `spec/page.tsx` currently self-renders `<main id="main-content">`; once under the shell it should drop its own `<main>` if the layout provides one — reconcile so there's exactly one `<main id="main-content">` per page. The layout owns `<main id="main-content">`; pages render content inside it. Update the 4d spec page to not double-wrap.
- Auth: the layout calls `isAuthorized()` (or `requireAuthorizedUser()` in a try/catch) for **nav visibility only**; every page keeps its own `requireAuthorizedUser()` redirect guard (a layout is not a security boundary — per Security checklist). Placeholder pages self-guard too.

## The shell (`layout.tsx` + `AdminSidebar`)

- shadcn `sidebar` primitive (`SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarTrigger`, `SidebarInset`).
- `AdminSidebar` (client — needs `usePathname` for active state) groups:
  - **Main:** Dashboard (`/`), Clients (`/clients`), Employees (`/employees`), Services (`/services`).
  - **New document:** Contract, Invoice, Receipt, Offer letter, Stipend, Experience letter, Exit letter → `/docs/new/<type>`. Single source of truth: a `NAV` constant (mirrors the source's `NAV_LINKS`, minus the `/kessler-` prefix, plus Icon spec).
  - **Tools:** Icon spec (`/spec`).
  - **Footer:** Sign out (Clerk `<SignOutButton>`), and the signed-in email (from the layout, passed as a prop).
- Active link: `aria-current="page"` + visual highlight when `pathname` matches.
- Lucide icons per group item (quiet, `h-4 w-4`).
- Mobile: `SidebarTrigger` (hamburger) opens the sidebar as a `Sheet` (shadcn handles this).
- Accessibility: `<nav aria-label="Admin navigation">` semantics (the sidebar primitive provides them), keyboard reachable, skip-to-main link, one `<main id="main-content">` in the layout.

## Dashboard (`(admin)/page.tsx` + `DocumentsTable`)

- Server Component, `export const dynamic = 'force-dynamic'`, own `requireAuthorizedUser()` guard, `noindex` metadata.
- Calls `listDocuments()`, passes to `DocumentsTable` (server-renderable, pure props).
- shadcn `Table`, columns: **Number · Type · Client/Party · Date · Total · Status**.
  - Number → `<Link href={`/docs/${doc.id}`}>` (draft shows "Draft"). Ported party-name logic (employee snapshot for STP/OFR/EXP/EXIT, else client snapshot). Total via `computeTotals`+`formatINR`, "—" for hr-letter/contract (ported `hasMoney` logic). Status via `Badge` (Finalized=default, Draft=secondary).
- **Empty state:** a designed `Card` ("No documents yet") with a "New invoice" link — not bare text.
- Header: page `<h1>Documents</h1>` and (optional) a "New document" `DropdownMenu` of doc types. Keep minimal since the sidebar already carries these.

## CRUD surfaces (clients, employees, services)

Each page: Server Component, `force-dynamic`, self-guarded, lists via the store, renders `<EntityTable>` + an `<EntityManager>` (client) that owns the Sheet + form + delete dialog.

**Per entity:**
- **Table** (shadcn `Table`): entity columns + a trailing row-actions `DropdownMenu` (`MoreHorizontal` trigger) with **Edit** and (where the action exists) **Delete**.
  - Clients: Name · Email · Phone · GSTIN. **No delete** (source omits it — clients may be referenced by finalized docs). Edit only.
  - Employees: Name · Email · Engagement type · (key fields). Edit + Delete.
  - Services: Name · (summary of content). Edit + Delete.
- **Form** (shadcn `Form`, RHF + `zodResolver(<domainSchema>)`): rendered inside a shadcn `Sheet`. "Add <entity>" opens it empty; row "Edit" opens it pre-filled. On submit calls the existing action (`createX`/`updateX`) → on `{success:true}` close the sheet + `router.refresh()`; on `{success:false}` show `error` in an inline `Alert`/`FormMessage`. Ported field sets and validation messages.
  - Fields come straight from the domain schemas already in `@/lib/domain/registry`. Do not invent fields; read the schema.
- **Delete** (employees, services): row action opens `AlertDialog` → confirm → `deleteEmployeeAction`/`deleteServiceAction` → `router.refresh()`.
- **Edit via URL param:** preserve the source's `?edit=<id>` deep-link (open the sheet in edit mode when the param is present) OR drive purely from row-action state. Prefer row-action state (simpler, no URL coupling); keep `?edit=` only if trivial. Decide at implementation; document which.
- **Empty states:** designed `Card`, not bare text.

## Server Actions & store (already built — just call them)

- Read: `listDocuments`, `listClients`, `listEmployees`, `listServices`, `getClient/Employee/Service`.
- Write: `createClient`/`updateClient`; `createEmployee`/`updateEmployee`/`deleteEmployeeAction`; `createService`/`updateService`/`deleteServiceAction`. All return `ActionResult` (`{ success, error?, id? }`) and `revalidatePath` their list route. **No `deleteClient` exists — do not add one.**

## New dependencies

- `react-hook-form`, `@hookform/resolvers` (pulled by shadcn `Form`).
- shadcn primitives to add: `form`, `table`, `sheet`, `dialog`, `alert-dialog`, `dropdown-menu`, `sidebar`, `separator`, `tooltip`, `skeleton` (skeleton for loading states), `sonner` (optional toast for action feedback — decide during planning; inline `Alert` is the baseline). `card`, `badge`, `input`, `label`, `textarea`, `checkbox`, `button`, `alert` already present.
- `npm audit` after adding; do NOT `audit fix --force` (Next downgrade risk — see CONTEXT watch-list).

## Testing

- **Tables:** render rows from fixtures, correct columns, links present, empty state renders.
- **Forms:** render fields, invalid submit shows validation messages (RHF+zod), valid submit calls the mocked action with parsed values, `success:false` surfaces the error.
- **Delete:** row action opens `AlertDialog`, confirm calls the mocked delete action.
- **Sidebar:** renders all groups/links, active link gets `aria-current`, keyboard reachable, sign-out present.
- **Placeholders:** render, self-guard (redirect when unauthorized).
- Mock Server Actions and `next/navigation` (`useRouter`, `usePathname`) in client-component tests. Base UI `PointerEvent` stub already in `jest.setup.ts` (from 4d) covers Sheet/Dialog/DropdownMenu interactions — extend `installDomStubs()` only if a new jsdom gap appears (report it).
- `npm test` green before done.

## Accessibility

- Sidebar: `<nav>` semantics, labelled, keyboard operable, active `aria-current="page"`, focus-visible rings.
- Skip-to-main link; single `<main id="main-content">` in the layout.
- One `<h1>` per page. Tables use `<caption>` (sr-only) + `<th scope="col">` (shadcn `Table` supports these).
- Forms: `FormField`/`FormLabel`/`FormMessage` wire label+error+`aria-describedby` automatically; every field labelled; server error in a `role="alert"` region.
- `Sheet`/`Dialog`/`AlertDialog`: focus trap + restore + `Escape` close (Base UI provides); destructive delete uses `AlertDialog`, not `Dialog`.
- Row-action `DropdownMenu` triggers have accessible names (`aria-label="Actions for <name>"`).

## Security / performance (per checklists)

- CSP unchanged; `z.config({ jitless: true })` keeps zod eval-free.
- Server Components by default; `'use client'` only where interaction needs it (sidebar, entity managers, forms).
- No secrets in client. Actions already validate all input server-side (never trust the client form).
- Tables are server-rendered (no client JS for the list itself). Forms/sheets are the only client islands.
- `noindex` on every admin page; absent from any sitemap.

## Verification

1. `npm run typecheck` · `npm test` · `npm run build` green; routes list shows `/`, `/clients`, `/employees`, `/services`, `/spec`, `/docs/[id]`, `/docs/new/[type]`.
2. Manual (real browser, signed in, live Neon):
   - Sidebar: every link navigates; active state correct; mobile hamburger opens the sheet; sign-out works; keyboard-only nav.
   - Dashboard: lists real documents (or the designed empty state); status badges correct; Number links resolve to the /docs/[id] placeholder.
   - Clients: add → appears in table; edit → persists; (no delete control present).
   - Employees: add/edit/delete round-trip; delete confirms via AlertDialog.
   - Services: add/edit/delete round-trip.
   - Unauthenticated → `/sign-in`; signed-in-not-allowlisted → `/no-access` from every admin route.

## Non-goals / deferred

- Document view, editors, finalize, print — 4b/4c.
- Pagination/search/sort on tables — YAGNI for now (volumes are tiny); the table supports adding it later.
- Toasts — inline `Alert` is the baseline; `sonner` optional, decided in planning.
- `middleware`→`proxy` migration (Next 16.2 deprecation) — tracked separately, not in 4a.
