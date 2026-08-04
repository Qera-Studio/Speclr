/**
 * The dev/testing escape hatch — OFF in production, and it must stay that way.
 *
 * speclr's two hardest guarantees (a serial is claimed exactly once; a
 * finalized document is never deleted) make trial runs expensive: every sample
 * finalize burns an FY serial and leaves an undeletable row behind. While the
 * app is not yet live, this flag lifts both so sample documents are unlimited
 * and disposable:
 *
 *  - `claimSerial` hands out a clock-based fake instead of touching `counters`.
 *  - `deleteDraft` will delete a finalized document.
 *  - the record page shows a Delete button on finalized documents.
 *
 * `NODE_ENV` is set to 'production' by `next build`, so a production deploy
 * turns all three off with no configuration to remember. It is inlined at build
 * time in client bundles too, so the button simply is not in the shipped JS.
 *
 * When speclr goes live and real documents exist, delete this file and its
 * three call sites — the guards it lifts are the audit trail.
 */
export const DEV_UNLIMITED = process.env.NODE_ENV !== 'production';
