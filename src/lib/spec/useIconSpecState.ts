'use client';

import { useCallback, useEffect, useState } from 'react';
import { ICON_SPECS } from './iconSpecData';
import type { ExportedProgress, SlotState, SlotStateMap } from './types';

const STORAGE_KEY = 'qs_kessler_spec_progress';
const SCHEMA_VERSION = 1;

const DEFAULT_SLOT_STATE: SlotState = { reviewed: false, passed: null, notes: '' };

function defaultSlots(): SlotStateMap {
  const slots: SlotStateMap = {};
  for (const spec of ICON_SPECS) {
    slots[spec.id] = { ...DEFAULT_SLOT_STATE };
  }
  return slots;
}

function isValidExport(value: unknown): value is ExportedProgress {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ExportedProgress>;
  return (
    candidate.schemaVersion === SCHEMA_VERSION &&
    typeof candidate.clientName === 'string' &&
    typeof candidate.exportedAt === 'string' &&
    typeof candidate.slots === 'object' &&
    candidate.slots !== null
  );
}

export function useIconSpecState() {
  const [clientName, setClientName] = useState('');
  const [slots, setSlots] = useState<SlotStateMap>(defaultSlots);
  const [importError, setImportError] = useState<string | null>(null);

  // Read the localStorage cache on mount only — this is a same-session
  // convenience, not the authoritative store (that's the exported JSON file).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (isValidExport(parsed)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setClientName(parsed.clientName);
        setSlots({ ...defaultSlots(), ...parsed.slots });
      }
    } catch {
      // Malformed JSON or localStorage unavailable — fall through with defaults.
    }
  }, []);

  const persist = useCallback((nextClientName: string, nextSlots: SlotStateMap) => {
    try {
      const toStore: ExportedProgress = {
        schemaVersion: SCHEMA_VERSION,
        clientName: nextClientName,
        exportedAt: new Date().toISOString(),
        slots: nextSlots,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // Private browsing / quota exceeded — state still applies for this
      // session via React state, just won't persist across reloads.
    }
  }, []);

  const updateClientName = useCallback(
    (name: string) => {
      setClientName(name);
      persist(name, slots);
    },
    [persist, slots],
  );

  const updateSlot = useCallback(
    (id: string, patch: Partial<SlotState>) => {
      setSlots((prev) => {
        const next = { ...prev, [id]: { ...(prev[id] ?? DEFAULT_SLOT_STATE), ...patch } };
        persist(clientName, next);
        return next;
      });
    },
    [clientName, persist],
  );

  const exportProgress = useCallback((): ExportedProgress => {
    return {
      schemaVersion: SCHEMA_VERSION,
      clientName,
      exportedAt: new Date().toISOString(),
      slots,
    };
  }, [clientName, slots]);

  const importProgress = useCallback((raw: string): boolean => {
    try {
      const parsed = JSON.parse(raw);
      if (!isValidExport(parsed)) {
        setImportError('This file is not a valid kessler-spec export.');
        return false;
      }
      const merged = { ...defaultSlots(), ...parsed.slots };
      setClientName(parsed.clientName);
      setSlots(merged);
      persist(parsed.clientName, merged);
      setImportError(null);
      return true;
    } catch {
      setImportError('Could not read that file — make sure it is valid JSON.');
      return false;
    }
  }, [persist]);

  const reviewedCount = Object.values(slots).filter((s) => s.reviewed).length;

  return {
    clientName,
    setClientName: updateClientName,
    slots,
    updateSlot,
    exportProgress,
    importProgress,
    importError,
    reviewedCount,
    totalCount: ICON_SPECS.length,
  };
}
