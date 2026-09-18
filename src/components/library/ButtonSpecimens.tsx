'use client';

import { useState, type ReactNode } from 'react';
import { ArrowRight, Check, Download, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { AddButton, AddLink } from '@/components/ui/add-button';
import { Button, buttonVariants } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { CopyButton } from '@/components/ui/copy-button';
import IconAction from '@/components/ui/icon-action';
import { RemoveButton } from '@/components/ui/remove-button';
import { Specimen } from './Specimen';
import type { LibraryEntry } from './catalogue';

/**
 * Every clickable thing in the app, live.
 *
 * Its own file because it is long: thirteen specimens against the drawer's one
 * and the pager's four, and `ComponentLibrary.tsx` is the page rather than a
 * place to keep every component's examples. The split is by component, which
 * is the same line `catalogue.ts` draws.
 *
 * **The fills and heights cannot fall behind the primitive.** A hand-written
 * list of them would be a second place to forget: somebody adds a variant to
 * `button.tsx` and the library goes on showing the old set, which is the exact
 * failure this page exists to prevent one layer up. cva does not expose its
 * config at runtime, so the lists here are keyed by the primitive's own union
 * type instead and a missing one fails the typecheck. See the note above
 * `VARIANT_USE`.
 */

type ButtonVariant = NonNullable<NonNullable<Parameters<typeof buttonVariants>[0]>['variant']>;
type ButtonSize = NonNullable<NonNullable<Parameters<typeof buttonVariants>[0]>['size']>;

/*
  Listed, but *type-checked against the primitive*, which is the part that
  matters. cva does not expose its config at runtime, so the names cannot be
  read off `buttonVariants` the way a plain object would allow. What can be
  done is better than a bare list and nearly as good as generating it: the
  record below is keyed by the union of real variants with no `Partial`, so
  adding a fill to `button.tsx` and not to this page **fails the typecheck**
  rather than quietly leaving the library a fill short.

  `Object.keys` on a fully-keyed record is then the same set, in source order.
*/
const VARIANT_USE: Record<ButtonVariant, string> = {
  default: 'The one action a view is for',
  raised: 'On trial, one place only',
  neutral: 'Solid, but not the primary',
  outline: 'The workhorse, 52 uses',
  secondary: 'A quiet fill',
  ghost: 'In a row of icons, or a toolbar',
  destructive: 'Deletes something',
  link: 'Reads as text, behaves as a button',
};

/** What each height is for, in the fewest words that distinguish it. */
const SIZE_USE: Record<ButtonSize, string> = {
  default: '28px, the dense default',
  lg: '32px, a form’s own submit',
  form: '38px, inline with a field',
  icon: '28px square',
  'icon-sm': '24px square',
};

const VARIANTS = Object.keys(VARIANT_USE) as ButtonVariant[];
const SIZES = Object.keys(SIZE_USE) as ButtonSize[];

/** Which sizes take a word, and which are square. */
const ICON_SIZES = new Set(['icon', 'icon-sm']);

/**
 * A row of examples with a caption under each.
 *
 * `items-end` rather than `items-center`, because the heights specimen is
 * comparing heights and a row centred on its own axis hides exactly the
 * difference it is there to show.
 */
function Row({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-wrap items-end gap-x-5 gap-y-4">{children}</div>;
}

/** One example and the words under it. */
function Sample({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      {children}
      <span className="text-[11px] text-muted-foreground">{caption}</span>
    </div>
  );
}

export function ButtonSpecimens({ entry }: { entry: LibraryEntry }) {
  const [
    fills,
    heights,
    states,
    working,
    withIcon,
    iconOnly,
    grouped,
    add,
    confirmed,
    removeRow,
    swap,
    copy,
    toolbar,
  ] = entry.variants;

  return (
    <>
      <Specimen name={fills.name} note={fills.note} fill>
        <Row>
          {VARIANTS.map((variant) => (
            <Sample key={variant} caption={VARIANT_USE[variant]}>
              <Button variant={variant}>{variant}</Button>
            </Sample>
          ))}
        </Row>
      </Specimen>

      <Specimen name={heights.name} note={heights.note} fill>
        <Row>
          {SIZES.map((size) => (
            <Sample key={size} caption={SIZE_USE[size]}>
              {ICON_SIZES.has(size as string) ? (
                <Button size={size} variant="outline" aria-label={`Edit, ${size}`}>
                  <Pencil />
                </Button>
              ) : (
                <Button size={size} variant="outline">
                  {size}
                </Button>
              )}
            </Sample>
          ))}
        </Row>
      </Specimen>

      {/*
        The four states side by side rather than described, which is the whole
        argument for a library. Hover and focus are the two that cannot be
        drawn: `:hover` is not settable from markup and a forced focus would
        fight the reader's own. So those two are the real button, labelled, for
        the reviewer to put a pointer or a Tab on.
      */}
      <Specimen name={states.name} note={states.note} fill>
        <Row>
          <Sample caption="Rest">
            <Button variant="outline">Button</Button>
          </Sample>
          <Sample caption="Hover it">
            <Button variant="outline">Button</Button>
          </Sample>
          <Sample caption="Tab to it">
            <Button variant="outline">Button</Button>
          </Sample>
          <Sample caption="Disabled, and unhoverable">
            <Button variant="outline" disabled>
              Button
            </Button>
          </Sample>
        </Row>
      </Specimen>

      <Specimen name={working.name} note={working.note} fill>
        <PendingSample />
      </Specimen>

      <Specimen name={withIcon.name} note={withIcon.note} fill>
        <Row>
          <Sample caption="Leading">
            <Button variant="outline">
              <Download data-icon="inline-start" />
              Download
            </Button>
          </Sample>
          <Sample caption="Trailing">
            <Button variant="outline">
              Continue
              <ArrowRight data-icon="inline-end" />
            </Button>
          </Sample>
          <Sample caption="Primary, leading">
            <Button>
              <Send data-icon="inline-start" />
              Send
            </Button>
          </Sample>
        </Row>
      </Specimen>

      <Specimen name={iconOnly.name} note={iconOnly.note} fill>
        <Row>
          <Sample caption="icon, 28px">
            <Button size="icon" variant="outline" aria-label="Edit this record">
              <Pencil />
            </Button>
          </Sample>
          <Sample caption="icon-sm, 24px">
            <Button size="icon-sm" variant="ghost" aria-label="Delete this record">
              <Trash2 />
            </Button>
          </Sample>
          <Sample caption="Ghost, muted until hovered">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Download this record"
              className="text-muted-foreground hover:text-foreground"
            >
              <Download />
            </Button>
          </Sample>
        </Row>
      </Specimen>

      <Specimen name={grouped.name} note={grouped.note} fill>
        <Row>
          <Sample caption="Alternatives to each other">
            <ButtonGroup>
              <Button variant="outline">Draft</Button>
              <Button variant="outline">Final</Button>
            </ButtonGroup>
          </Sample>
          <Sample caption="With a separator">
            <ButtonGroup>
              <Button variant="outline">Save</Button>
              <ButtonGroupSeparator />
              <Button variant="outline" size="icon" aria-label="More save options">
                <ArrowRight />
              </Button>
            </ButtonGroup>
          </Sample>
        </Row>
      </Specimen>

      <Specimen name={add.name} note={add.note} fill>
        <Row>
          <Sample caption="Opens a panel">
            <AddButton>Add client</AddButton>
          </Sample>
          <Sample caption="Navigates">
            <AddLink href="#">New invoice</AddLink>
          </Sample>
          <Sample caption="Quieter, in a section">
            <AddButton variant="outline">Add line</AddButton>
          </Sample>
        </Row>
      </Specimen>

      <Specimen name={confirmed.name} note={confirmed.note} fill>
        <Row>
          <Sample caption="Labelled, in a footer">
            <ConfirmActionButton
              label="Delete this record"
              title="Delete this record"
              description="Nothing is deleted here: this is the library. On a real page this is the wording that names the thing and states what cannot be undone."
              confirmLabel="Delete"
              confirmVariant="destructive"
              onConfirm={() => {}}
            />
          </Sample>
          <Sample caption="Icon, in a toolbar">
            <ConfirmActionButton
              variant="ghost"
              size="icon-sm"
              label="Delete this record, from a toolbar"
              tooltip="Delete"
              icon={<Trash2 className="size-3.5" />}
              title="Delete this record"
              description="The same control with no room for a word. The tooltip is one word; the label is the sentence a screen reader reads."
              confirmLabel="Delete"
              confirmVariant="destructive"
              onConfirm={() => {}}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            />
          </Sample>
        </Row>
      </Specimen>

      <Specimen name={removeRow.name} note={removeRow.note} fill>
        <Row>
          <Sample caption="On a repeatable row">
            <RemoveButton label="Remove line 2" onConfirm={() => {}} />
          </Sample>
          <Sample caption="Disabled on the last row">
            <RemoveButton label="Remove the only line" onConfirm={() => {}} disabled />
          </Sample>
        </Row>
      </Specimen>

      <Specimen name={swap.name} note={swap.note} fill>
        <Row>
          <Sample caption="Click it">
            <ConfirmButton
              idleIcon={Download}
              idleLabel="Download"
              confirmIcon={Check}
              confirmLabel="Downloaded"
              iconMotion="bob-down"
              onAction={() => {}}
              variant="outline"
            />
          </Sample>
          <Sample caption="Primary, and it bobs up">
            <ConfirmButton
              idleIcon={Send}
              idleLabel="Send"
              confirmIcon={Check}
              confirmLabel="Sent"
              iconMotion="bob-up"
              onAction={() => {}}
            />
          </Sample>
        </Row>
      </Specimen>

      <Specimen name={copy.name} note={copy.note} fill>
        <Row>
          <Sample caption="Click it, then check the clipboard">
            <CopyButton value="QS-INV-2627-001" label="Copy the document number" />
          </Sample>
        </Row>
      </Specimen>

      <Specimen name={toolbar.name} note={toolbar.note} fill>
        <Row>
          <Sample caption="The drawer’s own control row">
            <div className="flex items-center gap-1">
              <IconAction
                icon={Download}
                label="Download the list"
                tooltip="Download"
                onClick={() => {}}
              />
              <IconAction icon={Pencil} label="Edit this record" tooltip="Edit" onClick={() => {}} />
              <IconAction icon={Plus} label="Add a record" tooltip="Add" onClick={() => {}} />
              <IconAction
                icon={Trash2}
                label="Delete this record"
                tooltip="Delete"
                disabled
                onClick={() => {}}
              />
            </div>
          </Sample>
        </Row>
      </Specimen>
    </>
  );
}

/**
 * The spinner, driven by a real click rather than shown as a static state.
 *
 * What there is to see is that the label does not move: the button keeps its
 * width, the spinner appears in front, and the control disables itself so the
 * second click cannot land. Two seconds, long enough to watch.
 */
function PendingSample() {
  const [pending, setPending] = useState(false);

  return (
    <Row>
      <Sample caption="Click it">
        <Button
          pending={pending}
          onClick={() => {
            setPending(true);
            setTimeout(() => setPending(false), 2000);
          }}
        >
          Save settings
        </Button>
      </Sample>
      <Sample caption="Held, for comparison">
        <Button pending>Save settings</Button>
      </Sample>
    </Row>
  );
}
