import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Check, Plus, Trash2, Pencil } from "lucide-react";
import { requireAuthorizedUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { PageBody, PageHeader } from "@/components/admin/Page";

export const metadata: Metadata = {
  title: "Kit — speclr",
  robots: { index: false, follow: false },
};

// Reads the live session on every request; nothing else here is dynamic.
export const dynamic = "force-dynamic";

/**
 * The design-system reference: every colour token, button, badge and control
 * the app is allowed to use, on one page.
 *
 * Deliberately a route in this app rather than a Storybook instance. It builds
 * with the real Tailwind config, resolves the real theme tokens, and inherits
 * the real dark mode — so what it shows is what ships, with no second build to
 * keep alive. The rule it documents is *enforced* by
 * `src/__tests__/design-tokens.test.ts`, not by this page.
 *
 * Adding a variant to a primitive? Add it here too, or it will be invisible
 * and get reinvented.
 */

/**
 * Swatch classes are written out in full, never composed as `bg-${token}` —
 * Tailwind v4 scans source text for complete class names, so an interpolated
 * one is simply never generated and the swatch renders transparent.
 */
const COLOR_TOKENS = [
  { token: "background", swatch: "bg-background", use: "Page canvas" },
  { token: "foreground", swatch: "bg-foreground", use: "Body text" },
  { token: "card", swatch: "bg-card", use: "Raised surface" },
  { token: "muted", swatch: "bg-muted", use: "Inset surface" },
  {
    token: "muted-foreground",
    swatch: "bg-muted-foreground",
    use: "Secondary text, icons",
  },
  {
    token: "primary",
    swatch: "bg-primary",
    use: "Brand blue: pass, required, active",
  },
  { token: "secondary", swatch: "bg-secondary", use: "Low-emphasis fill" },
  {
    token: "destructive",
    swatch: "bg-destructive",
    use: "Fail, delete, irreversible",
  },
  {
    token: "warning",
    swatch: "bg-warning",
    use: "Advisory — needs attention, not an error",
  },
  { token: "border", swatch: "bg-border", use: "Hairlines" },
  { token: "ring", swatch: "bg-ring", use: "Focus ring" },
] as const;

const BUTTON_VARIANTS = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const;

/** Every size the Button actually ships. `xs` and `icon-lg` were removed as dead. */
const BUTTON_SIZES = [
  { size: "default", note: "28px, the app default and its dense height" },
  { size: "lg", note: "32px, a form's own submit" },
  { size: "form", note: "38px, matches Input/Combobox/DatePicker inline" },
] as const;

const ICON_SIZES = [
  { cls: "size-3", note: "Inside icon-sm buttons" },
  {
    cls: "size-3.5",
    note: "Inside default buttons — one of the two workhorses",
  },
  { cls: "size-4", note: "Standalone / form-sized — the other workhorse" },
] as const;

function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </div>
      <Separator />
      {children}
    </section>
  );
}

export default async function KitPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : "";
    redirect(reason === "UNAUTHORIZED" ? "/no-access" : "/sign-in");
  }

  return (
    <PageBody className="max-w-4xl gap-10">
      <PageHeader
        title="UI Kit"
        description="Everything the UI is allowed to use. Small on purpose: a short menu is what keeps screens consistent without anyone policing them. Toggle the theme to check both modes."
      />

      <Section
        title="Colour"
        blurb="Neutral greys, one blue, one red, one amber. Always via the token — raw Tailwind palette classes and hex literals fail the test suite."
      >
        <ul className="flex flex-col gap-1">
          {COLOR_TOKENS.map(({ token, swatch, use }) => (
            <li key={token} className="flex items-center gap-3 text-sm">
              <span
                className={`size-7 shrink-0 rounded-md border border-border ${swatch}`}
                aria-hidden="true"
              />
              <code className="w-40 shrink-0 font-mono text-xs">--{token}</code>
              <span className="text-muted-foreground">{use}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Buttons"
        blurb="Six variants, four sizes. Icons inside a button size themselves — don't pass a size class."
      >
        <div className="flex flex-col gap-4">
          {BUTTON_VARIANTS.map((variant) => (
            <div key={variant} className="flex items-center gap-3">
              <code className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                {variant}
              </code>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant={variant}>Label</Button>
                <Button variant={variant}>
                  <Check data-icon="inline-start" />
                  With icon
                </Button>
                <Button variant={variant} disabled>
                  Disabled
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {BUTTON_SIZES.map(({ size, note }) => (
            <div key={size} className="flex items-center gap-3">
              <code className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                {size}
              </code>
              <Button size={size}>Label</Button>
              <span className="text-xs text-muted-foreground">{note}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <code className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
            icon
          </code>
          <div className="flex items-center gap-2">
            <Button size="icon-sm" variant="ghost" aria-label="Add">
              <Plus />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Delete">
              <Trash2 />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            icon-xs / icon-sm / icon — square, always needs an aria-label
          </span>
        </div>
      </Section>

      <Section
        title="Badges"
        blurb="Status and count chips. Same six-variant vocabulary as buttons."
      >
        <div className="flex flex-wrap items-center gap-2">
          {(
            ["default", "secondary", "destructive", "outline", "ghost"] as const
          ).map((v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ))}
        </div>
      </Section>

      <Section
        title="Controls"
        blurb="Two heights only: the compact 28px default for dense admin chrome, and 36px form for anything a person types into."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kit-default">default — 28px</Label>
            <Input
              id="kit-default"
              placeholder="Compact"
              className="max-w-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kit-form">form — 36px</Label>
            <div className="flex max-w-sm items-center gap-2">
              <Input id="kit-form" size="form" placeholder="Roomy" />
              <Button size="form">Save</Button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kit-textarea">Textarea</Label>
            <Textarea
              id="kit-textarea"
              placeholder="Notes"
              className="max-w-sm"
            />
          </div>
        </div>
      </Section>

      <Section
        title="Icons"
        blurb="Lucide only. Effectively two sizes — everything larger is an avatar or an empty state, not an icon."
      >
        <ul className="flex flex-col gap-2">
          {ICON_SIZES.map(({ cls, note }) => (
            <li key={cls} className="flex items-center gap-3 text-sm">
              <span className="flex w-8 justify-center text-muted-foreground">
                <Check className={cls} aria-hidden="true" />
              </span>
              <code className="w-20 shrink-0 font-mono text-xs">{cls}</code>
              <span className="text-muted-foreground">{note}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Alerts"
        blurb="Two variants. Anything advisory rather than broken uses the warning token inline, not a third alert."
      >
        <div className="flex flex-col gap-3">
          <Alert>
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>
              The neutral, informational case.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Something failed</AlertTitle>
            <AlertDescription>Reserved for actual errors.</AlertDescription>
          </Alert>
          <p className="text-sm text-warning">
            text-warning — advisory. Passes AA in both themes.
          </p>
        </div>
      </Section>
    </PageBody>
  );
}
