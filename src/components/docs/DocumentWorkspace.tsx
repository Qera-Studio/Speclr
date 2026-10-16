'use client';

import { useCallback, useRef, useState } from 'react';
import { EditorPanelContent } from '@/components/shell/EditorPanel';
import { PageHeaderSlot } from '@/components/shell/PageHeaderSlot';
import DocumentPreview, {
  type DocumentPreviewHandle,
  type PageChrome,
} from './DocumentPreview';
import DocumentPager from './DocumentPager';

/**
 * The document workspace: the scrolling A4 column filling the app's content
 * card, with its title and page controls up on the app header's one row.
 *
 * The edit form is passed as `children` and *portalled* into the app-level
 * editor rail (`EditorSidebar`), which lives up in `AdminShell`. Keeping the
 * form as this component's child — rather than handing it to the shell — is
 * deliberate: `preview` and the form fields are computed from the same live
 * form state in every editor, so they must stay in one React tree. Only the
 * DOM lands elsewhere.
 *
 * Owns the view state (page count, current page) that the header renders and
 * the preview reports into. The header is a different subtree, so the autosave
 * line and the pager travel there by portal (`PageHeaderSlot`) exactly as the
 * form travels to the rail: the state stays here, only the DOM lands elsewhere.
 * The `title` goes to the rail with the form, because it names what the form is
 * editing.
 */
export default function DocumentWorkspace({
  title,
  preview,
  main,
  coverFirst = false,
  firstPageClassName,
  selfPaddedSheet = !coverFirst,
  pagePadding,
  pagePaddingY,
  darkPageClassName,
  pageHeader,
  pageFooter,
  chromeHeight,
  columns,
  columnWidth,
  columnGap,
  forceDark,
  railFooter,
  rail = true,
  status,
  children,
}: {
  title: string;
  /** The autosave line, rendered up on the app header's row. */
  status?: React.ReactNode;
  preview?: React.ReactNode;
  /**
   * Shown in the card *instead of* the document. The contract uses it for the
   * stage before there is a document worth previewing: you are choosing
   * services, and twenty-two of them do not fit a 384px rail.
   *
   * The rail is still this component's child either way, which is the whole
   * reason the stage is state rather than a route — both stages edit one
   * contract object, and it must not remount between them.
   */
  main?: React.ReactNode;
  coverFirst?: boolean;
  firstPageClassName?: string;
  /** Page margin override — see `DocumentPreview`. The offer letter uses it. */
  pagePadding?: string;
  pagePaddingY?: number;
  /**
   * Whether `preview` is a single self-contained sheet that paints its own A4
   * margins (invoice, receipt, letter, stipend) rather than bare content blocks
   * needing the page frame's padding (the contract). Defaults to the former,
   * which is every doc type except the block-fed contract.
   */
  selfPaddedSheet?: boolean;
  /** Running page furniture and its colours — see `DocumentPreview`. Only the
   * contract uses these; the other sheets carry their own header and footer
   * inside the artwork. */
  darkPageClassName?: string;
  pageHeader?: PageChrome;
  pageFooter?: PageChrome;
  chromeHeight?: number;
  /** Column layout — see `DocumentPreview`. Only the contract sets these. */
  columns?: number;
  columnWidth?: number;
  columnGap?: number;
  /** Paint every flowing page dark — see `packBlocks`. Only the quotation sets this. */
  forceDark?: boolean;
  /**
   * Pinned below the rail's scroll rather than at the end of the form — the
   * stage's one forward action, and on the last stage Finalize and Delete.
   */
  railFooter?: React.ReactNode;
  /**
   * Whether to fill the app's editor rail at all.
   *
   * Off renders no panel, which is deliberately not the same as rendering an
   * empty one: registration is what tells `AdminShell` the page has something
   * editable, so an empty panel leaves the column standing with nothing in it.
   * Never registering collapses it and the document takes the width.
   *
   * `children` stays required rather than becoming optional, so a caller
   * turning the rail off still has to say what it is giving up, and turning it
   * back on is one prop rather than rebuilding a form.
   */
  rail?: boolean;
  children: React.ReactNode;
}) {
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const previewRef = useRef<DocumentPreviewHandle>(null);

  // The preview reports the page in view as the user scrolls; the arrows drive
  // it the other way. Keeping the scroll imperative (not an effect on
  // `currentPage`) stops the two fighting each other.
  const goToPage = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(0, index), pageCount - 1);
      setCurrentPage(clamped);
      previewRef.current?.scrollToPage(clamped);
    },
    [pageCount],
  );

  // Clamp during render so a shrinking page count (content edits) never leaves
  // the counter pointing at a page that no longer exists.
  const safePage = Math.min(currentPage, Math.max(0, pageCount - 1));

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      // Arrow keys page the document. The form lives in the rail — a separate
      // DOM subtree — so this never hijacks caret movement in its inputs.
      onKeyDown={(e) => {
        if (main) return;
        if (e.key === 'ArrowRight') goToPage(safePage + 1);
        if (e.key === 'ArrowLeft') goToPage(safePage - 1);
      }}
    >
      <PageHeaderSlot>
        {/* The title is not here: it names what the rail is editing, so it
            prints on the rail's own header row, which `EditorPanelContent`
            below already hands it. What stays on this row is the state of the
            document you are looking at — saved or not, and which page. */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {status}

          {/* Nothing to page through on a one-page document, and "Page 1 / 1"
              with both arrows greyed out is a control that exists only to say
              so. Every invoice, receipt, credit note and slip is one page.
              `main` is the contract's service picker: a pager over a page that
              is not on screen would be counting something nobody is looking
              at. */}
          {main || pageCount <= 1 ? null : (
            <DocumentPager
              currentPage={safePage}
              pageCount={pageCount}
              onGoToPage={goToPage}
            />
          )}
        </div>
      </PageHeaderSlot>

      {main ? (
        <div className="min-h-0 flex-1 overflow-y-auto">{main}</div>
      ) : (
        <DocumentPreview
          ref={previewRef}
          coverFirst={coverFirst}
          firstPageClassName={firstPageClassName}
          selfPaddedSheet={selfPaddedSheet}
          pagePadding={pagePadding}
          pagePaddingY={pagePaddingY}
          darkPageClassName={darkPageClassName}
          pageHeader={pageHeader}
          pageFooter={pageFooter}
          chromeHeight={chromeHeight}
          columns={columns}
          columnWidth={columnWidth}
          columnGap={columnGap}
          forceDark={forceDark}
          onPageCountChange={setPageCount}
          onCurrentPageChange={setCurrentPage}
        >
          {preview}
        </DocumentPreview>
      )}

      {/* The form is the point of a document page, so open the rail on arrival.
          Unless the page says otherwise: `rail={false}` renders no panel, so
          nothing registers and the shell's column collapses. */}
      {rail ? (
        <EditorPanelContent title={title} autoOpen footer={railFooter}>
          {children}
        </EditorPanelContent>
      ) : null}
    </div>
  );
}
