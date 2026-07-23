# Phase 4d — Icon Tool (`spec`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the marketing-site `/kessler-spec` icon/favicon checklist as speclr's `/spec` route — portable logic lifted verbatim, all UI rebuilt in shadcn + Tailwind, client-only, behind the existing auth gate.

**Architecture:** A thin authenticated Server Component page renders a client `IconSpecTool`. All image analysis runs in the browser (canvas/Image). State lives in React + localStorage; the exported JSON file is the authoritative store. No DB, no server actions.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui (base-mira, Lucide), Jest + React Testing Library.

**Source of truth for content/behavior:** the marketing site at `/Users/shivanshupareek/Developer/qera/qerastudio/src/app/(utility)/kessler-spec/`. When a task says "copy verbatim", copy from there.

**Stack note — shadcn primitives here are Base UI, NOT Radix.** This project's shadcn preset (`base-mira`) generates primitives on top of `@base-ui/react/*` (confirmed: `button`, `checkbox`, `progress`, `label` all import from `@base-ui/react`). Do not introduce `@radix-ui/*` imports or Radix-specific prop patterns. Notably, the Base UI `Checkbox` fires `onCheckedChange={(checked: boolean, eventDetails) => ...}` — the first arg is already a plain `boolean` (no Radix `CheckedState` union). `Badge` variants available: `default | secondary | destructive | outline`. `Alert` exports `Alert, AlertTitle, AlertDescription`. `Card` exports `Card, CardHeader, CardTitle, CardContent`. All primitives were installed in Task 2 and already typecheck.

**Conventions:**
- `@/` maps to `src/`. Import lifted logic as `@/lib/spec/...`.
- Component files under `src/components/spec/`. Tests in a sibling `__tests__/` dir.
- No SCSS. Tailwind utility classes + shadcn tokens (`bg-card`, `text-muted-foreground`, `border-border`, `text-foreground`) only.
- Commit after each task. No `Co-Authored-By` trailer.
- There is no `lint` npm script; verification uses `npm run typecheck`, `npm test`, `npm run build`.

---

## File Structure

**Lifted logic (verbatim copies):**
- `src/lib/spec/types.ts`
- `src/lib/spec/imageAnalysis.ts`
- `src/lib/spec/iconSpecData.ts`
- `src/lib/spec/useImageValidation.ts`
- `src/lib/spec/useIconSpecState.ts`
- `src/lib/spec/__tests__/imageAnalysis.test.ts`
- `src/lib/spec/__tests__/useImageValidation.test.ts`
- `src/lib/spec/__tests__/useIconSpecState.test.ts`
- `src/lib/spec/__tests__/iconSpecData.test.ts`

**shadcn primitives (generated):**
- `src/components/ui/{card,badge,input,label,textarea,checkbox,progress,alert}.tsx`

**Rebuilt UI:**
- `src/components/spec/IconSpecTool.tsx` — orchestrator (client)
- `src/components/spec/ClientNameField.tsx`
- `src/components/spec/SpecProgress.tsx`
- `src/components/spec/ExportImportControls.tsx`
- `src/components/spec/IconSpecCard.tsx`
- `src/components/spec/UploadDropzone.tsx`
- `src/components/spec/ValidationResultBadge.tsx`
- `src/components/spec/PreviewMockups/PreviewMockup.tsx` (dispatcher)
- `src/components/spec/PreviewMockups/BrowserTabMockup.tsx`
- `src/components/spec/PreviewMockups/IOSHomeScreenMockup.tsx`
- `src/components/spec/PreviewMockups/MaskableSafeZoneMockup.tsx`
- `src/components/spec/PreviewMockups/GoogleSerpMockup.tsx`
- `src/components/spec/PreviewMockups/SocialCardMockup.tsx`
- Tests: `src/components/spec/__tests__/*.test.tsx`

**Route:**
- `src/app/(admin)/spec/page.tsx`

**Modified:**
- `src/app/page.tsx` — add temporary link to `/spec`

---

## Task 1: Lift portable logic + its tests verbatim

**Files:**
- Create: `src/lib/spec/{types,imageAnalysis,iconSpecData,useImageValidation,useIconSpecState}.ts`
- Create: `src/lib/spec/__tests__/{imageAnalysis,useImageValidation,useIconSpecState,iconSpecData}.test.ts`

- [ ] **Step 1: Copy the five logic files verbatim**

Copy each file's contents unchanged from the source. These files have no imports outside their own folder, so no path edits are needed.

```bash
SRC="/Users/shivanshupareek/Developer/qera/qerastudio/src/app/(utility)/kessler-spec"
DST="src/lib/spec"
mkdir -p "$DST/__tests__"
cp "$SRC/types.ts"              "$DST/types.ts"
cp "$SRC/imageAnalysis.ts"     "$DST/imageAnalysis.ts"
cp "$SRC/iconSpecData.ts"      "$DST/iconSpecData.ts"
cp "$SRC/useImageValidation.ts" "$DST/useImageValidation.ts"
cp "$SRC/useIconSpecState.ts"  "$DST/useIconSpecState.ts"
```

