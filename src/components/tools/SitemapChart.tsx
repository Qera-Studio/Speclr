'use client';

import { useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { layoutTree, type PlacedNode, type SitemapNode } from '@/lib/domain/sitemap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

/**
 * A site address in, its sitemap drawn as a tree.
 *
 * The chart is hand-drawn SVG rather than a charting library: the whole drawing
 * is a marker and an elbow per node, and the layout it needs is 20 lines in the
 * domain module. A dependency here would be more code, not less.
 *
 * Nodes the sitemap actually lists are links to the live page — the useful thing
 * to do with a sitemap is open the odd URL and see what is there. Nodes it only
 * implies are drawn hollow and are not links, because there may be no page.
 */

/** Column width. Wide enough for a normal slug before it collides rightward. */
const COL_W = 176;
const ROW_H = 24;
const MARGIN = 16;
/**
 * How far left of the child column an edge turns down. This has to land in the
 * gutter *after* the parent's label — turning down at the parent's own marker
 * runs the vertical straight through its text.
 */
const ELBOW = 14;
/** Longest label drawn before it is cut — SVG text does not wrap or clip. */
const MAX_LABEL = 24;

interface SitemapResult {
  ok: boolean;
  error?: string;
  origin?: string;
  host?: string;
  total?: number;
  truncated?: boolean;
  tree?: SitemapNode;
}

const x = (depth: number) => MARGIN + depth * COL_W;
const y = (row: number) => MARGIN + row * ROW_H + ROW_H / 2;

function truncate(label: string): string {
  return label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label;
}

/** The elbow from a parent's marker to a child's: right, down, then right. */
function elbow(node: PlacedNode, parentRow: number): string {
  const turn = x(node.depth) - ELBOW;
  return `M ${x(node.depth - 1)} ${y(parentRow)} H ${turn} V ${y(node.row)} H ${x(node.depth)}`;
}

function Chart({ tree, origin }: { tree: SitemapNode; origin: string }) {
  const nodes = layoutTree(tree);
  const rowOf = new Map(nodes.map((node) => [node.path, node.row]));

  const depth = Math.max(...nodes.map((node) => node.depth));
  const rows = Math.max(...nodes.map((node) => node.row));
  const width = x(depth) + COL_W;
  const height = y(rows) + MARGIN;

  return (
    // Its own scroll container: a wide tree must never make the page scroll
    // sideways.
    <div className="overflow-auto rounded-lg border border-border bg-card p-2">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Sitemap tree for ${tree.label}, ${nodes.length} nodes`}
        className="max-w-none"
      >
        <g stroke="currentColor" className="text-border" fill="none">
          {nodes.map((node) =>
            node.parentPath === null ? null : (
              <path key={`e-${node.path}`} d={elbow(node, rowOf.get(node.parentPath) ?? 0)} />
            ),
          )}
        </g>

        {nodes.map((node) => {
          const label = truncate(node.label);
          const href = `${origin}${node.path}`;
          const text = (
            <text
              x={x(node.depth) + 10}
              y={y(node.row)}
              dominantBaseline="central"
              // A parent's edge leaves at its own baseline, so it would run
              // straight through its label. Painting a background-coloured
              // stroke under the glyphs knocks the line out behind the text —
              // no need to measure a label to route around it.
              paintOrder="stroke"
              stroke="var(--card)"
              strokeWidth={4}
              strokeLinejoin="round"
              className={`text-[11px] ${
                node.present ? 'fill-foreground' : 'fill-muted-foreground italic'
              }`}
            >
              {label}
            </text>
          );

          return (
            <g key={node.path}>
              <circle
                cx={x(node.depth)}
                cy={y(node.row)}
                r={3.5}
                strokeWidth={1.5}
                className={
                  node.present
                    ? 'fill-primary stroke-primary'
                    : 'fill-card stroke-muted-foreground/60'
                }
              />
              {node.present ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="[&>text]:hover:underline"
                >
                  <title>{href}</title>
                  {text}
                </a>
              ) : (
                <>
                  <title>{`${node.path} — not listed in the sitemap`}</title>
                  {text}
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function SitemapChart() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SitemapResult | null>(null);

  async function read(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/sitemap?url=${encodeURIComponent(url)}`);
      setResult((await response.json()) as SitemapResult);
    } catch {
      setResult({ ok: false, error: 'Could not reach the server. Try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={read} className="flex max-w-lg items-center gap-2" noValidate>
        <Input
          aria-label="Site address"
          placeholder="qera.studio"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          spellCheck={false}
          autoCapitalize="none"
        />
        <Button type="submit" disabled={loading || !url.trim()}>
          {loading ? <Spinner /> : <Search />}
          Read sitemap
        </Button>
      </form>

      {/* One live region for both outcomes, so a screen reader hears the result
          of a submit it cannot otherwise observe. */}
      <div role="status" aria-live="polite" className="flex flex-col gap-3">
        {loading ? <p className="text-sm text-muted-foreground">Reading the sitemap…</p> : null}

        {result && !result.ok ? (
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle />
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        ) : null}

        {result?.ok && result.tree && result.origin ? (
          <>
            <p className="text-sm text-muted-foreground">
              {result.total} {result.total === 1 ? 'URL' : 'URLs'} in{' '}
              <span className="text-foreground">{result.host}</span>
              {result.truncated ? ' — only the first 2,000 are drawn' : ''}. Hollow, italic
              entries are path segments the sitemap implies but does not list.
            </p>
            <Chart tree={result.tree} origin={result.origin} />
          </>
        ) : null}
      </div>

      {!result && !loading ? (
        <Empty className="max-w-lg border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>No site read yet</EmptyTitle>
            <EmptyDescription>
              Enter an address to read its <code>sitemap.xml</code>. Nothing is crawled and nothing
              is saved.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
    </div>
  );
}
