import { notFound } from 'next/navigation';
import PopupGallery from './PopupGallery';

/**
 * `/preview/popups`: every kind of anchored popup, on a page with no session
 * and no database, so a browser can measure them.
 *
 * The two rules in `ui/popup.ts` are geometry: a gap between the control and
 * its popup, and a popup never narrower than the control. jsdom resolves no
 * Tailwind and measures every box as zero, so a green Jest run says nothing
 * about either. It said nothing about the combobox anchoring to its bare
 * `<input>` instead of its bordered group, which shipped a list 34px short.
 *
 * **It does not exist in production**, exactly as `/preview/<fixture>` does
 * not: `notFound()` fires before anything renders.
 */
export const metadata = {
  title: 'Popups preview',
  robots: { index: false, follow: false },
};

export default function PopupPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PopupGallery />;
}
