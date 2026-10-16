'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import PartCard from '@/components/contract/PartCard';
import {
  ClauseFields,
  ContentText,
  shown,
  type ContentPatch,
} from '@/components/docs/editors/ContentFields';
import { SaveError } from '@/components/docs/editors/draftStatus';
import { contractBlocks, contractPageProps } from '@/components/docs/sheets/ContractSheet';
import DocumentWorkspace from '@/components/docs/DocumentWorkspace';
import { assemble } from '@/lib/domain/contract/assembly';
import { formatDisplayDate } from '@/lib/domain/dates';
import type { useDraftAutosave } from '@/components/docs/editors/useDraftAutosave';
import type { DocContent, ResolvedContent } from '@/lib/domain/docContent';
import type { ContractDocument } from '@/lib/domain/types';

/**
 * The document, and the rail that edits what is left.
 *
 * The one phase that is its own layout rather than a column of fields, which is
 * what `FlowShell`'s `fill` is for: the preview takes the middle and the rail
 * summarises everything decided so far.
 *
 * **Every card here goes back to the phase that owns it.** The rail used to be
 * where a contract was built, so its cards opened dialogs; now they are a table
 * of contents. A figure changed on the phase it belongs to is a figure changed
 * beside everything it relates to, which is the whole reason the flow has
 * phases.
 *
 * The two exceptions are the cover text and the clauses: they belong to no
 * phase, are read rather than decided, and are edited in place here.
 */
export default function PreviewPhase({
  doc,
  resolved,
  content,
  unfilled,
  saveState,
  autosave,
  onContentChange,
  onGoToPhase,
}: {
  doc: ContractDocument;
  resolved: ResolvedContent;
  content: DocContent;
  unfilled: number;
  saveState: 'idle' | 'saving' | 'saved';
  autosave: ReturnType<typeof useDraftAutosave>;
  onContentChange: ContentPatch;
  onGoToPhase: (key: string) => void;
}) {
  const [clausesOpen, setClausesOpen] = useState(false);
  const assembled = assemble(doc.contract.parts);

  /*
    The rail is off, on request (18 September 2026).

    `DocumentWorkspace` takes it as `children` and portals it into the app's
    editor panel, and that panel's *existence* is what `EditorPanelContent`
    registers on mount. So this is not a hidden rail: with nothing rendered
    into it the count stays at zero and `AdminShell` collapses the column
    entirely, which is what puts the document across the full width.

    **What it costs, stated rather than discovered later.** Four of the six
    cards were navigation and their destinations are still reachable. The other
    two were the only editor in the app for the cover text (masthead, intro,
    parties preamble) and for the clause bodies. Those are `content` keys, so a
    document that has them keeps them and prints them; there is simply no way to
    change them while this is off.

    Everything below still works and is still passed its props, so turning it
    back on is uncommenting the block and its four tests in
    `ContractFlow.test.tsx`.
  */
  return (
    <DocumentWorkspace
      {...contractPageProps(doc)}
      title=""
      preview={contractBlocks(doc)}
      rail={false}
    >
      <FieldGroup size="form" className="gap-4">
        <PartCard
          title={`${doc.clientSnapshot.name || 'No client selected'} · ${formatDisplayDate(doc.issueDate)}`}
          onOpen={() => onGoToPhase('client')}
        />

        <PartCard
          title="Services"
          subtitle={`${doc.contract.parts.length} on this contract`}
          onOpen={() => onGoToPhase('services')}
          defaultOpen={false}
        >
          <div className="flex flex-col gap-2">
            {/* A named service goes to Scope, where that service's own row
                and sheet are; the card above it goes to Services, which is
                where the list is chosen. */}
            {assembled.flatMap(({ parts }) =>
              parts.map(({ part }) => (
                <PartCard
                  key={part.code}
                  title={part.name}
                  onOpen={() => onGoToPhase('scope')}
                />
              )),
            )}
          </div>
        </PartCard>

        <PartCard
          title="Fees & standing terms"
          subtitle="What each service costs, and the Agreement's own figures"
          onOpen={() => onGoToPhase('terms')}
        />

        <PartCard
          title="Clauses"
          // This contract's own count, not the constant's: it may carry a clause
          // the library has since added, or predate one.
          subtitle={`${resolved.clauses.length} clauses of the Master Agreement`}
          onOpen={() => setClausesOpen(true)}
        />

        <PartCard title="Cover" subtitle="Masthead, intro and the parties preamble">
          <ContentText
            id="con-masthead"
            label="Masthead"
            value={shown(content, resolved, 'masthead')}
            onChange={(masthead) => onContentChange({ masthead })}
          />
          <ContentText
            id="con-intro"
            label="Cover intro"
            rows={5}
            value={shown(content, resolved, 'intro')}
            onChange={(intro) => onContentChange({ intro })}
          />
          <ContentText
            id="con-preamble"
            label="Parties preamble"
            rows={3}
            value={shown(content, resolved, 'preamble')}
            onChange={(preamble) => onContentChange({ preamble })}
          />
        </PartCard>

        {unfilled > 0 ? (
          <Alert role="status">
            <AlertTitle>
              {unfilled} blank{unfilled === 1 ? '' : 's'} still to fill
            </AlertTitle>
            <AlertDescription>
              They show in the preview. The contract cannot be issued until every one
              is filled.
            </AlertDescription>
          </Alert>
        ) : null}

        <SaveError autosave={autosave} />
        {saveState === 'idle' ? null : (
          <p role="status" className="text-sm text-muted-foreground">
            {saveState === 'saving' ? 'Saving…' : 'Saved'}
          </p>
        )}
      </FieldGroup>

      {/* The clauses are long but they are only text — no gate, no local copy. */}
      <Dialog open={clausesOpen} onOpenChange={setClausesOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Clauses</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto border-y py-4">
            <FieldGroup size="form">
              <ClauseFields
                clauses={shown(content, resolved, 'clauses')}
                onChange={(clauses) => onContentChange({ clauses })}
              />
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button variant="primary" type="button" onClick={() => setClausesOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DocumentWorkspace>
  );
}
