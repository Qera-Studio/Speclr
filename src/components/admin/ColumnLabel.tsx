import type { LucideIcon } from 'lucide-react';

/**
 * A table column heading: its icon, then its name.
 *
 * The icon sits in the *header*, not in every cell — one glyph per column reads
 * as a type marker ("this column holds an email"), where the same glyph repeated
 * down 24 rows is noise that competes with the data it labels.
 *
 * Marked `aria-hidden`: the icon restates the column name beside it, so
 * announcing it would make a screen reader say the column twice.
 */
export default function ColumnLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {children}
    </span>
  );
}
