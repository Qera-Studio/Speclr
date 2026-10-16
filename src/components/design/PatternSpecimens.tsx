"use client";

import { Archive, Download } from "lucide-react";
import { Specimen } from "./Specimen";
import type { LibraryEntry } from "./catalogue";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { CopyAction, IconAction } from "@/components/patterns/IconAction";
import { ConfirmActionButton, RemoveButton } from "@/components/patterns/ConfirmAction";
import { AddButton, AddLink } from "@/components/patterns/AddAction";
import { DateValue, FormSkeleton, TableSkeleton } from "@/components/patterns/Page";
import { AmountCell } from "@/components/patterns/AmountCell";
import { CopyValue } from "@/components/patterns/CopyCell";
import { Mono } from "@/components/patterns/Mono";
import type { FlowStep } from "@/components/patterns/flow/steps";

/** The step row below is drawn by hand from the real model's three states. */
const STEPS: Array<{ key: string; label: string; state: "done" | "current" | "locked" }> = [
  { key: "client", label: "Client", state: "done" },
  { key: "services", label: "Services", state: "current" },
  { key: "scope", label: "Scope", state: "locked" },
];
void (null as unknown as FlowStep<unknown> | null);

export function PatternSpecimens({ entry }: { entry: LibraryEntry }) {
  const v = entry.variants;

  if (entry.slug === "actions") {
    return (
      <>
        <Specimen name={v[0].name} note={v[0].note} fill>
          <div className="flex items-center gap-1">
            <IconAction icon={Download} label="Download this record" tooltip="Download" onClick={() => {}} />
            <IconAction icon={Archive} label="Archive this record" tooltip="Archive" onClick={() => {}} />
          </div>
        </Specimen>
        <Specimen name={v[1].name} note={v[1].note} fill>
          <CopyAction value="QS-INV-2627-001" label="Copy the document number" />
        </Specimen>
        <Specimen name={v[2].name} note={v[2].note} fill>
          <div className="flex items-center gap-3">
            <AddButton>Add client</AddButton>
            <AddLink href="#" variant="secondary">
              New invoice
            </AddLink>
          </div>
        </Specimen>
        <Specimen name={v[3].name} note={v[3].note} fill>
          <div className="flex items-center gap-3">
            <ConfirmActionButton
              label="Finalize invoice"
              title="Finalize invoice"
              description="The number is claimed and the document cannot be edited afterwards."
              confirmLabel="Finalize invoice"
              variant="primary"
              onConfirm={() => {}}
            />
            <RemoveButton label="Remove line 2" onConfirm={() => {}} />
          </div>
        </Specimen>
      </>
    );
  }
  if (entry.slug === "cells") {
    return (
      <>
        <Specimen name={v[0].name} note={v[0].note} fill>
          <DateValue value="2026-10-16" />
        </Specimen>
        <Specimen name={v[1].name} note={v[1].note} fill>
          <AmountCell minor={12000000} currency="INR" />
        </Specimen>
        <Specimen name={v[2].name} note={v[2].note} fill>
          <Mono>
            <CopyValue value="29ABCDE1234F1Z5" label="Copy the GSTIN" />
          </Mono>
        </Specimen>
      </>
    );
  }
  if (entry.slug === "flow") {
    return (
      <Specimen name={v[0].name} note={v[0].note} fill>
        <ol className="flex items-center gap-8 text-body">
          {STEPS.map((step, i) => (
            <li
              key={step.key}
              data-current={step.state === "current" || undefined}
              className={
                step.state === "done"
                  ? "flex items-center gap-2 text-primary"
                  : step.state === "current"
                    ? "flex items-center gap-2 font-medium"
                    : "flex items-center gap-2 text-muted-foreground"
              }
            >
              <span
                className={
                  step.state === "done"
                    ? "flex size-5 items-center justify-center rounded-sm bg-primary text-primary-foreground text-caption"
                    : "flex size-5 items-center justify-center rounded-sm bg-muted text-caption"
                }
              >
                {step.state === "done" ? "✓" : i + 1}
              </span>
              {step.label}
            </li>
          ))}
        </ol>
      </Specimen>
    );
  }
  if (entry.slug === "empty") {
    return (
      <>
        <Specimen name={v[0].name} note={v[0].note} fill>
          <div className="flex w-full flex-col gap-6">
            <TableSkeleton rows={3} />
            <FormSkeleton fields={2} />
          </div>
        </Specimen>
        <Specimen name={v[1].name} note={v[1].note} fill>
          <EmptyState preset="none-yet" noun="client" className="border" action={<AddButton>Add client</AddButton>} />
        </Specimen>
        <Specimen name={v[2].name} note={v[2].note} fill>
          <EmptyState preset="no-matches" noun="document" className="border" description="3 documents are hidden by the current filters." action={<Button>Clear filters</Button>} />
        </Specimen>
        <Specimen name={v[3].name} note={v[3].note} fill>
          <EmptyState preset="error" className="border" description="Nothing was changed." action={<Button variant="primary">Try again</Button>} />
        </Specimen>
        <Specimen name={v[4].name} note={v[4].note} fill>
          <EmptyState preset="not-found" className="border" description="The link may be old, or the record it pointed at was deleted." action={<Button variant="primary">Go to the dashboard</Button>} />
        </Specimen>
        <Specimen name={v[5].name} note={v[5].note} fill>
          <Button variant="primary" pending>
            Save settings
          </Button>
        </Specimen>
      </>
    );
  }
  return null;
}