- [ ] **Step 2: Copy the four logic test files verbatim**

The source keeps these tests in `kessler-spec/__tests__/`. Their relative imports point one level up (`../useImageValidation`, `../iconSpecData`). In the new location `src/lib/spec/__tests__/`, the same `../` depth resolves to `src/lib/spec/` — so imports work unchanged. Copy verbatim.

```bash
SRC="/Users/shivanshupareek/Developer/qera/qerastudio/src/app/(utility)/kessler-spec/__tests__"
DST="src/lib/spec/__tests__"
cp "$SRC/imageAnalysis.test.ts"     "$DST/imageAnalysis.test.ts"
cp "$SRC/useImageValidation.test.ts" "$DST/useImageValidation.test.ts"
cp "$SRC/useIconSpecState.test.ts"  "$DST/useIconSpecState.test.ts"
cp "$SRC/iconSpecData.test.ts"      "$DST/iconSpecData.test.ts"
```

- [ ] **Step 3: Run the lifted tests to verify they pass unchanged**

Run: `npx jest src/lib/spec --silent`
Expected: PASS — all four suites green. These are the correctness guarantee for the lifted logic; they must pass with zero edits. If any fail, the cause is an environment gap (e.g. a missing DOM stub), not a logic change — fix the environment, never the lifted logic.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/spec
git commit -m "feat(spec): lift icon-tool portable logic + tests verbatim"
```

---

## Task 2: Install shadcn primitives

**Files:**
- Create: `src/components/ui/{card,badge,input,label,textarea,checkbox,progress,alert}.tsx`

- [ ] **Step 1: Add the primitives non-interactively**

Run:
```bash
npx shadcn@latest add card badge input label textarea checkbox progress alert --yes
```
Expected: eight new files appear in `src/components/ui/`. (`button.tsx` already exists — do not re-add.)

- [ ] **Step 2: Verify they compile**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui components.json package.json package-lock.json
git commit -m "chore(spec): add shadcn primitives for the icon tool"
```

---

## Task 3: ClientNameField (shadcn Input + Label)

**Files:**
- Create: `src/components/spec/ClientNameField.tsx`
- Test: `src/components/spec/__tests__/ClientNameField.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientNameField from '../ClientNameField';

describe('ClientNameField', () => {
  it('renders a labelled text input with the current value', () => {
    render(<ClientNameField value="Acme Co." onChange={() => {}} />);
    const input = screen.getByLabelText(/client \/ project name/i);
    expect(input).toHaveValue('Acme Co.');
  });

  it('calls onChange as the user types', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<ClientNameField value="" onChange={onChange} />);
    await user.type(screen.getByLabelText(/client \/ project name/i), 'Z');
    expect(onChange).toHaveBeenCalledWith('Z');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest src/components/spec/__tests__/ClientNameField.test.tsx`
Expected: FAIL — cannot find `../ClientNameField`.

- [ ] **Step 3: Implement**

```tsx
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClientNameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ClientNameField({ value, onChange }: ClientNameFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="client-name">Client / project name</Label>
      <Input
        id="client-name"
        type="text"
        placeholder="e.g. Zaib, Qera Studio, Acme Co."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/spec/__tests__/ClientNameField.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/spec/ClientNameField.tsx src/components/spec/__tests__/ClientNameField.test.tsx
git commit -m "feat(spec): ClientNameField in shadcn"
```

---

## Task 4: SpecProgress (shadcn Progress + count)

**Files:**
- Create: `src/components/spec/SpecProgress.tsx`
- Test: `src/components/spec/__tests__/SpecProgress.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import SpecProgress from '../SpecProgress';

describe('SpecProgress', () => {
  it('exposes progress via a progressbar role with correct aria values', () => {
    render(<SpecProgress reviewed={3} total={10} />);
    const bar = screen.getByRole('progressbar', { name: /3 of 10/i });
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
  });

  it('renders a human-readable count', () => {
    render(<SpecProgress reviewed={3} total={10} />);
    expect(screen.getByText('3 of 10 reviewed')).toBeInTheDocument();
  });

  it('does not divide by zero when total is 0', () => {
    render(<SpecProgress reviewed={0} total={0} />);
    expect(screen.getByText('0 of 0 reviewed')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest src/components/spec/__tests__/SpecProgress.test.tsx`
Expected: FAIL — cannot find `../SpecProgress`.

- [ ] **Step 3: Implement**

Renders our own `role="progressbar"` wrapper (so the aria contract is explicit and testable) with a token-styled fill; does not rely on the shadcn `Progress` internals for the ARIA values.

