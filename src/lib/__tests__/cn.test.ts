import { cn } from '../utils';

/**
 * The merger knows the house tokens. Without this, `text-meta` is read as a
 * colour and lost to any colour class beside it, which is invisible in jsdom
 * and measured in a browser as 16px text wearing no size class at all.
 */
describe('cn', () => {
  it('keeps a type token beside a text colour', () => {
    expect(cn('text-meta text-muted-foreground')).toBe('text-meta text-muted-foreground');
    expect(cn('text-left text-meta', 'text-sidebar-accent-foreground')).toContain('text-meta');
  });

  it('lets a later type token replace an earlier one', () => {
    expect(cn('text-meta', 'text-body')).toBe('text-body');
  });

  it('keeps a shadow token beside a shadow colour and replaces an earlier shadow', () => {
    expect(cn('shadow-raised', 'shadow-overlay')).toBe('shadow-overlay');
    expect(cn('shadow-overlay ring-1')).toBe('shadow-overlay ring-1');
  });
});
