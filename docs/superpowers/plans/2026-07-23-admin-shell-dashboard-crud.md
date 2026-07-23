# Phase 4a — App Shell + Dashboard + CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn speclr into a real admin app — a persistent sidebar shell, the documents dashboard, and full CRUD for clients/employees/services — all wired to the Server Actions already built in Phase 3.

**Architecture:** `(admin)` route group with a shared sidebar layout. Dashboard + entity lists are Server Components reading the store. Forms are client islands (shadcn `Form` = react-hook-form + zod) inside `Sheet`s, calling existing Server Actions that return `ActionResult`. Delete via `AlertDialog`.

**Tech Stack:** Next.js 16 App Router, React 19, TS, Tailwind v4, shadcn/ui (Base UI), react-hook-form, zod v4, Jest + RTL.

**Source of truth for ported UI/logic:** the marketing site at `/Users/shivanshupareek/Developer/qera/qerastudio/src/app/(utility)/kessler-admin/`. When a task says "port from source", read the named file there.

**Stack notes (carried from 4d — apply throughout):**
- shadcn primitives here are **Base UI**, NOT Radix. No `@radix-ui/*` imports. Base UI `Checkbox` `onCheckedChange(checked: boolean)`; Base UI `Button` has no `asChild` (style a `Link` with `buttonVariants({...})`).
- `jest.setup.ts` already stubs `PointerEvent` + pointer-capture (needed for Sheet/Dialog/DropdownMenu/Select). Extend `installDomStubs()` only if a NEW jsdom gap appears; report it.
- `@/` → `src/`. Tests in `__tests__/`. No `Co-Authored-By` trailer. No `lint` script — verify with `npm run typecheck`, `npm test`, `npm run build`.
- **CSP:** set `z.config({ jitless: true })` before any zodResolver runs (production CSP forbids eval). Do it once in a shared module (Task 6).

**Backend is already built — never modify it. Just call:**
- Read (store, `@/db/store`): `listDocuments`, `listClients`, `listEmployees`, `listServices`, `getClient/Employee/Service`.
- Write (actions, `@/server/actions/*`): `createClient`/`updateClient`; `createEmployee`/`updateEmployee`/`deleteEmployeeAction`; `createService`/`updateService`/`deleteServiceAction`. All return `ActionResult` (`{ success, error?, id? }`). **No `deleteClient` exists — do not add or call one.**
- Auth (`@/lib/auth/session`): `requireAuthorizedUser()` (throws `UNAUTHENTICATED`/`UNAUTHORIZED`), `isAuthorized()` (boolean).

**Implementation micro-decisions (settled here, per spec):**
- Edit mode is driven by **row-action React state**, not a `?edit=` URL param (simpler; no URL coupling).
- Action feedback baseline is an **inline `Alert`** in the form; no `sonner` toast (YAGNI for now).

---

## File Structure

**shadcn primitives (generated, Task 1):** `src/components/ui/{form,table,sheet,dialog,alert-dialog,dropdown-menu,sidebar,separator,tooltip,select,skeleton}.tsx`

**Shell:**
- `src/app/(admin)/layout.tsx` — SidebarProvider + AdminSidebar + `<main id="main-content">`
- `src/components/admin/AdminSidebar.tsx` — the sidebar (client; `usePathname`)
- `src/components/admin/nav.ts` — `NAV` constant (single source of truth for links)

**Dashboard:**
- `src/app/(admin)/page.tsx` — dashboard (Server Component)
- `src/components/admin/DocumentsTable.tsx` — the documents table (server-renderable)

**Placeholders:**
- `src/app/(admin)/docs/[id]/page.tsx`
- `src/app/(admin)/docs/new/[type]/page.tsx`

**Shared form infra:**
- `src/lib/zod-config.ts` — `import '@/lib/zod-config'` sets `z.config({ jitless: true })`

**Clients CRUD:**
- `src/app/(admin)/clients/page.tsx`
- `src/components/admin/clients/ClientsTable.tsx`
- `src/components/admin/clients/ClientManager.tsx` (client: owns Sheet + form state)
- `src/components/admin/clients/ClientForm.tsx`

**Employees CRUD:**
- `src/app/(admin)/employees/page.tsx`
- `src/components/admin/employees/EmployeesTable.tsx`
- `src/components/admin/employees/EmployeeManager.tsx`
- `src/components/admin/employees/EmployeeForm.tsx`

**Services CRUD:**
- `src/app/(admin)/services/page.tsx`
- `src/components/admin/services/ServicesTable.tsx`
- `src/components/admin/services/ServiceManager.tsx`
- `src/components/admin/services/ServiceForm.tsx`

**Removed:** `src/app/page.tsx` (root placeholder — dashboard replaces it at `(admin)/page.tsx`).

**Modified:** `src/app/(admin)/spec/page.tsx` (drop its own `<main id="main-content">`; the layout provides it) — Task 4.

---

## Task 1: Install shadcn primitives + form deps

**Files:** `src/components/ui/*` (generated), `package.json`

- [ ] **Step 1: Add primitives**

Run:
```bash
npx shadcn@latest add form table sheet dialog alert-dialog dropdown-menu sidebar separator tooltip select skeleton --yes
```
Expected: new files in `src/components/ui/`. `form` pulls in `react-hook-form` + `@hookform/resolvers`. `sidebar` pulls `separator`/`tooltip`/`sheet`/`skeleton` (already requested). Some may already exist — allow overwrite prompts to be skipped by `--yes` (if it errors on an existing file, re-run without that name).

