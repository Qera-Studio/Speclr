import { notFound } from 'next/navigation';
import TabGallery from './TabGallery';

/**
 * `/preview/tabs`: a tab strip with unequal labels, on a page with no session
 * and no database, so a browser can drag its pill.
 *
 * The drag in `useTabDrag` is measurement: it reads the pill's box and every
 * trigger's box, and commits to whichever centre it ends up nearest. jsdom
 * resolves no Tailwind and reports every box as zero, so a Jest test of it
 * would be asserting against a strip where all four tabs sit at x=0 and the
 * nearest is always the first. The labels here are deliberately different
 * lengths, because equal ones would let a wrong "one width per step" rule pass.
 *
 * **It does not exist in production**, exactly as the other preview routes do
 * not: `notFound()` fires before anything renders.
 */
export const metadata = {
  title: 'Tabs preview',
  robots: { index: false, follow: false },
};

export default function TabsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <TabGallery />;
}
