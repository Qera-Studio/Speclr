import 'server-only';

import {
  composeAddress,
  isEmptyAddressParts,
  type AddressParts,
} from '@/lib/domain/address';

/**
 * Recomposes the flat `address` string from structured parts, server-side.
 *
 * The browser sends both the parts and a composed string; only the parts are
 * trusted. Recomposing here means a tampered or stale composed value can never
 * reach a document — the same reason ownership is always re-checked on the
 * server rather than believed from the client.
 *
 * Records without parts (everything created before structured addresses
 * existed) keep their hand-typed `address` untouched.
 */
export function withComposedAddress<
  T extends { address: string; addressParts?: AddressParts },
>(input: T): T {
  if (isEmptyAddressParts(input.addressParts)) return input;
  return { ...input, address: composeAddress(input.addressParts as AddressParts) };
}
