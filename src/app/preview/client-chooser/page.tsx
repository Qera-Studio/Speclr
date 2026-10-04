'use client';

import { notFound } from 'next/navigation';
import CountryChooser from '@/components/admin/clients/onboarding/CountryChooser';

/**
 * `/preview/client-chooser` — the type-and-country screen, with no session.
 *
 * The real one is the first thing `/client/clients/new` renders, which is
 * behind Clerk and therefore unreachable from a Playwright run. Everything this
 * screen is judged on is a *measurement*, and jsdom renders every box as zero:
 *
 * - how many country rows the scrolling band shows, which is a height computed
 *   from a row, a gap and the sticky continent heading inside it, and which was
 *   wrong once already (sized for six, showed five, because the arithmetic left
 *   the heading out);
 * - that the two type cards and the country list read as two questions, which
 *   is what the divider between them is for.
 *
 * **It does not exist in production**, like its siblings. Nothing here is
 * anybody's data: the component holds both answers in its own state and hands
 * them back on Continue, so a preview can simply drop them.
 */
export default function ClientChooserPreview() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    // Full height, because the chooser centres itself in whatever column it is
    // given and its scrolling band is sized against that.
    <div className="flex h-screen flex-col p-1">
      <CountryChooser onContinue={() => undefined} onBack={() => undefined} />
    </div>
  );
}
