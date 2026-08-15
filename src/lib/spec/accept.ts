import type { IconFormat } from './types';

/**
 * What each icon slot will accept in a file picker.
 *
 * Lives here rather than inside the drop zone: the drop zone is shared with
 * client attachments and the UPI QR upload, neither of which has an
 * `IconFormat`. It takes the plain `accept` string an `<input>` wants, and each
 * caller says what its own is.
 */
export const ACCEPT_BY_FORMAT: Record<IconFormat, string> = {
  ico: '.ico',
  png: 'image/png',
  svg: 'image/svg+xml,.svg',
  jpeg: 'image/jpeg',
};
