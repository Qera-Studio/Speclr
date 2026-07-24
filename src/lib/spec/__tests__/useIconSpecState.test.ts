import { renderHook, act } from '@testing-library/react';
import { useIconSpecState } from '../useIconSpecState';
import { ICON_SPECS } from '../iconSpecData';

beforeEach(() => {
  localStorage.clear();
});

describe('useIconSpecState', () => {
  it('starts with an empty client name and every slot unreviewed', () => {
    const { result } = renderHook(() => useIconSpecState());
    expect(result.current.clientName).toBe('');
    expect(result.current.reviewedCount).toBe(0);
    expect(result.current.totalCount).toBe(ICON_SPECS.length);
  });

  it('updates a slot and reflects it in reviewedCount', () => {
    const { result } = renderHook(() => useIconSpecState());
    const firstId = ICON_SPECS[0].id;

    act(() => {
      result.current.updateSlot(firstId, { reviewed: true, passed: true });
    });

    expect(result.current.reviewedCount).toBe(1);
    expect(result.current.slots[firstId]).toMatchObject({ reviewed: true, passed: true });
  });

  it('round-trips state through export then import', () => {
    const { result } = renderHook(() => useIconSpecState());
    const firstId = ICON_SPECS[0].id;

    act(() => {
      result.current.setClientName('Acme Co.');
      result.current.updateSlot(firstId, { reviewed: true, passed: true, notes: 'looks good' });
    });

    const exported = result.current.exportProgress();
    const json = JSON.stringify(exported);

    // Fresh hook instance simulates a reload/different browser
    const { result: freshResult } = renderHook(() => useIconSpecState());
    act(() => {
      freshResult.current.importProgress(json);
    });

    expect(freshResult.current.clientName).toBe('Acme Co.');
    expect(freshResult.current.slots[firstId]).toMatchObject({
      reviewed: true,
      passed: true,
      notes: 'looks good',
    });
  });

  it('rejects malformed JSON without throwing', () => {
    const { result } = renderHook(() => useIconSpecState());
    let success: boolean = true;

    expect(() => {
      act(() => {
        success = result.current.importProgress('{ not valid json');
      });
    }).not.toThrow();

    expect(success).toBe(false);
    expect(result.current.importError).toBeTruthy();
  });

  it('rejects a JSON file with the wrong schema shape', () => {
    const { result } = renderHook(() => useIconSpecState());
    let success: boolean = true;

    act(() => {
      success = result.current.importProgress(JSON.stringify({ foo: 'bar' }));
    });

    expect(success).toBe(false);
    expect(result.current.importError).toBeTruthy();
  });

  it('ignores unknown slot ids on import and defaults missing ones', () => {
    const { result } = renderHook(() => useIconSpecState());
    const bogusExport = {
      schemaVersion: 1,
      clientName: 'Test',
      exportedAt: new Date().toISOString(),
      slots: { 'not-a-real-id': { reviewed: true, passed: true, notes: '' } },
    };

    act(() => {
      result.current.importProgress(JSON.stringify(bogusExport));
    });

    // Every real spec id should still have a default entry
    for (const spec of ICON_SPECS) {
      expect(result.current.slots[spec.id]).toBeDefined();
    }
  });

  it('resetProgress clears client name, all slots, both storage keys, and bumps the nonce', () => {
    const { result } = renderHook(() => useIconSpecState());
    const firstId = ICON_SPECS[0].id;

    act(() => {
      result.current.setClientName('Acme');
      result.current.updateSlot(firstId, { reviewed: true, passed: true, notes: 'x' });
    });
    localStorage.setItem('speclr_icon_spec_images', JSON.stringify({ [firstId]: 'data:...' }));
    expect(result.current.reviewedCount).toBe(1);
    const nonceBefore = result.current.resetNonce;

    act(() => {
      result.current.resetProgress();
    });

    expect(result.current.clientName).toBe('');
    expect(result.current.reviewedCount).toBe(0);
    for (const spec of ICON_SPECS) {
      expect(result.current.slots[spec.id]).toMatchObject({ reviewed: false, passed: null, notes: '' });
    }
    // Both persistence keys are gone.
    expect(localStorage.getItem('speclr_icon_spec_progress')).toBeNull();
    expect(localStorage.getItem('speclr_icon_spec_images')).toBeNull();
    // Nonce bumped so cards remount and drop their local preview state.
    expect(result.current.resetNonce).not.toBe(nonceBefore);
  });
});
