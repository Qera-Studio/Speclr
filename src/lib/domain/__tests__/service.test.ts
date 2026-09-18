import { menuLineSchema, serviceContentSchema } from '../service';

/**
 * A Service's menu: the priced lines a contract ticks from.
 *
 * The menu is a **new array**, deliberately not `included[]`. `included[]` is
 * parsed for `[blanks]` and every one of those has hand-authored editor copy in
 * `blankMeta.ts`, which its test holds to an exact key set both ways; a form
 * writing into it would shift ordinals and move a client's stored figure onto
 * a different sentence. A menu line is never parsed for blanks, so nothing
 * here can reach that machinery. `blankMeta.test.ts` staying green with this
 * file present is the proof.
 */

/** A Service written before menus existed: every list empty, no `menu` key. */
const bare = {
  dependencies: [],
  pairings: [],
  overview: [],
  included: [],
  accountTerms: [],
  limits: [],
  limitsNotes: [],
  completion: [],
  receives: [],
  receivesNotes: [],
  thirdPartyCosts: '',
  exclusionIds: [],
  clientInputIds: [],
  fee: [],
};

describe("a service's menu", () => {
  it('parses a row written before menus existed', () => {
    const parsed = serviceContentSchema.safeParse(bare);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.menu).toBeUndefined();
  });

  it('parses a menu of priced lines and keeps it', () => {
    const parsed = serviceContentSchema.safeParse({
      ...bare,
      menu: [
        { id: 'm1', text: 'Dark/Light theme system', ratePaise: 12_000_00, unit: 'fixed' },
        {
          id: 'm2',
          text: 'Mobile app UI',
          ratePaise: 5_000_00,
          unit: 'perUnit',
          unitLabel: 'per screen',
          group: 'Product & App',
        },
        // Quoted per engagement: no rate at all is a legitimate line.
        { id: 'm3', text: 'Custom API integration', unit: 'fixed' },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.menu).toHaveLength(3);
      expect(parsed.data.menu?.[1].unitLabel).toBe('per screen');
      expect(parsed.data.menu?.[2].ratePaise).toBeUndefined();
    }
  });

  /**
   * An id is what a client record and a contract line cite, so two lines
   * sharing one would make "the line the client chose" ambiguous.
   */
  it('refuses two lines with one id', () => {
    const parsed = serviceContentSchema.safeParse({
      ...bare,
      menu: [
        { id: 'm1', text: 'One', unit: 'fixed' },
        { id: 'm1', text: 'Two', unit: 'fixed' },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it('refuses a rate that is not whole paise', () => {
    expect(
      menuLineSchema.safeParse({ id: 'm1', text: 'One', ratePaise: 100.5, unit: 'fixed' }).success,
    ).toBe(false);
  });

  it('refuses a unit it does not know', () => {
    expect(
      menuLineSchema.safeParse({ id: 'm1', text: 'One', unit: 'hourly' }).success,
    ).toBe(false);
  });

  it('refuses a line with nothing to say', () => {
    expect(menuLineSchema.safeParse({ id: 'm1', text: '  ', unit: 'fixed' }).success).toBe(false);
  });
});