```tsx
interface SpecProgressProps {
  reviewed: number;
  total: number;
}

export default function SpecProgress({ reviewed, total }: SpecProgressProps) {
  const percent = total === 0 ? 0 : Math.round((reviewed / total) * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-valuenow={reviewed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${reviewed} of ${total} icon slots reviewed`}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {reviewed} of {total} reviewed
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/spec/__tests__/SpecProgress.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/spec/SpecProgress.tsx src/components/spec/__tests__/SpecProgress.test.tsx
git commit -m "feat(spec): SpecProgress bar"
```

---

## Task 5: ValidationResultBadge (tri-state rows via Badge)

**Files:**
- Create: `src/components/spec/ValidationResultBadge.tsx`
- Test: `src/components/spec/__tests__/ValidationResultBadge.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import ValidationResultBadge from '../ValidationResultBadge';
import type { ValidationResult } from '@/lib/spec/types';

const base: ValidationResult = {
  dimensionsOk: true,
  formatOk: true,
  transparency: 'opaque',
  transparencyIsWarning: false,
  actualWidth: 32,
  actualHeight: 32,
  actualFormat: 'image/png',
  objectUrl: 'blob:mock',
};

describe('ValidationResultBadge', () => {
  it('shows Pass for a fully valid opaque result', () => {
    render(<ValidationResultBadge result={base} />);
    expect(screen.getByText(/dimensions/i)).toBeInTheDocument();
    expect(screen.getByText(/32×32px/)).toBeInTheDocument();
    expect(screen.getAllByText('Pass').length).toBeGreaterThanOrEqual(2);
  });

  it('shows a Warning row when transparency is required but detected', () => {
    render(
      <ValidationResultBadge
        result={{ ...base, transparency: 'transparent', transparencyIsWarning: true }}
      />,
    );
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText(/expects a solid\/opaque background/i)).toBeInTheDocument();
  });

  it('shows Unknown and a note for an .ico-style result', () => {
    render(
      <ValidationResultBadge
        result={{
          ...base,
          dimensionsOk: 'unknown',
          transparency: 'unknown',
          note: 'pixel inspection not supported',
        }}
      />,
    );
    expect(screen.getAllByText('Unknown').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/pixel inspection not supported/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest src/components/spec/__tests__/ValidationResultBadge.test.tsx`
Expected: FAIL — cannot find `../ValidationResultBadge`.

- [ ] **Step 3: Implement**

Preserve the exact text strings from the source (tests above assert on them). Map tri-state → Badge variant + a Tailwind color for the status word.

```tsx
import { Badge } from '@/components/ui/badge';
import type { ValidationResult, ValidationTriState } from '@/lib/spec/types';

function statusFor(ok: ValidationTriState): { label: string; variant: 'default' | 'destructive' | 'secondary' } {
  if (ok === 'unknown') return { label: 'Unknown', variant: 'secondary' };
  return ok ? { label: 'Pass', variant: 'default' } : { label: 'Fail', variant: 'destructive' };
}

export default function ValidationResultBadge({ result }: { result: ValidationResult }) {
  const dimensions = statusFor(result.dimensionsOk);
  const format = statusFor(result.formatOk);

  const transparency =
    result.transparency === 'unknown'
      ? { label: 'Unknown', variant: 'secondary' as const }
      : result.transparencyIsWarning
        ? { label: 'Warning', variant: 'destructive' as const }
        : { label: 'Pass', variant: 'default' as const };

  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      <li className="flex items-center gap-2">
        <Badge variant={dimensions.variant}>{dimensions.label}</Badge>
        <span className="text-muted-foreground">
          Dimensions
          {result.actualWidth && result.actualHeight ? ` — ${result.actualWidth}×${result.actualHeight}px` : ''}
        </span>
      </li>
      <li className="flex items-center gap-2">
        <Badge variant={format.variant}>{format.label}</Badge>
        <span className="text-muted-foreground">Format{result.actualFormat ? ` — ${result.actualFormat}` : ''}</span>
      </li>
      <li className="flex items-center gap-2">
        <Badge variant={transparency.variant}>{transparency.label}</Badge>
        <span className="text-muted-foreground">
          {result.transparency === 'unknown'
            ? 'Transparency — not checked for this format'
            : result.transparency === 'transparent'
              ? 'Transparency detected — this slot expects a solid/opaque background'
              : 'No transparency detected'}
        </span>
      </li>
      {result.note && <li className="text-xs text-muted-foreground">{result.note}</li>}
    </ul>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/spec/__tests__/ValidationResultBadge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/spec/ValidationResultBadge.tsx src/components/spec/__tests__/ValidationResultBadge.test.tsx
git commit -m "feat(spec): ValidationResultBadge tri-state rows"
```

---

## Task 6: UploadDropzone (hidden file input + button label)

**Files:**
- Create: `src/components/spec/UploadDropzone.tsx`
- Test: `src/components/spec/__tests__/UploadDropzone.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadDropzone from '../UploadDropzone';

describe('UploadDropzone', () => {
  it('renders an Upload file control reachable by keyboard', () => {
    render(<UploadDropzone id="favicon-32" format="png" fileName={null} onFileSelected={() => {}} />);
    const input = screen.getByLabelText(/upload file/i);
    expect(input).not.toHaveAttribute('tabindex', '-1');
  });

  it('shows the selected file name and switches label to Replace file', () => {
    render(<UploadDropzone id="favicon-32" format="png" fileName="logo.png" onFileSelected={() => {}} />);
    expect(screen.getByText('logo.png')).toBeInTheDocument();
    expect(screen.getByLabelText(/replace file/i)).toBeInTheDocument();
  });

  it('calls onFileSelected when a file is chosen', async () => {
    const onFileSelected = jest.fn();
    const user = userEvent.setup();
    render(<UploadDropzone id="favicon-32" format="png" fileName={null} onFileSelected={onFileSelected} />);
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/upload file/i), file);
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest src/components/spec/__tests__/UploadDropzone.test.tsx`
Expected: FAIL — cannot find `../UploadDropzone`.

- [ ] **Step 3: Implement**

The `<input>` is visually hidden but keyboard-focusable (`sr-only` keeps it in the tab order, unlike `hidden`/`display:none`). The `<label>` is styled like a button. `aria-label` on the input carries "Upload file"/"Replace file" so `getByLabelText` finds it.

```tsx
'use client';

import type { IconFormat } from '@/lib/spec/types';

const ACCEPT_BY_FORMAT: Record<IconFormat, string> = {
  ico: '.ico',
  png: 'image/png',
  svg: 'image/svg+xml,.svg',
  jpeg: 'image/jpeg',
};

interface UploadDropzoneProps {
  id: string;
  format: IconFormat;
  fileName: string | null;
  onFileSelected: (file: File) => void;
}

export default function UploadDropzone({ id, format, fileName, onFileSelected }: UploadDropzoneProps) {
  const inputId = `upload-${id}`;
  const label = fileName ? 'Replace file' : 'Upload file';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        id={inputId}
        type="file"
        aria-label={label}
        className="sr-only"
        accept={ACCEPT_BY_FORMAT[format]}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      <label
        htmlFor={inputId}
        className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-within:ring-2 focus-within:ring-ring"
      >
        {label}
      </label>
      {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/spec/__tests__/UploadDropzone.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/spec/UploadDropzone.tsx src/components/spec/__tests__/UploadDropzone.test.tsx
git commit -m "feat(spec): UploadDropzone control"
```

---

## Task 7: Preview mockups (5 mockups + dispatcher)

**Files:**
- Create: `src/components/spec/PreviewMockups/{PreviewMockup,BrowserTabMockup,IOSHomeScreenMockup,MaskableSafeZoneMockup,GoogleSerpMockup,SocialCardMockup}.tsx`
- Test: `src/components/spec/__tests__/PreviewMockup.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import PreviewMockup from '../PreviewMockups/PreviewMockup';

describe('PreviewMockup dispatcher', () => {
  it('renders nothing for kind "none"', () => {
    const { container } = render(<PreviewMockup kind="none" imageUrl="blob:x" alt="x" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the uploaded image for a browserTab mockup', () => {
    render(<PreviewMockup kind="browserTab" imageUrl="blob:x" alt="my favicon" />);
    expect(screen.getByAltText('my favicon')).toHaveAttribute('src', 'blob:x');
  });

  it('renders the uploaded image for a googleSerp mockup', () => {
    render(<PreviewMockup kind="googleSerp" imageUrl="blob:y" alt="serp favicon" />);
    expect(screen.getByAltText('serp favicon')).toHaveAttribute('src', 'blob:y');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest src/components/spec/__tests__/PreviewMockup.test.tsx`
Expected: FAIL — cannot find `../PreviewMockups/PreviewMockup`.

- [ ] **Step 3: Implement the five mockups**

Each keeps a plain `<img>` with the `blob:` object URL (not `next/image` — object URLs aren't optimizable; keep the `eslint-disable-next-line @next/next/no-img-element` comment). Restyle with Tailwind tokens. Preserve the exact caption/note text from the source.

`BrowserTabMockup.tsx`:
```tsx
interface MockupProps {
  imageUrl: string;
  alt: string;
}

// Uploaded assets are local blob: object URLs, not static paths next/image can
// optimize — a plain <img> is the correct tool here.
export default function BrowserTabMockup({ imageUrl, alt }: MockupProps) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="flex">
        <div className="flex items-center gap-2 rounded-t-md border border-border bg-background px-3 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={alt} width={16} height={16} className="h-4 w-4 object-contain" />
          <span className="text-xs text-foreground">Sample Brand</span>
        </div>
      </div>
    </div>
  );
}
```

`IOSHomeScreenMockup.tsx`:
```tsx
interface MockupProps {
  imageUrl: string;
  alt: string;
}

export default function IOSHomeScreenMockup({ imageUrl, alt }: MockupProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-border bg-muted/40 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={alt} width={80} height={80} className="h-20 w-20 rounded-[18px] object-cover" />
      <span className="text-xs text-foreground">Sample Brand</span>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        iOS applies its own rounded-corner mask — this is an approximation for judging centering and background color.
      </p>
    </div>
  );
}
```

`MaskableSafeZoneMockup.tsx`:
```tsx
interface MockupProps {
  imageUrl: string;
  alt: string;
}

export default function MaskableSafeZoneMockup({ imageUrl, alt }: MockupProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-muted/40 p-3">
      <div className="relative h-24 w-24 overflow-hidden rounded-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto h-[80%] w-[80%] rounded-full border-2 border-dashed border-primary/70"
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Keep essential content inside the circle — Android may crop anything outside it into a circle, squircle, or
        rounded square.
      </p>
    </div>
  );
}
```

`GoogleSerpMockup.tsx`:
```tsx
interface MockupProps {
  imageUrl: string;
  alt: string;
}

export default function GoogleSerpMockup({ imageUrl, alt }: MockupProps) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="mb-1 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={alt} width={18} height={18} className="h-[18px] w-[18px] rounded-full object-cover" />
        <div>
          <p className="text-xs text-foreground">Sample Brand</p>
          <p className="text-xs text-muted-foreground">www.samplebrand.com</p>
        </div>
      </div>
      <p className="text-sm text-primary">Sample Brand — Home</p>
      <p className="text-xs text-muted-foreground">
        A short placeholder description showing how this favicon appears next to a search result.
      </p>
    </div>
  );
}
```

`SocialCardMockup.tsx`:
```tsx
interface MockupProps {
  imageUrl: string;
  alt: string;
  square?: boolean;
}

export default function SocialCardMockup({ imageUrl, alt, square = false }: MockupProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted/40">
      <div className={square ? 'aspect-square' : 'aspect-[1200/630]'}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
      </div>
      <div className="p-3">
        <p className="text-sm text-foreground">Sample Brand — Home</p>
        <p className="text-xs text-muted-foreground">samplebrand.com</p>
      </div>
    </div>
  );
}
```

`PreviewMockup.tsx` (dispatcher, verbatim logic from source):
```tsx
import type { PreviewMockupKind } from '@/lib/spec/types';
import BrowserTabMockup from './BrowserTabMockup';
import IOSHomeScreenMockup from './IOSHomeScreenMockup';
import MaskableSafeZoneMockup from './MaskableSafeZoneMockup';
import GoogleSerpMockup from './GoogleSerpMockup';
import SocialCardMockup from './SocialCardMockup';

interface PreviewMockupProps {
  kind: PreviewMockupKind;
  imageUrl: string;
  alt: string;
}

export default function PreviewMockup({ kind, imageUrl, alt }: PreviewMockupProps) {
  switch (kind) {
    case 'browserTab':
      return <BrowserTabMockup imageUrl={imageUrl} alt={alt} />;
    case 'iosHomeScreen':
      return <IOSHomeScreenMockup imageUrl={imageUrl} alt={alt} />;
    case 'maskableSafeZone':
      return <MaskableSafeZoneMockup imageUrl={imageUrl} alt={alt} />;
    case 'googleSerp':
      return <GoogleSerpMockup imageUrl={imageUrl} alt={alt} />;
    case 'socialCard':
      return <SocialCardMockup imageUrl={imageUrl} alt={alt} />;
    case 'none':
    default:
      return null;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/spec/__tests__/PreviewMockup.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/spec/PreviewMockups src/components/spec/__tests__/PreviewMockup.test.tsx
git commit -m "feat(spec): preview mockups (browser tab, iOS, maskable, SERP, social)"
```

---

## Task 8: ExportImportControls (Button + hidden import input + Alert)

**Files:**
- Create: `src/components/spec/ExportImportControls.tsx`
- Test: `src/components/spec/__tests__/ExportImportControls.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportImportControls from '../ExportImportControls';
import type { ExportedProgress } from '@/lib/spec/types';

const sample: ExportedProgress = {
  schemaVersion: 1,
  clientName: 'Acme Co.',
  exportedAt: '2026-07-23T00:00:00.000Z',
  slots: {},
};

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:mock') });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() });
});

describe('ExportImportControls', () => {
  it('renders export and import controls', () => {
    render(
      <ExportImportControls clientName="Acme Co." onExport={() => sample} onImport={() => true} importError={null} />,
    );
    expect(screen.getByRole('button', { name: /export progress/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/import progress/i)).toBeInTheDocument();
  });

  it('triggers the export handler and creates a downloadable blob', async () => {
    const onExport = jest.fn(() => sample);
    const user = userEvent.setup();
    render(<ExportImportControls clientName="Acme Co." onExport={onExport} onImport={() => true} importError={null} />);
    await user.click(screen.getByRole('button', { name: /export progress/i }));
    expect(onExport).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('surfaces an import error via a role=alert region', () => {
    render(
      <ExportImportControls
        clientName="Acme Co."
        onExport={() => sample}
        onImport={() => false}
        importError="This file is not a valid kessler-spec export."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/not a valid/i);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest src/components/spec/__tests__/ExportImportControls.test.tsx`
Expected: FAIL — cannot find `../ExportImportControls`.

- [ ] **Step 3: Implement**

Port the export/import handler logic verbatim from the source (blob download, FileReader import, slugify). The import `<input>` carries `aria-label="Import progress"` so `getByLabelText` finds it; the visible trigger is a button-styled label.

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ExportedProgress } from '@/lib/spec/types';

interface ExportImportControlsProps {
  clientName: string;
  onExport: () => ExportedProgress;
  onImport: (raw: string) => boolean;
  importError: string | null;
}

function slugify(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || 'kessler-spec';
}

export default function ExportImportControls({ clientName, onExport, onImport, importError }: ExportImportControlsProps) {
  const handleExport = () => {
    const data = onExport();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slugify(clientName)}-icon-spec-progress.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onImport(reader.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleExport}>
          Export progress (JSON)
        </Button>

        <input
          id="import-progress"
          type="file"
          accept="application/json"
          aria-label="Import progress"
          className="sr-only"
          onChange={handleImportChange}
        />
        <label
          htmlFor="import-progress"
          className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-within:ring-2 focus-within:ring-ring"
        >
          Import progress
        </label>
      </div>

      {importError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{importError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/spec/__tests__/ExportImportControls.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/spec/ExportImportControls.tsx src/components/spec/__tests__/ExportImportControls.test.tsx
git commit -m "feat(spec): ExportImportControls"
```

---

## Task 9: IconSpecCard (Card + Badge + upload + validation + notes)

**Files:**
- Create: `src/components/spec/IconSpecCard.tsx`
- Test: `src/components/spec/__tests__/IconSpecCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Adapted from the source IconSpecCard test (uses a real spec from lifted data). Mocks `URL.createObjectURL`.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IconSpecCard from '../IconSpecCard';
import { ICON_SPECS } from '@/lib/spec/iconSpecData';
import type { SlotState } from '@/lib/spec/types';

const spec = ICON_SPECS.find((s) => s.id === 'favicon-192')!;
const emptySlotState: SlotState = { reviewed: false, passed: null, notes: '' };

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:mock') });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() });
});

describe('IconSpecCard', () => {
  it('renders the spec name as a heading', () => {
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={() => {}} />);
    expect(screen.getByRole('heading', { name: spec.name })).toBeInTheDocument();
  });

  it('renders the filename and a priority badge', () => {
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={() => {}} />);
    expect(screen.getByText(spec.filename)).toBeInTheDocument();
    expect(screen.getByText(spec.priority === 'required' ? 'Required' : 'Nice to have')).toBeInTheDocument();
  });

  it('upload control is reachable by keyboard', () => {
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={() => {}} />);
    expect(screen.getByLabelText(/upload file/i)).not.toHaveAttribute('tabindex', '-1');
  });

  it('"mark reviewed" checkbox calls onUpdate when toggled', async () => {
    const onUpdate = jest.fn();
    const user = userEvent.setup();
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={onUpdate} />);
    await user.click(screen.getByRole('checkbox', { name: /mark reviewed/i }));
    expect(onUpdate).toHaveBeenCalledWith({ reviewed: true });
  });

  it('notes textarea calls onUpdate as the user types', async () => {
    const onUpdate = jest.fn();
    const user = userEvent.setup();
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={onUpdate} />);
    await user.type(screen.getByLabelText(/notes/i), 'x');
    expect(onUpdate).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest src/components/spec/__tests__/IconSpecCard.test.tsx`
Expected: FAIL — cannot find `../IconSpecCard`.

- [ ] **Step 3: Implement**

Port the source card's behavior verbatim (file→validate→auto-pass→onUpdate), swapping presentational markup for shadcn `Card`/`Badge`/`Checkbox`/`Textarea`. The shadcn `Checkbox` (Radix) fires `onCheckedChange` with a boolean, not a DOM event — call `onUpdate({ reviewed: Boolean(checked) })`.

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { IconSpec, SlotState, ValidationResult } from '@/lib/spec/types';
import { useImageValidation } from '@/lib/spec/useImageValidation';
import UploadDropzone from './UploadDropzone';
import ValidationResultBadge from './ValidationResultBadge';
import PreviewMockup from './PreviewMockups/PreviewMockup';

interface IconSpecCardProps {
  spec: IconSpec;
  slotState: SlotState;
  onUpdate: (patch: Partial<SlotState>) => void;
}

export default function IconSpecCard({ spec, slotState, onUpdate }: IconSpecCardProps) {
  const { validateFile } = useImageValidation();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const validation = await validateFile(file, spec);
      setResult(validation);
      const passed =
        validation.dimensionsOk !== false && validation.formatOk !== false && !validation.transparencyIsWarning;
      onUpdate({ reviewed: true, passed });
    } catch {
      setError('Could not read this file — try a different image.');
    }
  };

  return (
    <Card aria-labelledby={`${spec.id}-heading`}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <h3 id={`${spec.id}-heading`} className="text-base font-semibold text-foreground">
          {spec.name}
        </h3>
        <Badge variant={spec.priority === 'required' ? 'default' : 'secondary'}>
          {spec.priority === 'required' ? 'Required' : 'Nice to have'}
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Filename</dt>
          <dd>
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{spec.filename}</code>
          </dd>
          <dt className="text-muted-foreground">Size</dt>
          <dd>
            {spec.acceptedDimensions.length > 0
              ? spec.acceptedDimensions.map((d) => `${d.width}×${d.height}px`).join(' or ')
              : 'Vector — no fixed pixel size'}
          </dd>
          <dt className="text-muted-foreground">Used in</dt>
          <dd>{spec.usedIn}</dd>
          <dt className="text-muted-foreground">Why it matters</dt>
          <dd>{spec.whyItMatters}</dd>
          <dt className="text-muted-foreground">Industry standard</dt>
          <dd>{spec.industryStandard}</dd>
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <UploadDropzone id={spec.id} format={spec.format} fileName={fileName} onFileSelected={handleFileSelected} />
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${spec.id}-reviewed`}
              checked={slotState.reviewed}
              onCheckedChange={(checked) => onUpdate({ reviewed: Boolean(checked) })}
            />
            <Label htmlFor={`${spec.id}-reviewed`}>Mark reviewed</Label>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {result && (
          <div className="flex flex-col gap-3">
            <ValidationResultBadge result={result} />
            {spec.previewMockup !== 'none' && (
              <PreviewMockup kind={spec.previewMockup} imageUrl={result.objectUrl} alt={`${spec.name} preview`} />
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${spec.id}-notes`}>Notes</Label>
          <Textarea
            id={`${spec.id}-notes`}
            value={slotState.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            rows={2}
            placeholder="Optional notes for this slot…"
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/spec/__tests__/IconSpecCard.test.tsx`
Expected: PASS. If the `Checkbox` interaction fails because Radix needs pointer capture APIs, the `jest.setup.ts` stubs already cover the common jsdom gaps; if a `hasPointerCapture`/`scrollIntoView` error appears, add those stubs to `jest.setup.ts` inside `installDomStubs()` — do not change the component.

- [ ] **Step 5: Commit**

```bash
git add src/components/spec/IconSpecCard.tsx src/components/spec/__tests__/IconSpecCard.test.tsx
git commit -m "feat(spec): IconSpecCard in shadcn"
```

---

## Task 10: IconSpecTool orchestrator

**Files:**
- Create: `src/components/spec/IconSpecTool.tsx`
- Test: `src/components/spec/__tests__/IconSpecTool.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import IconSpecTool from '../IconSpecTool';
import { ICON_SPECS } from '@/lib/spec/iconSpecData';

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:mock') });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() });
});

describe('IconSpecTool', () => {
  it('renders the tool title as the single h1', () => {
    render(<IconSpecTool />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/icon & logo spec checklist/i);
  });

  it('renders a card per icon spec', () => {
    render(<IconSpecTool />);
    // each card exposes its name as a level-3 heading
    for (const spec of ICON_SPECS) {
      expect(screen.getByRole('heading', { name: spec.name })).toBeInTheDocument();
    }
  });

  it('renders the client name field and progress bar', () => {
    render(<IconSpecTool />);
    expect(screen.getByLabelText(/client \/ project name/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest src/components/spec/__tests__/IconSpecTool.test.tsx`
Expected: FAIL — cannot find `../IconSpecTool`.

- [ ] **Step 3: Implement**

```tsx
'use client';

import { ICON_SPECS } from '@/lib/spec/iconSpecData';
import { useIconSpecState } from '@/lib/spec/useIconSpecState';
import ClientNameField from './ClientNameField';
import SpecProgress from './SpecProgress';
import ExportImportControls from './ExportImportControls';
import IconSpecCard from './IconSpecCard';

export default function IconSpecTool() {
  const {
    clientName,
    setClientName,
    slots,
    updateSlot,
    exportProgress,
    importProgress,
    importError,
    reviewedCount,
    totalCount,
  } = useIconSpecState();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">Icon &amp; Logo Spec Checklist</h1>
        <p className="text-sm text-muted-foreground">
          Upload each asset variant, check it against the spec, and judge visual quality in a realistic context. Works
          for any brand/client — not tied to Qera.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <ClientNameField value={clientName} onChange={setClientName} />
        <SpecProgress reviewed={reviewedCount} total={totalCount} />
      </div>

      <ExportImportControls
        clientName={clientName}
        onExport={exportProgress}
        onImport={importProgress}
        importError={importError}
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {ICON_SPECS.map((spec) => (
          <IconSpecCard
            key={spec.id}
            spec={spec}
            slotState={slots[spec.id] ?? { reviewed: false, passed: null, notes: '' }}
            onUpdate={(patch) => updateSlot(spec.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/spec/__tests__/IconSpecTool.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/spec/IconSpecTool.tsx src/components/spec/__tests__/IconSpecTool.test.tsx
git commit -m "feat(spec): IconSpecTool orchestrator"
```

---

## Task 11: Authenticated `/spec` route

**Files:**
- Create: `src/app/(admin)/spec/page.tsx`
- Test: `src/app/(admin)/spec/__tests__/page.test.tsx`

- [ ] **Step 1: Write the failing test**

Mocks the auth session and asserts the page renders the tool for an authorized user, and redirects otherwise. Mirror the redirect contract of `src/app/page.tsx`.

```tsx
import { render, screen } from '@testing-library/react';

const requireAuthorizedUser = jest.fn();
const redirect = jest.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

jest.mock('@/lib/auth/session', () => ({
  requireAuthorizedUser: (...args: unknown[]) => requireAuthorizedUser(...args),
}));
jest.mock('next/navigation', () => ({
  redirect: (url: string) => redirect(url),
}));

import SpecPage from '../page';

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:mock') });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() });
});

describe('/spec page', () => {
  it('renders the icon tool for an authorized user', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'shivanshu@qera.studio' });
    render(await SpecPage());
    expect(screen.getByRole('heading', { level: 1, name: /icon & logo spec checklist/i })).toBeInTheDocument();
  });

  it('redirects a signed-in but unauthorized user to /no-access', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHORIZED'));
    await expect(SpecPage()).rejects.toThrow('REDIRECT:/no-access');
  });

  it('redirects an unauthenticated user to /sign-in', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHENTICATED'));
    await expect(SpecPage()).rejects.toThrow('REDIRECT:/sign-in');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest "src/app/(admin)/spec/__tests__/page.test.tsx"`
Expected: FAIL — cannot find `../page`.

- [ ] **Step 3: Implement**

Mirror the auth/redirect pattern from `src/app/page.tsx` exactly.

```tsx
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import IconSpecTool from '@/components/spec/IconSpecTool';

export const metadata: Metadata = {
  title: 'Icon Spec — speclr',
  robots: { index: false, follow: false },
};

// Reads the Clerk session cookie on every request.
export const dynamic = 'force-dynamic';

export default async function SpecPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  return (
    <main id="main-content">
      <IconSpecTool />
    </main>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest "src/app/(admin)/spec/__tests__/page.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/spec"
git commit -m "feat(spec): authenticated /spec route"
```

---

## Task 12: Temporary home link to `/spec`

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add the temporary link**

In the authenticated branch of `src/app/page.tsx` (after `requireAuthorizedUser()` succeeds), add a `next/link` styled with `buttonVariants` to `/spec`, with a comment marking it temporary. **Note:** this project's Base UI `Button` does NOT support Radix's `asChild` prop — apply `buttonVariants()` classes directly to the `<Link>` instead (Base UI uses a `render` prop for polymorphism, but styling the link directly is simpler and avoids the question). Add the imports:

```tsx
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
```

And inside the returned `<main>`, above the sign-out block:

```tsx
{/* TEMP: direct link until Phase 4a builds real navigation. */}
<div className="mt-6">
  <Link href="/spec" className={buttonVariants({ variant: 'outline' })}>
    Open Icon Spec tool
  </Link>
</div>
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(spec): temporary home link to /spec"
```

---

## Task 13: Full verification

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all suites pass, including the lifted `src/lib/spec` tests and every new `src/components/spec` / `(admin)/spec` test. No console errors.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds; `/spec` appears in the route list as a dynamic route.

- [ ] **Step 4: Manual browser check (record results)**

Start `npm run dev`, sign in as an allowlisted user, and verify against the spec's Verification section:
1. `/spec` renders the tool; unauthenticated → `/sign-in`; signed-in-not-allowlisted → `/no-access`.
2. Upload a 32×32 PNG to a small-favicon slot → Pass; wrong size → dimensions Fail; `.ico` → Unknown + note; transparent PNG to opaque-required slot → Warning.
3. Export → JSON downloads with slug filename; reload → localStorage restores; import file → restored; import garbage → destructive Alert.
4. Keyboard-only: tab reaches upload, mark-reviewed, notes on a card.
5. Home page shows the temporary "Open Icon Spec tool" link and it navigates to `/spec`.

- [ ] **Step 5: Final commit (only if manual check surfaced fixes)**

```bash
git add -A
git commit -m "fix(spec): address manual verification findings"
```

---

## Self-review checklist (completed during authoring)

- **Spec coverage:** route ✓ (T11), lifted logic ✓ (T1), all 12 UI components ✓ (T3–T10), temp link ✓ (T12), tests ✓ (each task), verification ✓ (T13). No spec requirement is unaddressed.
- **No placeholders:** every code step contains full code; every test step contains full test code and exact run commands with expected output.
- **Type consistency:** `ValidationTriState`, `SlotState`, `IconSpec`, `ExportedProgress`, `PreviewMockupKind` all sourced from `@/lib/spec/types`; hook return shape (`setClientName`, `updateSlot`, `exportProgress`, `importProgress`, `importError`, `reviewedCount`, `totalCount`) matches the lifted `useIconSpecState`. `onCheckedChange`(boolean) vs DOM-event difference for Radix `Checkbox` is called out explicitly in T9.
