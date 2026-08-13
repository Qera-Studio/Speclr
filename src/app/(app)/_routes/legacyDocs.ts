import 'server-only';

import { getDocument } from '@/db/store';
import { DOC_TYPE_BY_SLUG } from '@/lib/domain/registry';
import { profileOfDocType, type Profile } from '@/lib/profile';

/**
 * Which profile a pre-split `/docs/<id>` URL should now land in.
 *
 * The static legacy paths are handled declaratively in `next.config.ts`; these
 * three cannot be, because `<id>` is either a doc-type slug (answerable from the
 * registry) or a document UUID (answerable only by the database). Returns null
 * when the id is neither, so the caller can 404.
 */
export async function legacyDocProfile(id: string): Promise<Profile | null> {
  const spec = DOC_TYPE_BY_SLUG[id];
  if (spec) return profileOfDocType(spec.code);

  const doc = await getDocument(id);
  return doc ? profileOfDocType(doc.type) : null;
}
