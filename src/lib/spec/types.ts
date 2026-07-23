export type IconPriority = 'required' | 'nice-to-have';

export type IconFormat = 'ico' | 'png' | 'svg' | 'jpeg';

export type PreviewMockupKind =
  | 'browserTab'
  | 'iosHomeScreen'
  | 'maskableSafeZone'
  | 'googleSerp'
  | 'socialCard'
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
  exportedAt: string;
  slots: SlotStateMap;
}
