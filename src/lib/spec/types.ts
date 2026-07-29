export type IconPriority = 'required' | 'nice-to-have';

export type IconFormat = 'ico' | 'png' | 'svg' | 'jpeg';

export type PreviewMockupKind =
  | 'browserTab'
  | 'bookmarksBar'
  | 'safariPinnedTab'
  | 'iosHomeScreen'
  | 'maskableSafeZone'
  | 'googleSerp'
  | 'socialCard'
  | 'socialCardSquare'
  | 'androidLauncher'
  | 'pwaInstall'
  | 'none';

export interface IconDimensions {
  width: number;
  height: number;
}

export interface IconSpec {
  id: string;
  name: string;
  filename: string;
  acceptedDimensions: IconDimensions[];
  format: IconFormat;
  usedIn: string;
  whyItMatters: string;
  industryStandard: string;
  priority: IconPriority;
  requireOpaque: boolean;
  previewMockup: PreviewMockupKind;
}

export type ValidationTriState = boolean | 'unknown';

export type QualityWarningKind =
  | 'aspect-ratio'
  | 'file-weight'
  | 'blank'
  | 'safe-zone'
  | 'svg-viewbox'
  | 'svg-raster'
  | 'svg-external-ref'
  | 'svg-monochrome';

/**
 * A non-blocking, advisory quality nudge (e.g. "not square", "heavy file").
 * Warnings never change a slot's pass/fail verdict — they surface things worth
 * improving for the best-quality logo, but a slot can pass with warnings.
 */
export interface QualityWarning {
  kind: QualityWarningKind;
  message: string;
}

export interface ValidationResult {
  dimensionsOk: ValidationTriState;
  formatOk: ValidationTriState;
  transparency: 'opaque' | 'transparent' | 'unknown';
  transparencyIsWarning: boolean;
  actualWidth?: number;
  actualHeight?: number;
  actualFormat?: string;
  objectUrl: string;
  note?: string;
  /** Advisory-only quality nudges; do not affect pass/fail. */
  warnings?: QualityWarning[];
}

export interface SlotState {
  reviewed: boolean;
  passed: boolean | null;
  notes: string;
}

export type SlotStateMap = Record<string, SlotState>;

export interface ExportedProgress {
  schemaVersion: 1;
  clientName: string;
  /**
   * Website/domain shown in preview mockups. Optional so exports written before
   * this field existed still import cleanly — the schema version stays at 1
   * rather than rejecting every file already saved.
   */
  domain?: string;
  exportedAt: string;
  slots: SlotStateMap;
}