- [ ] **Step 2: Confirm form deps installed**

Run: `node -e "require.resolve('react-hook-form'); require.resolve('@hookform/resolvers/zod'); console.log('ok')"`
Expected: `ok`. If MISSING, run `npm install react-hook-form @hookform/resolvers`.

- [ ] **Step 3: Verify globals.css untouched (Geist font guard)**

Run: `git diff --stat src/app/globals.css`
Expected: no output (unchanged). If shadcn rewrote it, restore the literal Geist font names in `@theme inline` (see 4d notes) — do NOT leave `--font-sans: var(--font-sans)`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui components.json package.json package-lock.json
git commit -m "chore(admin): add shadcn primitives + form deps for the shell"
```

---

## Task 2: The NAV constant

**Files:** Create `src/components/admin/nav.ts`; Test `src/components/admin/__tests__/nav.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { NAV_GROUPS } from '../nav';

describe('NAV_GROUPS', () => {
  it('has the four expected groups', () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(['Main', 'New document', 'Tools']);
  });

  it('points main links at the right routes', () => {
    const main = NAV_GROUPS.find((g) => g.label === 'Main')!;
    expect(main.items.map((i) => i.href)).toEqual(['/', '/clients', '/employees', '/services']);
  });

  it('has seven document-type links under New document', () => {
    const docs = NAV_GROUPS.find((g) => g.label === 'New document')!;
    expect(docs.items).toHaveLength(7);
    expect(docs.items.every((i) => i.href.startsWith('/docs/new/'))).toBe(true);
  });

  it('links Icon spec under Tools', () => {
    const tools = NAV_GROUPS.find((g) => g.label === 'Tools')!;
    expect(tools.items).toEqual([{ href: '/spec', label: 'Icon spec' }]);
  });
});
```

Note: the test expects exactly 3 groups but lists 3 labels — Main, New document, Tools. (Sign-out lives in the sidebar footer, not a nav group.)

- [ ] **Step 2: Run it, confirm FAIL**

Run: `npx jest src/components/admin/__tests__/nav.test.ts` → FAIL (cannot find `../nav`).

- [ ] **Step 3: Implement** `src/components/admin/nav.ts`

Port destinations from source `AdminNav.tsx` `NAV_LINKS`, dropping the `/kessler-admin` prefix (Dashboard → `/`) and `/kessler-spec` → `/spec`. Group them.

```ts
export interface NavItem {
  href: string;
  label: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { href: '/', label: 'Dashboard' },
      { href: '/clients', label: 'Clients' },
      { href: '/employees', label: 'Employees' },
      { href: '/services', label: 'Services' },
    ],
  },
  {
    label: 'New document',
    items: [
      { href: '/docs/new/contract', label: 'Contract' },
      { href: '/docs/new/invoice', label: 'Invoice' },
      { href: '/docs/new/receipt', label: 'Receipt' },
      { href: '/docs/new/offer-letter', label: 'Offer letter' },
      { href: '/docs/new/stipend', label: 'Stipend' },
      { href: '/docs/new/experience-letter', label: 'Experience letter' },
      { href: '/docs/new/exit-letter', label: 'Exit letter' },
    ],
  },
  {
    label: 'Tools',
    items: [{ href: '/spec', label: 'Icon spec' }],
  },
];
```

- [ ] **Step 4: Run test, confirm PASS (4 tests); `npm run typecheck` clean.**

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/nav.ts src/components/admin/__tests__/nav.test.ts
git commit -m "feat(admin): NAV_GROUPS single source of truth"
```

---

## Task 3: AdminSidebar

**Files:** Create `src/components/admin/AdminSidebar.tsx`; Test `src/components/admin/__tests__/AdminSidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

Mocks `next/navigation` `usePathname` and Clerk `SignOutButton`. Wraps in `SidebarProvider`.

```tsx
import { render, screen } from '@testing-library/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AdminSidebar from '../AdminSidebar';

