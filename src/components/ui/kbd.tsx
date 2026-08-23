"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A keycap.
 *
 * `data-slot="kbd"` is load-bearing: TooltipContent already styles
 * `has-data-[slot=kbd]` (tighter right padding) and `**:data-[slot=kbd]`
 * (corner radius), so a keycap dropped into a tooltip lays out correctly with
 * no extra classes at the call site.
 */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-[0.7rem] font-medium text-muted-foreground select-none",
        // Inside a tooltip the surface is --foreground, so the default muted
        // fill would fight it. Tint the tooltip's own background instead.
        "in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

/**
 * Which modifier glyphs to print.
 *
 * Server-renders the Windows/Linux spelling and corrects after mount, rather
 * than guessing from a header — the two markups are identical in shape, so the
 * correction is a text swap inside a fixed-size cap, not a layout shift. Never
 * branch on this during SSR or hydration mismatches will follow.
 */
function useIsMac() {
  const [isMac, setIsMac] = React.useState(false);
  React.useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent));
  }, []);
  return isMac;
}

/** Tokens a `Shortcut` understands; anything else prints verbatim. */
const MAC_GLYPH: Record<string, string> = { mod: "⌘", alt: "⌥", shift: "⇧" };
const PC_GLYPH: Record<string, string> = {
  mod: "Ctrl",
  alt: "Alt",
  shift: "Shift",
};

/**
 * One cap per key: `<Shortcut keys={["mod", "D"]} />` → `⌘` `D` on a Mac,
 * `Ctrl` `D` elsewhere.
 */
function Shortcut({
  keys,
  className,
  ...props
}: React.ComponentProps<"span"> & { keys: string[] }) {
  const glyphs = useIsMac() ? MAC_GLYPH : PC_GLYPH;
  return (
    <KbdGroup className={className} {...props}>
      {keys.map((key) => (
        <Kbd key={key}>{glyphs[key] ?? key}</Kbd>
      ))}
    </KbdGroup>
  );
}

export { Kbd, KbdGroup, Shortcut, useIsMac };
