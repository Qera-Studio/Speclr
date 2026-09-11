'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * Save a finalized document's stored PDF.
 *
 * Two callers now — the list row's Download icon and the print view's Download
 * button — so it lives here rather than being typed twice (`PRINCIPLES.md`
 * rule 1, fired on the second consumer rather than the third).
 *
 * **Fetched, never a plain `<a download>`,** and that is the bug this carries
 * with it. A `download` anchor hands the browser whatever the response was, so
 * a failure was saved to disk as a file named after the last path segment:
 * `pdf.txt`, holding an error, looking exactly like a corrupt document. There
 * is no event for it either, so nothing could report it. Reading the response
 * here means a failure is a message somebody can act on.
 *
 * The object URL is revoked immediately: the blob is a client's tax document
 * held in memory, and an un-revoked URL keeps it alive for the life of the tab.
 */
export function useDownloadPdf(docId: string, fileName?: string | null) {
  const [downloading, setDownloading] = useState(false);

  const download = useCallback(async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/docs/${docId}/pdf`);
      if (!response.ok) {
        // The route sends a plain-text reason on a render failure, and 'Not
        // found' on anything else. Either is more use than a saved file.
        toast.error('Could not download the PDF', {
          description: (await response.text()).trim() || `Request failed (${response.status}).`,
        });
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // The server's Content-Disposition already names the file; this is what
      // names it when the bytes come from an object URL, which has no headers.
      link.download = `${fileName ?? docId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Could not download the PDF', {
        description: err instanceof Error ? err.message : 'The request did not complete.',
      });
    } finally {
      setDownloading(false);
    }
  }, [docId, fileName]);

  return { download, downloading };
}
