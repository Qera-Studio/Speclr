import { assignMenuIds, type MenuLine } from '../service';

/**
 * Menu-line ids are assigned once and never reissued.
 *
 * A client record cites them (`menuIds`) and so will a contract line. If a
 * deleted line's id were handed to a new line, a client who chose "M5, the
 * analytics set-up" would be seeded "M5, the booking system" onto their next
 * contract. So the Service carries the highest number it has ever given out,
 * and assignment counts past that, past every id in the stored menu, and past
 * every id in the incoming one, exactly as a clause number counts past
 * archived clauses.
 */

const stored = (ids: string[]): MenuLine[] =>
  ids.map((id) => ({ id, text: `Line ${id}`, unit: 'fixed' }));

describe('assignMenuIds', () => {
  it('gives a new line the next id and records it as the highest given', () => {
    const { menu, menuSeq } = assignMenuIds(
      { menu: stored(['M1', 'M2']), menuSeq: 2 },
      [...stored(['M1', 'M2']), { id: '', text: 'New', unit: 'fixed' }],
    );
    expect(menu.map((m) => m.id)).toEqual(['M1', 'M2', 'M3']);
    expect(menuSeq).toBe(3);
  });

  /**
   * M3 was deleted in an earlier save, so it is in neither list. The counter
   * is what remembers it existed.
   */
  it('never reissues an id a deleted line once held', () => {
    const { menu, menuSeq } = assignMenuIds(
      { menu: stored(['M1', 'M2']), menuSeq: 3 },
      [...stored(['M1', 'M2']), { id: '', text: 'New', unit: 'fixed' }],
    );
    expect(menu.map((m) => m.id)).toEqual(['M1', 'M2', 'M4']);
    expect(menuSeq).toBe(4);
  });

  /** A line dropped in *this* save is still in the stored menu, and counts. */
  it('counts past a line being removed in the same save', () => {
    const { menu, menuSeq } = assignMenuIds(
      { menu: stored(['M1', 'M2', 'M3']), menuSeq: 3 },
      [...stored(['M1']), { id: '', text: 'New', unit: 'fixed' }],
    );
    expect(menu.map((m) => m.id)).toEqual(['M1', 'M4']);
    expect(menuSeq).toBe(4);
  });

  /**
   * A row written before the counter existed, or one whose menu was loaded by
   * the import script: the highest id present is the floor.
   */
  it('starts from the highest id present when there is no counter', () => {
    const { menu, menuSeq } = assignMenuIds({ menu: stored(['M1', 'M7']) }, [
      ...stored(['M1', 'M7']),
      { id: '', text: 'New', unit: 'fixed' },
    ]);
    expect(menu.map((m) => m.id)).toEqual(['M1', 'M7', 'M8']);
    expect(menuSeq).toBe(8);
  });

  it('starts at M1 on a service with no menu at all', () => {
    const { menu, menuSeq } = assignMenuIds({}, [{ id: '', text: 'First', unit: 'fixed' }]);
    expect(menu.map((m) => m.id)).toEqual(['M1']);
    expect(menuSeq).toBe(1);
  });

  it('leaves an existing id alone and keeps the incoming order', () => {
    const { menu } = assignMenuIds({ menu: stored(['M1', 'M2']), menuSeq: 2 }, [
      { id: '', text: 'Inserted first', unit: 'fixed' },
      ...stored(['M2', 'M1']),
    ]);
    expect(menu.map((m) => m.id)).toEqual(['M3', 'M2', 'M1']);
  });

  it('gives several new lines distinct ids in order', () => {
    const { menu, menuSeq } = assignMenuIds({ menu: stored(['M1']), menuSeq: 1 }, [
      ...stored(['M1']),
      { id: '', text: 'A', unit: 'fixed' },
      { id: '', text: 'B', unit: 'monthly' },
    ]);
    expect(menu.map((m) => m.id)).toEqual(['M1', 'M2', 'M3']);
    expect(menuSeq).toBe(3);
  });
});