jest.mock('next/navigation', () => ({ usePathname: () => '/clients' }));
jest.mock('@clerk/nextjs', () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function renderSidebar() {
  return render(
    <SidebarProvider>
      <AdminSidebar email="ops@qera.studio" />
    </SidebarProvider>,
  );
}

describe('AdminSidebar', () => {
  it('renders all main nav links', () => {
    renderSidebar();
    for (const label of ['Dashboard', 'Clients', 'Employees', 'Services', 'Invoice', 'Icon spec']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('marks the active route with aria-current', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Clients' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current', 'page');
  });

  it('shows the signed-in email and a sign-out control', () => {
    renderSidebar();
    expect(screen.getByText('ops@qera.studio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm FAIL**

Run: `npx jest src/components/admin/__tests__/AdminSidebar.test.tsx` → FAIL.

- [ ] **Step 3: Implement** `src/components/admin/AdminSidebar.tsx`

First READ `src/components/ui/sidebar.tsx` to confirm the exported primitive names and their props (Base UI shadcn sidebar). The names below are the standard shadcn set; adjust to the actual exports if they differ, and report any change.

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { NAV_GROUPS } from './nav';

export default function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-2 text-sm font-semibold">speclr</SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={item.href} aria-current={active ? 'page' : undefined}>
                          {item.label}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-2 p-3">
        <p className="truncate text-xs text-muted-foreground">{email}</p>
        <SignOutButton>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm hover:bg-accent"
          >
            Sign out
          </button>
        </SignOutButton>
      </SidebarFooter>
    </Sidebar>
  );
}
```

Note on `SidebarMenuButton asChild`: shadcn's own sidebar uses an internal Slot for `asChild` that is independent of the Base UI Button — it should work. If `asChild` is unsupported on `SidebarMenuButton` in this build, render the `<Link>` as the child differently per the actual `sidebar.tsx` API (read it) and report what you did.

- [ ] **Step 4: Run test, confirm PASS (3 tests); `npm run typecheck` clean.**

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx src/components/admin/__tests__/AdminSidebar.test.tsx
git commit -m "feat(admin): AdminSidebar navigation"
```

---

## Task 4: The `(admin)` shell layout + reconcile spec page

**Files:** Create `src/app/(admin)/layout.tsx`; Modify `src/app/(admin)/spec/page.tsx`

- [ ] **Step 1: Implement the layout** `src/app/(admin)/layout.tsx`

Server Component. Reads the user for nav (email) but does NOT hard-gate here (pages self-guard). If unauthenticated, `isAuthorized()`/currentUser is null — render children without the sidebar so the page's own guard can redirect. Provides the single `<main id="main-content">`.

```tsx
import type { Metadata } from 'next';
import { currentUser } from '@clerk/nextjs/server';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Nav visibility only — each page and Server Action still enforces auth itself.
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? '';

  if (!user) {
    // Not signed in: no shell. The page's own requireAuthorizedUser() redirects.
    return <main id="main-content">{children}</main>;
  }

  return (
    <SidebarProvider>
      <AdminSidebar email={email} />
      <SidebarInset>
        <div className="flex items-center gap-2 border-b border-border p-2 md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-medium">speclr</span>
        </div>
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

READ `src/components/ui/sidebar.tsx` first to confirm `SidebarProvider`, `SidebarInset`, `SidebarTrigger` are exported with these names; adjust if the API differs and report.

- [ ] **Step 2: Reconcile the 4d spec page** — remove its own `<main id="main-content">` so there's exactly one per page (the layout now provides it).

In `src/app/(admin)/spec/page.tsx`, change the returned JSX from:
```tsx
  return (
    <main id="main-content">
      <IconSpecTool />
    </main>
  );
```
to:
```tsx
  return <IconSpecTool />;
```

- [ ] **Step 3: Run the existing spec page test to confirm no regression**

Run: `npx jest "src/app/(admin)/spec"`
Expected: still PASS (the test asserts the heading renders for an authorized user; removing the wrapper `<main>` doesn't change that).

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck` → no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/layout.tsx" "src/app/(admin)/spec/page.tsx"
git commit -m "feat(admin): (admin) shell layout with sidebar; single <main> per page"
```

---

## Task 5: Dashboard — DocumentsTable + page

**Files:** Create `src/components/admin/DocumentsTable.tsx`, `src/app/(admin)/page.tsx`; Test `src/components/admin/__tests__/DocumentsTable.test.tsx`. **Remove** `src/app/page.tsx`.

- [ ] **Step 1: Write the failing test**

Uses a minimal fake document. Read `@/lib/domain/types` `AdminDocument` union shape via the source `DocumentList.tsx` to build a valid fixture. The test asserts columns + a link + status badge + empty state.

```tsx
import { render, screen } from '@testing-library/react';
import DocumentsTable from '../DocumentsTable';
import type { AdminDocument } from '@/lib/domain/types';

const invoice = {
  id: 'doc-1',
  type: 'INV',
  status: 'finalized',
  number: 'QS-INV-2627-001',
  issueDate: '2026-06-10',
  gstRatePercent: 18,
  lineItems: [{ description: 'Design', detail: '', unitPricePaise: 100000, quantity: 1 }],
  clientSnapshot: { name: 'Acme Co.' },
} as unknown as AdminDocument;

describe('DocumentsTable', () => {
  it('renders a row with number link, client, status', () => {
    render(<DocumentsTable documents={[invoice]} />);
    expect(screen.getByRole('link', { name: 'QS-INV-2627-001' })).toHaveAttribute('href', '/docs/doc-1');
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.getByText('Finalized')).toBeInTheDocument();
  });

  it('renders a designed empty state when there are no documents', () => {
    render(<DocumentsTable documents={[]} />);
    expect(screen.getByText(/no documents yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new invoice/i })).toHaveAttribute('href', '/docs/new/invoice');
  });
});
```

- [ ] **Step 2: Run it, confirm FAIL**

Run: `npx jest src/components/admin/__tests__/DocumentsTable.test.tsx` → FAIL.

- [ ] **Step 3: Implement** `src/components/admin/DocumentsTable.tsx`

Port the party-name + `hasMoney` logic from source `DocumentList.tsx` (read it). Use shadcn `Table` + `Badge`. Server-renderable (no `'use client'`).

```tsx
import Link from 'next/link';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDisplayDate } from '@/lib/domain/dates';
import { computeTotals, formatINR } from '@/lib/domain/money';
import { DOC_TYPES } from '@/lib/domain/registry';
import type { AdminDocument } from '@/lib/domain/types';

function partyName(doc: AdminDocument): string {
  if (doc.type === 'STP' || doc.type === 'OFR' || doc.type === 'EXP' || doc.type === 'EXIT') {
    return doc.employeeSnapshot?.name || '—';
  }
  return doc.clientSnapshot?.name || '—';
}

export default function DocumentsTable({ documents }: { documents: AdminDocument[] }) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No documents yet. Start with{' '}
          <Link href="/docs/new/invoice" className="text-primary underline underline-offset-4">
            a new invoice
          </Link>
          .
        </CardContent>
      </Card>
    );
  }

  return (
    <Table>
      <TableCaption className="sr-only">All documents, newest first</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Number</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => {
          const hasMoney = DOC_TYPES[doc.type].kind !== 'hr-letter' && doc.type !== 'CON';
          const totals = computeTotals(doc.lineItems, doc.gstRatePercent);
          return (
            <TableRow key={doc.id}>
              <TableCell>
                <Link href={`/docs/${doc.id}`} className="text-primary underline-offset-4 hover:underline">
                  {doc.number ?? 'Draft'}
                </Link>
              </TableCell>
              <TableCell>{DOC_TYPES[doc.type].label}</TableCell>
              <TableCell>{partyName(doc)}</TableCell>
              <TableCell>{formatDisplayDate(doc.issueDate)}</TableCell>
              <TableCell className="text-right">{hasMoney ? formatINR(totals.totalPaise) : '—'}</TableCell>
              <TableCell>
                <Badge variant={doc.status === 'finalized' ? 'default' : 'secondary'}>
                  {doc.status === 'finalized' ? 'Finalized' : 'Draft'}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
```

IMPORTANT: confirm the real property names on the `AdminDocument` union by reading source `DocumentList.tsx` and `@/lib/domain/types` — especially `employeeSnapshot`/`clientSnapshot`, `lineItems`, `gstRatePercent`, `issueDate`, `number`. Adjust the fixture and code to match the actual types so `npm run typecheck` passes. Report any name differences from the snippet above. `computeTotals` signature: confirm its args against `@/lib/domain/money`.

- [ ] **Step 4: Implement the dashboard page** `src/app/(admin)/page.tsx`

```tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listDocuments } from '@/db/store';
import DocumentsTable from '@/components/admin/DocumentsTable';

export const metadata: Metadata = {
  title: 'Documents — speclr',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const documents = await listDocuments();

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Documents</h1>
      <DocumentsTable documents={documents} />
    </div>
  );
}
```

- [ ] **Step 5: Remove the old root placeholder**

Run: `git rm src/app/page.tsx`
(The dashboard at `(admin)/page.tsx` now serves `/`. Route groups are URL-transparent, so `(admin)/page.tsx` maps to `/`. There must be exactly one `/` route — deleting the old placeholder avoids a conflict.)

- [ ] **Step 6: Run tests + typecheck + build (build catches the route collision if any)**

Run: `npx jest src/components/admin/__tests__/DocumentsTable.test.tsx` → PASS.
Run: `npm run typecheck` → clean.
Run: `npm run build` → succeeds; route list shows `/` (dynamic) and no duplicate-root error.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(admin)/page.tsx" src/components/admin/DocumentsTable.tsx src/components/admin/__tests__/DocumentsTable.test.tsx
git rm --cached src/app/page.tsx 2>/dev/null; git add -A
git commit -m "feat(admin): documents dashboard; retire root placeholder"
```

---

## Task 6: Shared zod config + doc route placeholders

**Files:** Create `src/lib/zod-config.ts`, `src/app/(admin)/docs/[id]/page.tsx`, `src/app/(admin)/docs/new/[type]/page.tsx`

- [ ] **Step 1: Create the zod config module** `src/lib/zod-config.ts`

```ts
import { z } from 'zod';

// Production CSP forbids eval — zod must precompile without JIT.
z.config({ jitless: true });
```

- [ ] **Step 2: Implement the `/docs/[id]` placeholder** `src/app/(admin)/docs/[id]/page.tsx`

Self-guards; friendly "coming next phase" content.

```tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Document — speclr',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function DocumentViewPlaceholder({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }
  const { id } = await params;

  return (
    <div className="flex flex-col gap-2 p-6">
      <h1 className="text-2xl font-semibold">Document</h1>
      <p className="text-sm text-muted-foreground">
        Viewing document <code className="rounded bg-muted px-1 py-0.5">{id}</code> arrives in the next phase.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Implement the `/docs/new/[type]` placeholder** `src/app/(admin)/docs/new/[type]/page.tsx`

Same pattern, reading `type`:
```tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'New document — speclr',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function NewDocumentPlaceholder({ params }: { params: Promise<{ type: string }> }) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }
  const { type } = await params;

  return (
    <div className="flex flex-col gap-2 p-6">
      <h1 className="text-2xl font-semibold">New {type.replace(/-/g, ' ')}</h1>
      <p className="text-sm text-muted-foreground">The editor for this document type arrives in the next phase.</p>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + build**

Run: `npm run typecheck` → clean. Run: `npm run build` → route list shows `/docs/[id]` and `/docs/new/[type]`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/zod-config.ts "src/app/(admin)/docs"
git commit -m "feat(admin): shared jitless zod config + doc route placeholders"
```

---

## Task 7: Clients — table + manager + form (the simple CRUD; establishes the pattern)

**Files:** Create `src/components/admin/clients/{ClientsTable,ClientManager,ClientForm}.tsx`, `src/app/(admin)/clients/page.tsx`; Tests for each in `src/components/admin/clients/__tests__/`.

Read source `clients/_components/ClientForm/ClientForm.tsx` and `ClientTable/ClientTable.tsx` for field labels/messages. `clientInputSchema` (`@/lib/domain/registry`): `{ name, address, email, phone, gstin? }`. Clients have **no delete**.

- [ ] **Step 1: Write the ClientForm test** `src/components/admin/clients/__tests__/ClientForm.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientForm from '../ClientForm';

const createClient = jest.fn();
const updateClient = jest.fn();
jest.mock('@/server/actions/clients', () => ({
  createClient: (...a: unknown[]) => createClient(...a),
  updateClient: (...a: unknown[]) => updateClient(...a),
}));

describe('ClientForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the client fields', () => {
    render(<ClientForm onDone={() => {}} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it('calls createClient with entered values on submit', async () => {
    createClient.mockResolvedValue({ success: true, id: 'c1' });
    const onDone = jest.fn();
    const user = userEvent.setup();
    render(<ClientForm onDone={onDone} />);
    await user.type(screen.getByLabelText(/name/i), 'Acme Co.');
    await user.type(screen.getByLabelText(/address/i), '1 Road');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/phone/i), '999');
    await user.click(screen.getByRole('button', { name: /add client/i }));
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Acme Co.', email: 'a@b.com', phone: '999' }),
    );
    expect(onDone).toHaveBeenCalled();
  });

  it('shows a server error when the action fails', async () => {
    createClient.mockResolvedValue({ success: false, error: 'Failed to save client.' });
    const user = userEvent.setup();
    render(<ClientForm onDone={() => {}} />);
    await user.type(screen.getByLabelText(/name/i), 'X');
    await user.type(screen.getByLabelText(/address/i), 'Y');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/phone/i), '1');
    await user.click(screen.getByRole('button', { name: /add client/i }));
    expect(await screen.findByText('Failed to save client.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm FAIL**

Run: `npx jest src/components/admin/clients/__tests__/ClientForm.test.tsx` → FAIL.

- [ ] **Step 3: Implement ClientForm** `src/components/admin/clients/ClientForm.tsx`

Uses shadcn `Form`. READ `src/components/ui/form.tsx` to confirm exports (`Form, FormControl, FormField, FormItem, FormLabel, FormMessage`). `onDone` closes the parent Sheet + refreshes.

```tsx
'use client';

import '@/lib/zod-config';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { clientInputSchema } from '@/lib/domain/registry';
import type { ClientRecord } from '@/lib/domain/types';
import { createClient, updateClient } from '@/server/actions/clients';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Values = z.infer<typeof clientInputSchema>;

export default function ClientForm({ client, onDone }: { client?: ClientRecord | null; onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(clientInputSchema),
    defaultValues: client
      ? { name: client.name, address: client.address, email: client.email, phone: client.phone, gstin: client.gstin ?? '' }
      : { name: '', address: '', email: '', phone: '', gstin: '' },
  });

  const onSubmit = async (values: Values) => {
    setServerError(null);
    const result = client ? await updateClient(client.id, values) : await createClient(values);
    if (!result.success) {
      setServerError(result.error ?? 'Something went wrong.');
      return;
    }
    onDone();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="gstin" render={({ field }) => (
          <FormItem><FormLabel>GSTIN (optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        {serverError && <Alert variant="destructive"><AlertDescription>{serverError}</AlertDescription></Alert>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : client ? 'Save changes' : 'Add client'}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 4: Run the form test, confirm PASS (3 tests).**

If the shadcn `Form` `FormLabel` associates via `FormField` context (it does — it generates ids), `getByLabelText` resolves. If a label isn't associated and the query fails, READ `src/components/ui/form.tsx` — do NOT bypass with `aria-label`; the FormLabel/FormControl id wiring must work. Report any fix.

- [ ] **Step 5: Implement ClientsTable** `src/components/admin/clients/ClientsTable.tsx`

Server-renderable list; a row-action `DropdownMenu` with **Edit** only (no delete). Since Edit needs to open the parent Sheet (client state), the table takes an `onEdit(client)` callback — so ClientsTable is a client component that receives the list + callback from the manager. (Simpler than server-table + client-actions split at this scale.)

```tsx
'use client';

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { ClientRecord } from '@/lib/domain/types';

export default function ClientsTable({ clients, onEdit }: { clients: ClientRecord[]; onEdit: (c: ClientRecord) => void }) {
  if (clients.length === 0) {
    return (
      <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No clients yet — add your first one.</CardContent></Card>
    );
  }
  return (
    <Table>
      <TableCaption className="sr-only">Saved clients</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>GSTIN</TableHead>
          <TableHead className="w-0"><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((c) => (
          <TableRow key={c.id}>
            <TableCell>{c.name}</TableCell><TableCell>{c.email}</TableCell><TableCell>{c.phone}</TableCell><TableCell>{c.gstin || '—'}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Actions for ${c.name}`}><MoreHorizontal /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(c)}>Edit</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

Note: if Base UI `Button` rejects `asChild` inside `DropdownMenuTrigger`, use the dropdown-menu's own trigger `render`/pattern per `src/components/ui/dropdown-menu.tsx` (READ it) — the shadcn dropdown-menu trigger typically supports `asChild` via its own slot even in the Base UI build. Report what you did.

- [ ] **Step 6: Implement ClientManager** `src/components/admin/clients/ClientManager.tsx`

Owns the Sheet + which client is being edited; renders the "Add client" button, the table, and the form in a Sheet.

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { ClientRecord } from '@/lib/domain/types';
import ClientsTable from './ClientsTable';
import ClientForm from './ClientForm';

export default function ClientManager({ clients }: { clients: ClientRecord[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRecord | null>(null);

  const openAdd = () => { setEditing(null); setOpen(true); };
  const openEdit = (c: ClientRecord) => { setEditing(c); setOpen(true); };
  const onDone = () => { setOpen(false); router.refresh(); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openAdd}>Add client</Button>
      </div>
      <ClientsTable clients={clients} onEdit={openEdit} />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>{editing ? 'Edit client' : 'Add client'}</SheetTitle></SheetHeader>
          <div className="px-4 pb-4">
            {/* key forces a fresh form when switching add/edit target */}
            <ClientForm key={editing?.id ?? 'new'} client={editing} onDone={onDone} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

READ `src/components/ui/sheet.tsx` to confirm `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle` + the controlled `open`/`onOpenChange` API (Base UI). Adjust names/props if different; report.

- [ ] **Step 7: Implement the clients page** `src/app/(admin)/clients/page.tsx`

```tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listClients } from '@/db/store';
import ClientManager from '@/components/admin/clients/ClientManager';

export const metadata: Metadata = { title: 'Clients — speclr', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }
  const clients = await listClients();
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Clients</h1>
      <ClientManager clients={clients} />
    </div>
  );
}
```

- [ ] **Step 8: Write a ClientsTable test** `src/components/admin/clients/__tests__/ClientsTable.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientsTable from '../ClientsTable';
import type { ClientRecord } from '@/lib/domain/types';

const clients = [
  { id: 'c1', name: 'Acme Co.', address: 'x', email: 'a@b.com', phone: '999', gstin: '', createdAt: 0, updatedAt: 0 },
] as ClientRecord[];

describe('ClientsTable', () => {
  it('renders a row per client', () => {
    render(<ClientsTable clients={clients} onEdit={() => {}} />);
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
  });

  it('calls onEdit when the row Edit action is chosen', async () => {
    const onEdit = jest.fn();
    const user = userEvent.setup();
    render(<ClientsTable clients={clients} onEdit={onEdit} />);
    await user.click(screen.getByRole('button', { name: /actions for acme co\./i }));
    await user.click(await screen.findByRole('menuitem', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(clients[0]);
  });

  it('renders an empty state', () => {
    render(<ClientsTable clients={[]} onEdit={() => {}} />);
    expect(screen.getByText(/no clients yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run all clients tests + typecheck**

Run: `npx jest src/components/admin/clients` → PASS (ClientForm 3 + ClientsTable 3).
Run: `npm run typecheck` → clean.

- [ ] **Step 10: Commit**

```bash
git add "src/app/(admin)/clients" src/components/admin/clients
git commit -m "feat(admin): clients CRUD (table + sheet form)"
```

---

## Task 8: Employees — table + manager + form (rupees↔paise + enums + delete)

**Files:** Create `src/components/admin/employees/{EmployeesTable,EmployeeManager,EmployeeForm}.tsx`, `src/app/(admin)/employees/page.tsx`; Tests in `__tests__/`.

**Read the source form first:** `/Users/shivanshupareek/Developer/qera/qerastudio/src/app/(utility)/kessler-admin/employees/_components/EmployeeForm/EmployeeForm.tsx`. Port its transform logic **faithfully**:
- The form works in **rupees** for pay; on submit convert to paise via `rupeesToPaise` (`@/lib/domain/money`) and prefill via `paiseToRupees`.
- The nested `bank` object is flattened into form fields (`bankName`, `accountNo`, `ifsc`, `upiId`) and reassembled into `bank: {...}` on submit.
- Enums: `engagementType` (`intern`/`employee`) and `pronoun` (`he`/`she`/`they`) → shadcn `Select`.
- `joiningDate` / `endDate?` → `Input type="date"` (ISO strings).
- Validate against `employeeInputSchema` (`@/lib/domain/employee`), but note the **form shape differs from the schema shape** (form has flat `payRupees`/`bankName`; schema wants `payAmountPaise`/`bank`). Use a **separate form schema** for RHF and map to the domain shape on submit (then the Server Action re-validates with `employeeInputSchema` server-side — the client mapping just needs to produce the right object). Build the form-level zod schema inline to match the flat fields, OR use `useForm` without a resolver and rely on server validation for edge cases + minimal client checks. Prefer: a small inline `formSchema` for good UX, mapping to the domain object on submit. Follow how the source does it.

Employees HAVE delete (`deleteEmployeeAction`).

- [ ] **Step 1: Write the EmployeeForm test** `src/components/admin/employees/__tests__/EmployeeForm.test.tsx`

Assert: renders key fields (name, role, engagement type, pay, bank name); submit maps rupees→paise and bank→nested object in the payload to `createEmployee`; server error surfaces.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployeeForm from '../EmployeeForm';

const createEmployee = jest.fn();
const updateEmployee = jest.fn();
jest.mock('@/server/actions/employees', () => ({
  createEmployee: (...a: unknown[]) => createEmployee(...a),
  updateEmployee: (...a: unknown[]) => updateEmployee(...a),
}));

describe('EmployeeForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders core fields', () => {
    render(<EmployeeForm onDone={() => {}} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^pay/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument();
  });

  it('maps rupees to paise and nests bank on submit', async () => {
    createEmployee.mockResolvedValue({ success: true, id: 'e1' });
    const user = userEvent.setup();
    render(<EmployeeForm onDone={() => {}} />);
    await user.type(screen.getByLabelText(/name/i), 'Riya');
    await user.type(screen.getByLabelText(/address/i), 'addr');
    await user.type(screen.getByLabelText(/email/i), 'r@b.com');
    await user.type(screen.getByLabelText(/phone/i), '999');
    await user.type(screen.getByLabelText(/role/i), 'Designer');
    await user.type(screen.getByLabelText(/^pay/i), '20000');
    await user.type(screen.getByLabelText(/bank name/i), 'Kotak');
    await user.type(screen.getByLabelText(/account/i), '123');
    await user.type(screen.getByLabelText(/ifsc/i), 'KKBK0');
    await user.type(screen.getByLabelText(/joining/i), '2026-06-01');
    await user.click(screen.getByRole('button', { name: /add employee/i }));
    expect(createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Riya',
        payAmountPaise: 2000000,
        bank: expect.objectContaining({ bankName: 'Kotak', accountNo: '123', ifsc: 'KKBK0' }),
      }),
    );
  });
});
```

Note: `rupeesToPaise('20000')` = 2000000 paise. Confirm this against `@/lib/domain/money` when implementing; adjust the expectation if the helper treats the input differently.

- [ ] **Step 2: Run it, confirm FAIL.**
Run: `npx jest src/components/admin/employees/__tests__/EmployeeForm.test.tsx` → FAIL.

- [ ] **Step 3: Implement EmployeeForm** — port from source, using shadcn `Form` + `Select`. Map flat form values → domain object (`payAmountPaise`, `bank`) on submit exactly as the source does. READ the source file and `@/lib/domain/money` (`rupeesToPaise`/`paiseToRupees` signatures — note `rupeesToPaise` takes a **string** and may return `null`) and `@/lib/domain/employee` (`emptyEmployeeInput`). Use `Select` from `@/components/ui/select` for the two enums; confirm its Base UI API (`value`/`onValueChange`) by reading `src/components/ui/select.tsx`.

Because the exact field layout is long, port it faithfully rather than inventing — the source is the spec. Keep every label text the test queries (`Name`, `Role`, `Pay`, `Bank name`, `Account`, `IFSC`, `Joining`). Provide `onDone` like ClientForm.

- [ ] **Step 4: Run the form test, confirm PASS.** Fix mapping until the payload matches. Do not change the asserted mapping (rupees→paise, nested bank) — that's the contract.

- [ ] **Step 5: Implement EmployeesTable** — like ClientsTable but columns Name · Email · Role · Engagement, and the row `DropdownMenu` has **Edit** and **Delete**. Delete triggers an `AlertDialog` (see manager). Pass `onEdit(emp)` and `onDelete(emp)` callbacks.

- [ ] **Step 6: Implement EmployeeManager** — like ClientManager, plus an `AlertDialog` for delete: `onDelete` sets a `deleting` employee, the AlertDialog confirms → calls `deleteEmployeeAction(id)` → `router.refresh()`. READ `src/components/ui/alert-dialog.tsx` for the API.

- [ ] **Step 7: Implement the employees page** — same shape as clients page, `listEmployees()` → `EmployeeManager`.

- [ ] **Step 8: Write EmployeesTable test** — rows render; Edit fires `onEdit`; Delete fires `onDelete`; empty state.

- [ ] **Step 9: Run all employees tests + typecheck.**
Run: `npx jest src/components/admin/employees` → PASS. `npm run typecheck` → clean.

- [ ] **Step 10: Commit**
```bash
git add "src/app/(admin)/employees" src/components/admin/employees
git commit -m "feat(admin): employees CRUD (rupees↔paise, enums, delete)"
```

---

## Task 9: Services — table + manager + form (dynamic field arrays + delete)

**Files:** Create `src/components/admin/services/{ServicesTable,ServiceManager,ServiceForm}.tsx`, `src/app/(admin)/services/page.tsx`; Tests in `__tests__/`.

**Read the source form first:** `/Users/shivanshupareek/Developer/qera/qerastudio/src/app/(utility)/kessler-admin/services/_components/ServiceForm/ServiceForm.tsx`. Port its transform logic faithfully:
- `serviceInputSchema` (`@/lib/domain/serviceTemplate`): `{ name, overview, scopeItems: string[], exclusionItems: string[], priceNote, milestones: {label,scope}[], revisionsNote, disclaimerNote, supportNote }`.
- The form uses `useFieldArray` for `scopeItems`, `exclusionItems` (as `{value:string}[]`) and `milestones` (`{label,scope}[]`). On submit, map `{value}[]` → `string[]` and filter empties, exactly as source (see its `onSubmit`).
- Validate with a form schema, map to the domain object on submit. The Server Action re-validates with `serviceInputSchema`.

Services HAVE delete (`deleteServiceAction`).

- [ ] **Step 1: Write the ServiceForm test** `src/components/admin/services/__tests__/ServiceForm.test.tsx`

Assert: renders name + overview; can add a scope item and it appears; submit maps scope `{value}` array → string array in the `createService` payload; server error surfaces.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServiceForm from '../ServiceForm';

const createService = jest.fn();
const updateService = jest.fn();
jest.mock('@/server/actions/services', () => ({
  createService: (...a: unknown[]) => createService(...a),
  updateService: (...a: unknown[]) => updateService(...a),
}));

describe('ServiceForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders name and overview fields', () => {
    render(<ServiceForm onDone={() => {}} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/overview/i)).toBeInTheDocument();
  });

  it('adds a scope item and includes it as a string on submit', async () => {
    createService.mockResolvedValue({ success: true, id: 's1' });
    const user = userEvent.setup();
    render(<ServiceForm onDone={() => {}} />);
    await user.type(screen.getByLabelText(/name/i), 'Branding');
    await user.click(screen.getByRole('button', { name: /add scope item/i }));
    const scopeInputs = screen.getAllByLabelText(/scope item/i);
    await user.type(scopeInputs[scopeInputs.length - 1], 'Logo design');
    await user.click(screen.getByRole('button', { name: /^add service$|save service|create service/i }));
    expect(createService).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Branding', scopeItems: expect.arrayContaining(['Logo design']) }),
    );
  });
});
```

Note: match the actual submit-button label and the "add scope item" button label to what you implement; keep the test and component in sync. Prefer button labels "Add scope item" and "Add service"/"Save service".

- [ ] **Step 2: Run it, confirm FAIL.**
Run: `npx jest src/components/admin/services/__tests__/ServiceForm.test.tsx` → FAIL.

- [ ] **Step 3: Implement ServiceForm** — port from source using `useFieldArray`. Each scope/exclusion item is a labelled `Input` (label like `Scope item N` for the test's `getByLabelText(/scope item/i)` — use `aria-label={`Scope item ${i + 1}`}` on each). "Add scope item"/"Add exclusion"/"Add milestone" buttons append; a remove button per row. Map `{value}[]`→`string[]` (filter empty) and milestones on submit, per source. `onDone` like the others.

- [ ] **Step 4: Run the form test, confirm PASS.** Fix mapping until the payload matches.

- [ ] **Step 5: Implement ServicesTable** — columns Name · (short overview) + row `DropdownMenu` Edit/Delete. Callbacks `onEdit`/`onDelete`. Empty state.

- [ ] **Step 6: Implement ServiceManager** — like EmployeeManager (Sheet + AlertDialog delete via `deleteServiceAction`).

- [ ] **Step 7: Implement the services page** — `listServices()` → `ServiceManager`.

- [ ] **Step 8: Write ServicesTable test** — rows render; Edit/Delete fire; empty state.

- [ ] **Step 9: Run all services tests + typecheck.**
Run: `npx jest src/components/admin/services` → PASS. `npm run typecheck` → clean.

- [ ] **Step 10: Commit**
```bash
git add "src/app/(admin)/services" src/components/admin/services
git commit -m "feat(admin): services CRUD (dynamic field arrays, delete)"
```

---

## Task 10: Full verification

- [ ] **Step 1: Full test suite**
Run: `npm test` → all suites pass (4d's 176 + all new admin tests), no console errors.

- [ ] **Step 2: Typecheck**
Run: `npm run typecheck` → no errors.

- [ ] **Step 3: Production build**
Run: `npm run build` → succeeds. Route list includes `/`, `/clients`, `/employees`, `/services`, `/spec`, `/docs/[id]`, `/docs/new/[type]`; `/` is dynamic; no duplicate-root error.

- [ ] **Step 4: Manual browser check (record results)**
Start `npm run dev`, sign in as an allowlisted user:
1. Sidebar: every link navigates; active state correct; mobile hamburger (`SidebarTrigger`) opens the sheet; sign-out works; keyboard-only nav reaches all links.
2. Dashboard lists real docs (or the empty state); status badges correct; a Number link opens the `/docs/[id]` placeholder.
3. Clients: Add → row appears; Edit → persists; no delete control present.
4. Employees: Add (enter pay in rupees) → row appears; reopen Edit → pay shows back in rupees, bank fields populated; Delete → AlertDialog → row gone. Verify in Neon that `payAmountPaise` is rupees×100.
5. Services: Add with a couple of scope items + a milestone → persists; Edit shows them back; Delete works.
6. Unauthenticated → `/sign-in`; signed-in-not-allowlisted → `/no-access` from `/`, `/clients`, `/employees`, `/services`.

- [ ] **Step 5: Final commit (only if manual surfaced fixes)**
```bash
git add -A && git commit -m "fix(admin): address manual verification findings"
```

---

## Self-review checklist (completed during authoring)

- **Spec coverage:** shell/layout ✓ (T4), sidebar ✓ (T3), NAV ✓ (T2), dashboard ✓ (T5), placeholders ✓ (T6), zod jitless ✓ (T6), clients CRUD ✓ (T7), employees CRUD incl. paise/enums/delete ✓ (T8), services CRUD incl. field arrays/delete ✓ (T9), verification ✓ (T10). Root-placeholder retirement ✓ (T5). Spec-page `<main>` reconcile ✓ (T4).
- **No placeholders in plan:** simple components have full code; the two genuinely complex forms (Employee, Service) instruct porting from the named source file with the transform contract spelled out and asserted by tests (rupees→paise + nested bank; `{value}[]`→`string[]`) — the source is the authoritative field spec, deliberately not transcribed to avoid drift, but the load-bearing mappings are pinned by tests.
- **Type consistency:** `ActionResult` `{success,error?,id?}` used uniformly; `ClientRecord`/`EmployeeRecord`/`ServiceTemplate` from domain; schemas `clientInputSchema` (registry), `employeeInputSchema` (employee.ts), `serviceInputSchema` (serviceTemplate.ts); `onDone`/`onEdit`/`onDelete` callback names consistent across the three managers; Base UI caveats (no `asChild` on Base UI Button; Select `onValueChange`) flagged where used, with "read the primitive" fallbacks.
- **Known risk flagged:** several Base UI primitive APIs (sidebar, sheet, dropdown-menu, alert-dialog, select, form) are asserted by their tests but their exact export names/props must be confirmed by reading each `src/components/ui/*.tsx` — every task that uses one instructs the implementer to read it and report deviations. This is intentional: it's the one place training-data assumptions (Radix) could bite.
