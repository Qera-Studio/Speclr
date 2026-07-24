'use client';

/**
 * Per-slot uploaded images, persisted as data URLs in localStorage so the
 * preview + validation survive a reload. Kept in a SEPARATE key from the review
 * progress (`ExportedProgress`) so the exported JSON stays lean — images are a
 * local reload convenience only, never part of the export.
 *
 * localStorage is ~5MB per origin and large OG images can exhaust it. Writes are
 * quota-guarded: a failed write returns false and leaves existing images intact,
 * so review state is never collateral damage of an over-budget image.
 */
export const IMAGE_STORE_KEY = 'speclr_icon_spec_images';

export type ImageStore = Record<string, string>;

export function loadImageStore(): ImageStore {
  try {
    const raw = localStorage.getItem(IMAGE_STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as ImageStore;
    return {};
  } catch {
    return {};
  }
}

function writeStore(store: ImageStore): boolean {
  try {
    localStorage.setItem(IMAGE_STORE_KEY, JSON.stringify(store));
    return true;
  } catch {
    // Quota exceeded or localStorage unavailable — caller keeps its in-memory
    // state; only the persisted copy is skipped.
    return false;
  }
}

/** Persist one slot's image. Returns false if the write couldn't fit (quota). */
export function saveSlotImage(slotId: string, dataUrl: string): boolean {
  const store = loadImageStore();
  const next = { ...store, [slotId]: dataUrl };
  return writeStore(next);
}

export function removeSlotImage(slotId: string): void {
  const store = loadImageStore();
  if (!(slotId in store)) return;
  const next = { ...store };
  delete next[slotId];
  writeStore(next);
}
