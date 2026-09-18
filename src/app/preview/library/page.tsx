import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import ComponentLibrary from '@/components/library/ComponentLibrary';

/**
 * `/preview/library` — the component library with no session and no database.
 *
 * The real page at `/client/library` is behind Clerk, so a browser pointed at
 * it measures the sign-in form and reports a healthy 200 while proving nothing.
 * That is the same reason every other fixture here exists.
 *
 * What only a browser can see about this page is the whole of it. It is a
 * design surface: the rail against the pane, the specimen's stage against the
 * pager's trough, and the trough against the raised page on it. jsdom resolves
 * no stylesheet, so a class name there is a string rather than a colour, and
 * the delta that made the active page invisible in dark mode was exactly a
 * measured one (`docs/design.md` §2.10).
 *
 * **It does not exist in production**, like its siblings.
 */
export const metadata = {
  title: 'Component library preview',
  robots: { index: false, follow: false },
};

export default function LibraryPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <Suspense fallback={<div className="h-full w-full" />}>
      {/*
        Inside the real shell, not a bare `h-dvh` box.

        It was the bare box until the drawer joined the catalogue, and for a
        pager that was right: an inline control needs no surface around it.
        A drawer does. It opens into the inset card through `InsetContext`, so
        without a shell it falls back to covering the whole viewport, and a
        library showing a drawer at a size no real drawer takes is a library
        measuring itself. The one thing this page claims is that what is on it
        is what ships.
      */}
      <AdminShell user={{ name: 'Preview', email: 'preview@qera.studio' }}>
        <ComponentLibrary />
      </AdminShell>
    </Suspense>
  );
}
