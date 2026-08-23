'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { PageBody } from '@/components/admin/Page';

/**
 * The third empty state: not "nothing here yet", not "nothing matches", but
 * "we could not find out".
 *
 * Those three read almost identically if they share one panel, and they call
 * for opposite actions: create something, clear a filter, try again. This one
 * is the only one whose action is "try again", so it is the only one with a
 * button that reloads.
 *
 * It sits at the `(app)` level, beside `loading.tsx`, so the rail and header
 * survive a thrown page. A boundary further out would swallow the shell too and
 * strand the operator on a page with no way back to any other one.
 *
 * `digest` is shown deliberately. Next replaces a server error's message with
 * an opaque hash in production, which is correct (the message could name a
 * table or a connection string), and quoting the hash is the only way anybody
 * can match this screen against the Vercel log.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No error service yet, so the browser console is the only sink. It is
    // still worth logging: the digest alone says nothing on a local run, where
    // the real message is right here.
    console.error(error);
  }, [error]);

  return (
    <PageBody>
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert />
          </EmptyMedia>
          <EmptyTitle>This page did not load</EmptyTitle>
          <EmptyDescription>
            Something failed on the way to fetching it. Nothing was changed, and nothing you had
            already saved is affected.
            {error.digest ? (
              <>
                {' '}
                Reference <code className="font-mono">{error.digest}</code>.
              </>
            ) : null}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" onClick={reset}>
            Try again
          </Button>
        </EmptyContent>
      </Empty>
    </PageBody>
  );
}
