import type { Locator, Page } from '@playwright/test';

/** A4 at 96dpi, the same two numbers `sheets/frame.ts` cuts every page to. */
export const SHEET_WIDTH = 794;
export const SHEET_HEIGHT = 1123;

export interface Clip {
  /** How far past its container the content ran, in px. */
  px: number;
  /** The container that hid it, as a short CSS-ish description. */
  container: string;
  /** The text of the deepest element that fell outside it. */
  text: string;
}

/**
 * The worst thing `overflow: hidden` is hiding inside `frame`.
 *
 * This is the measurement the whole suite exists for. A clipped row still lays
 * out, so it still has a box, and its box is below the box that is hiding it.
 * jsdom gives every element a height of zero and so can never see this, which
 * is how a pay slip shipped with a deduction silently cut off the bottom
 * (`CONTEXT.md` §6a).
 *
 * Every clipping ancestor is checked, not just the sheet: the slip clips at an
 * inner flex column, a long way above the edge of the paper, so measuring the
 * page frame alone finds nothing. Returns `null` when nothing is hidden.
 */
export async function worstClip(frame: Locator, tolerance = 1): Promise<Clip | null> {
  return frame.evaluate(
    (root, tol) => {
      const label = (el: Element) =>
        `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''}`;

      let worst: { px: number; container: string; text: string } | null = null;

      const boxes = [root, ...root.querySelectorAll('*')] as HTMLElement[];
      for (const container of boxes) {
        const style = getComputedStyle(container);
        const hides = /hidden|clip/.test(style.overflowY);
        if (!hides) continue;

        const rect = container.getBoundingClientRect();
        // Screen-reader captions are pinned to a 1px box on purpose; so is
        // anything else deliberately collapsed. Neither is a clipped row.
        if (rect.height <= 2 || rect.width <= 2) continue;

        for (const child of container.querySelectorAll<HTMLElement>('*')) {
          const box = child.getBoundingClientRect();
          if (box.height === 0 || box.width === 0) continue;
          const over = Math.round(box.bottom - rect.bottom);
          if (over <= tol) continue;
          if (!worst || over > worst.px) {
            worst = {
              px: over,
              container: label(container),
              text: (child.textContent ?? '').trim().slice(0, 60),
            };
          }
        }
      }
      return worst;
    },
    tolerance,
  );
}

/** Every packed page of a paginated document, in order. */
export const pagesOf = (page: Page): Locator => page.locator('.paginatorPage');

/**
 * Waits for `usePagination` to settle.
 *
 * Measurement happens on the client after hydration, and until it finishes the
 * document renders as one un-paginated flow. Asserting before then measures the
 * wrong thing, and does it fast enough to look like a pass.
 */
export async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const pages = document.querySelectorAll('.paginatorPage');
    return pages.length > 0 && (pages[0] as HTMLElement).offsetHeight === 1123;
  });
}
