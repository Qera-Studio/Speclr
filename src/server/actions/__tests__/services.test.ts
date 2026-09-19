import { PARTS } from '@/lib/domain/seed/parts';
import type { ContractService } from '@/lib/domain/service';

/**
 * The catalogue actions: the auth gate, and the rule that a section save
 * touches only its own fields.
 *
 * `saveService` is a whole-row upsert, so an action that forgot to spread the
 * stored row would silently blank every field its form did not render. That
 * is the failure `updateServiceDetails` was written to prevent, and every
 * action here is held to it: the client sends a section, the server reads the
 * row, and nothing the browser did not send can be lost.
 */

const authorized = jest.fn();
const getService = jest.fn();
const saveService = jest.fn((_s: ContractService) => Promise.resolve());
const insertService = jest.fn((_s: ContractService) => Promise.resolve());
const listServices = jest.fn(() => Promise.resolve([] as ContractService[]));
const archiveService = jest.fn((_code: string) => Promise.resolve());

jest.mock('../authGate', () => ({ authorized: () => authorized() }));
jest.mock('@/db/store', () => ({
  getService: (...a: unknown[]) => getService(...a),
  saveService: (...a: unknown[]) => saveService(a[0] as ContractService),
  insertService: (...a: unknown[]) => insertService(a[0] as ContractService),
  listServices: (...a: unknown[]) => listServices(...(a as [])),
  archiveService: (...a: unknown[]) => archiveService(a[0] as string),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import {
  archiveServiceItem,
  createService,
  removeService,
  saveServiceItem,
  saveServiceSection,
} from '../services';

/** Custom web build, as seeded: twelve inclusions, a Limits table, one item. */
const existing: ContractService = {
  ...PARTS.find((s) => s.code === '06')!,
  ratePaise: 250_000_00,
  items: [
    {
      id: 'I1',
      name: 'GSAP motion system',
      ratePaise: 20_000_00,
      unit: 'fixed',
      archived: false,
    },
  ],
  itemSeq: 2,
};

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue({ id: 'u1', email: 'shivanshu@qera.studio' });
  getService.mockResolvedValue(existing);
});

describe('saveServiceSection', () => {
  it('refuses a signed-out caller before reading anything', async () => {
    authorized.mockResolvedValue(null);
    const result = await saveServiceSection('06', 'items', { items: [] });
    expect(result).toEqual({ success: false, error: 'Unauthorized.' });
    expect(getService).not.toHaveBeenCalled();
    expect(saveService).not.toHaveBeenCalled();
  });

  it('refuses a section it does not know', async () => {
    const result = await saveServiceSection('06', 'overview', {});
    expect(result.success).toBe(false);
    expect(saveService).not.toHaveBeenCalled();
  });

  it('refuses a code that no longer exists', async () => {
    getService.mockResolvedValue(null);
    const result = await saveServiceSection('99', 'items', { items: [] });
    expect(result).toEqual({ success: false, error: 'That service no longer exists.' });
    expect(saveService).not.toHaveBeenCalled();
  });

  /**
   * The items section: new items get ids, kept items keep theirs, and every
   * field the form never showed (the twelve inclusions, the rate, the name)
   * is exactly as it was.
   *
   * The new item is `I3`, not `I2`: `itemSeq` is a high-water mark, so the id
   * a deleted item once held is never handed out again.
   */
  it('writes the items with ids assigned and leaves the rest of the row alone', async () => {
    const result = await saveServiceSection('06', 'items', {
      items: [
        {
          id: 'I1',
          name: 'GSAP motion system',
          ratePaise: 20_000_00,
          unit: 'fixed',
          archived: false,
        },
        {
          id: '',
          name: 'Dark/Light theme system',
          ratePaise: 12_000_00,
          unit: 'fixed',
          archived: false,
        },
      ],
    });
    expect(result).toEqual({ success: true });

    const saved = saveService.mock.calls[0][0];
    expect(saved.items?.map((m) => m.id)).toEqual(['I1', 'I3']);
    expect(saved.itemSeq).toBe(3);
    expect(saved.included).toEqual(existing.included);
    expect(saved.limits).toEqual(existing.limits);
    expect(saved.ratePaise).toBe(existing.ratePaise);
    expect(saved.name).toBe(existing.name);
    expect(saved.code).toBe('06');
  });

  it('refuses a list with two items on one id', async () => {
    const result = await saveServiceSection('06', 'items', {
      items: [
        { id: 'I1', name: 'One', unit: 'fixed', archived: false },
        { id: 'I1', name: 'Two', unit: 'fixed', archived: false },
      ],
    });
    expect(result.success).toBe(false);
    expect(saveService).not.toHaveBeenCalled();
  });

  /** The wording section overwrites the prose fields and nothing commercial. */
  it('writes the wording and leaves the items, the rate and the libraries alone', async () => {
    const result = await saveServiceSection('06', 'wording', {
      included: ['One page template'],
      accountTerms: [],
      limits: [{ label: 'Page templates', value: '[10]' }],
      limitsNotes: [],
      completion: ['It works.'],
      receives: ['The repository'],
      receivesNotes: [],
      thirdPartyCosts: 'Hosting',
      fee: [{ label: 'Fee', value: '[ ]' }],
    });
    expect(result).toEqual({ success: true });

    const saved = saveService.mock.calls[0][0];
    expect(saved.included).toEqual(['One page template']);
    expect(saved.completion).toEqual(['It works.']);
    expect(saved.thirdPartyCosts).toBe('Hosting');
    expect(saved.fee).toEqual([{ label: 'Fee', value: '[ ]' }]);
    expect(saved.items).toEqual(existing.items);
    expect(saved.ratePaise).toBe(existing.ratePaise);
    expect(saved.exclusionIds).toEqual(existing.exclusionIds);
    expect(saved.overview).toEqual(existing.overview);
  });

  /** The libraries section is the two id lists and only those. */
  it('writes the exclusion and client-input ids and nothing else', async () => {
    const result = await saveServiceSection('06', 'libraries', {
      exclusionIds: ['E01', 'E02'],
      clientInputIds: ['I01'],
    });
    expect(result).toEqual({ success: true });

    const saved = saveService.mock.calls[0][0];
    expect(saved.exclusionIds).toEqual(['E01', 'E02']);
    expect(saved.clientInputIds).toEqual(['I01']);
    expect(saved.included).toEqual(existing.included);
    expect(saved.items).toEqual(existing.items);
  });
});

describe('createService', () => {
  beforeEach(() => {
    listServices.mockResolvedValue(PARTS);
  });

  const details = {
    name: 'Three.js experience',
    scheduleKey: 'build' as const,
    overview: ['A 3D scene.'],
    sacCode: '998314',
    ratePaise: 80_000_00,
  };

  /** Existing behaviour, pinned because the function is being widened. */
  it('starts an ordinary new service with every list empty', async () => {
    const result = await createService(details);
    expect(result).toEqual({ success: true });

    const inserted = insertService.mock.calls[0][0];
    expect(inserted.code).toBe('23');
    expect(inserted.included).toEqual([]);
    expect(inserted.items).toBeUndefined();
  });

  /**
   * "Start from…": a genuinely new kind of work is usually a near copy of one
   * that exists, and copying its scope, limits, libraries and items is what
   * makes adding one a two-minute form rather than a spec edit.
   */
  it('clones the source service under the new code when asked to', async () => {
    const result = await createService({ ...details, cloneFrom: '06' });
    expect(result).toEqual({ success: true });

    const inserted = insertService.mock.calls[0][0];
    expect(inserted.code).toBe('23');
    expect(inserted.name).toBe('Three.js experience');
    expect(inserted.overview).toEqual(['A 3D scene.']);
    expect(inserted.included).toEqual(existing.included);
    expect(inserted.limits).toEqual(existing.limits);
    expect(inserted.exclusionIds).toEqual(existing.exclusionIds);
    expect(inserted.items).toEqual(existing.items);
    expect(inserted.itemSeq).toBe(existing.itemSeq);
    expect(inserted.archived).toBe(false);
  });

  it('refuses a clone source that does not exist', async () => {
    getService.mockResolvedValue(null);
    const result = await createService({ ...details, cloneFrom: '42' });
    expect(result.success).toBe(false);
    expect(insertService).not.toHaveBeenCalled();
  });
});

describe('removeService', () => {
  it('archives rather than deletes', async () => {
    const result = await removeService('06');
    expect(result).toEqual({ success: true });
    expect(archiveService).toHaveBeenCalledWith('06');
  });

  it('refuses a signed-out caller', async () => {
    authorized.mockResolvedValue(null);
    const result = await removeService('06');
    expect(result).toEqual({ success: false, error: 'Unauthorized.' });
    expect(archiveService).not.toHaveBeenCalled();
  });

  it('refuses a malformed code', async () => {
    const result = await removeService('not-a-code');
    expect(result.success).toBe(false);
    expect(archiveService).not.toHaveBeenCalled();
  });
});

/**
 * One item at a time, which is what the panel on the service page posts.
 *
 * The rule these exist for: `saveServiceSection('items', …)` replaces the whole
 * list, so two people editing different items under `WEB` would each save their
 * own copy of its 52 and the second would silently undo the first. This action
 * reads the row and replaces exactly one item in it.
 */
describe('saveServiceItem', () => {
  const item = {
    id: 'I1',
    name: 'GSAP motion system',
    ratePaise: 20_00_000,
    unit: 'fixed' as const,
    archived: false,
  };

  it('refuses a signed-out caller before reading anything', async () => {
    authorized.mockResolvedValue(null);
    const result = await saveServiceItem('06', item);
    expect(result).toEqual({ success: false, error: 'Unauthorized.' });
    expect(getService).not.toHaveBeenCalled();
  });

  it('replaces the item it names and leaves the others alone', async () => {
    getService.mockResolvedValue({
      ...existing,
      items: [item, { ...item, id: 'I2', name: 'Other', ratePaise: 5_00_000 }],
      itemSeq: 2,
    });

    const result = await saveServiceItem('06', { ...item, ratePaise: 28_00_000 });
    expect(result).toEqual({ success: true });

    const saved = saveService.mock.calls[0][0];
    expect(saved.items?.map((i) => [i.id, i.ratePaise])).toEqual([
      ['I1', 28_00_000],
      ['I2', 5_00_000],
    ]);
  });

  /** A blank id means new, and the id is assigned past the high-water mark. */
  it('appends a new item with an id that was never used before', async () => {
    getService.mockResolvedValue({ ...existing, items: [item], itemSeq: 7 });

    await saveServiceItem('06', { ...item, id: '', name: 'Three.js scene' });

    const saved = saveService.mock.calls[0][0];
    expect(saved.items?.map((i) => i.id)).toEqual(['I1', 'I8']);
    expect(saved.itemSeq).toBe(8);
  });

  /**
   * A stale panel must not resurrect an item somebody deleted. The id is
   * checked against the stored row rather than trusted.
   */
  it('refuses an id the service does not carry', async () => {
    getService.mockResolvedValue({ ...existing, items: [item], itemSeq: 1 });

    const result = await saveServiceItem('06', { ...item, id: 'I99' });
    expect(result).toEqual({ success: false, error: 'That item no longer exists.' });
    expect(saveService).not.toHaveBeenCalled();
  });

  it('refuses an item with no name', async () => {
    getService.mockResolvedValue({ ...existing, items: [item], itemSeq: 1 });

    const result = await saveServiceItem('06', { ...item, name: '' });
    expect(result.success).toBe(false);
    expect(saveService).not.toHaveBeenCalled();
  });

  /** Everything the panel never showed survives by never having left the row. */
  it('leaves the rest of the service untouched', async () => {
    getService.mockResolvedValue({ ...existing, items: [item], itemSeq: 1 });

    await saveServiceItem('06', { ...item, name: 'Renamed' });

    const saved = saveService.mock.calls[0][0];
    expect(saved.included).toEqual(existing.included);
    expect(saved.limits).toEqual(existing.limits);
    expect(saved.name).toBe(existing.name);
  });
});

describe('archiveServiceItem', () => {
  const item = {
    id: 'I1',
    name: 'GSAP motion system',
    unit: 'fixed' as const,
    archived: false,
  };

  it('archives without deleting, so the id stays taken', async () => {
    getService.mockResolvedValue({ ...existing, items: [item], itemSeq: 1 });

    const result = await archiveServiceItem('06', 'I1', true);
    expect(result).toEqual({ success: true });

    const saved = saveService.mock.calls[0][0];
    expect(saved.items).toHaveLength(1);
    expect(saved.items?.[0].archived).toBe(true);
  });

  it('restores one that was archived', async () => {
    getService.mockResolvedValue({
      ...existing,
      items: [{ ...item, archived: true }],
      itemSeq: 1,
    });

    await archiveServiceItem('06', 'I1', false);
    expect(saveService.mock.calls[0][0].items?.[0].archived).toBe(false);
  });

  it('refuses an id the service does not carry', async () => {
    getService.mockResolvedValue({ ...existing, items: [item], itemSeq: 1 });

    const result = await archiveServiceItem('06', 'I99', true);
    expect(result).toEqual({ success: false, error: 'That item no longer exists.' });
    expect(saveService).not.toHaveBeenCalled();
  });

  it('refuses a signed-out caller', async () => {
    authorized.mockResolvedValue(null);
    const result = await archiveServiceItem('06', 'I1', true);
    expect(result).toEqual({ success: false, error: 'Unauthorized.' });
  });
});
