'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { searchAll, type SearchHit } from '@/server/actions/search';

/**
 * The header search: documents, clients, employees and services in one list.
 *
 * A plain input with a listbox anchored under it, rather than a Popover — a
 * popover moves focus, and this must never take the caret out of the field
 * mid-word. Arrow keys move the active option, Enter opens it, Escape closes.
 * ⌘K / Ctrl-K focuses the field from anywhere.
 *
 * The lookup is debounced and aborted when superseded, and it fails silently:
 * an empty result and a failed request look the same to the user, which is
 * correct — neither is something they can act on.
 */

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

export default function SearchCommand() {
  const router = useRouter();
  const inputId = useId();
  const listId = `${inputId}-results`;
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setHits([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchAll(trimmed);
        if (cancelled) return;
        setHits(results);
        setActive(0);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // ⌘K / Ctrl-K from anywhere puts the caret in the field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Compared explicitly rather than lowercased: this listener is on
      // `document`, so it sees every keydown on the page — including synthetic
      // ones from component libraries and autofill that carry no `key` at all.
      // `event.key.toLowerCase()` on one of those took the whole page down.
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQuery('');
    setHits([]);
    inputRef.current?.blur();
    router.push(hit.href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!hits.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % hits.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const hit = hits[active];
      if (hit) go(hit);
    }
  };

  const showList = open && query.trim().length >= MIN_QUERY;
  // Group headings are rendered inline: the first hit of each group carries one.
  let lastGroup: string | null = null;

  return (
    <div className="relative ml-auto w-full max-w-xs">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        id={inputId}
        type="search"
        placeholder="Search…"
        aria-label="Search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={showList && hits[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className="pl-8"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Deferred so a click on a result lands before the list unmounts.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />

      {showList ? (
        <div className="absolute top-full right-0 z-50 mt-1 w-full min-w-72 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {hits.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground" role="status">
              {loading ? 'Searching…' : 'No matches.'}
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Search results" className="max-h-80 overflow-y-auto py-1">
              {hits.map((hit, index) => {
                const heading = hit.group !== lastGroup ? hit.group : null;
                lastGroup = hit.group;
                return (
                  <li key={`${hit.group}-${hit.id}`}>
                    {heading ? (
                      <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                        {heading}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={index === active}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(hit)}
                      className={cn(
                        'flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left text-sm',
                        index === active && 'bg-accent text-accent-foreground',
                      )}
                    >
                      <span className="truncate font-medium">{hit.label}</span>
                      {hit.hint ? (
                        <span className="truncate text-xs text-muted-foreground">{hit.hint}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
