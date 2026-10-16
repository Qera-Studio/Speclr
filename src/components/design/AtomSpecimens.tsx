"use client";

import { Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Specimen } from "./Specimen";
import type { LibraryEntry } from "./catalogue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { DerivedNote } from "@/components/ui/derived-note";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { accentBadge, ACCENTS } from "@/lib/accent";

export function AtomSpecimens({ entry }: { entry: LibraryEntry }) {
  const v = entry.variants;

  if (entry.slug === "field") {
    return (
      <>
        <Specimen name={v[0].name} note={v[0].note} fill>
          <div className="flex w-full flex-wrap items-end gap-8">
            <div className="flex items-end gap-2">
              <Field>
                <FieldLabel htmlFor="ds-compact">Compact, 32px</FieldLabel>
                <Input id="ds-compact" placeholder="In the editor rail" />
              </Field>
              <Button>Beside it</Button>
            </div>
            <FieldGroup size="form" className="w-auto">
              <div className="flex items-end gap-2">
                <Field>
                  <FieldLabel htmlFor="ds-form">Form, 36px</FieldLabel>
                  <Input id="ds-form" size="form" placeholder="In a form" />
                </Field>
                <Button>Beside it</Button>
              </div>
            </FieldGroup>
          </div>
        </Specimen>
        <Specimen name={v[1].name} note={v[1].note} fill>
          <div className="flex w-full flex-wrap items-start gap-8">
            <Field>
              <FieldLabel htmlFor="ds-rest">Rest</FieldLabel>
              <Input id="ds-rest" placeholder="Clayora Private Limited" />
            </Field>
            <Field data-invalid>
              <FieldLabel htmlFor="ds-invalid">Invalid</FieldLabel>
              <Input id="ds-invalid" aria-invalid defaultValue="29ABCDE1234F1Z" />
              <FieldError>The check character does not match.</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="ds-disabled">Disabled</FieldLabel>
              <Input id="ds-disabled" disabled defaultValue="Not yours to edit" />
            </Field>
            <Field>
              <FieldLabel htmlFor="ds-derived">Filled in</FieldLabel>
              <Input id="ds-derived" readOnly defaultValue="ABCDE1234F" />
              <DerivedNote>From the GSTIN above.</DerivedNote>
            </Field>
          </div>
        </Specimen>
        <Specimen name={v[2].name} note={v[2].note} fill>
          <div className="flex w-full flex-wrap items-start gap-8">
            <Textarea aria-label="Notes" placeholder="A textarea grows with its content" className="w-64" />
            <label className="flex items-center gap-2 text-body">
              <Checkbox defaultChecked /> A checkbox
            </label>
            <label className="flex items-center gap-2 text-body">
              <Switch defaultChecked /> A switch
            </label>
          </div>
        </Specimen>
      </>
    );
  }
  if (entry.slug === "badge") {
    return (
      <>
        <Specimen name={v[0].name} note={v[0].note} fill>
          <div className="flex items-center gap-3">
            <Badge status="draft" />
            <Badge status="finalized" />
            <Badge status="void" />
          </div>
        </Specimen>
        <Specimen name={v[1].name} note={v[1].note} fill>
          <div className="flex flex-wrap items-center gap-3">
            {ACCENTS.map((hue) => (
              <Badge key={hue} className={accentBadge(hue)}>
                {hue}
              </Badge>
            ))}
          </div>
        </Specimen>
      </>
    );
  }
  if (entry.slug === "overlays") {
    return (
      <>
        <Specimen name={v[0].name} note={v[0].note} fill>
          <div className="flex items-center gap-6">
            <Tooltip>
              <TooltipTrigger render={<Button size="sm" icon aria-label="Download this record" />}>
                <Download />
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
            <Popover>
              <PopoverTrigger render={<Button />}>Popover</PopoverTrigger>
              <PopoverContent className="w-56 text-body">
                Four pixels from its anchor, never narrower than it, overlay shadow.
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" icon aria-label="More actions" />}>
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Pencil /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Specimen>
        <Specimen name={v[1].name} note={v[1].note} fill>
          <div className="flex items-center gap-6">
            <ConfirmDialog
              trigger={<Button variant="destructive">Delete draft</Button>}
              title="Delete draft"
              consequence="The draft and its line items are removed. Finalized documents are not affected."
              confirmLabel="Delete draft"
              destructive
              onConfirm={() => {}}
            />
            <p className="max-w-sm text-meta text-muted-foreground">
              Title: verb and object, no question mark. One sentence of consequence. Cancel is
              always Cancel. The confirm repeats the verb, solid red when destructive.
            </p>
          </div>
        </Specimen>
      </>
    );
  }
  if (entry.slug === "tabs") {
    return (
      <Specimen name={v[0].name} note={v[0].note} fill>
        <div className="flex flex-wrap items-center gap-8">
          <Tabs defaultValue="table">
            <TabsList>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="cards">Cards</TabsTrigger>
              <TabsTrigger value="board">Board</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs defaultValue="all">
            <TabsList size="sm">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="final">Final</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs defaultValue="month">
            <TabsList size="lg">
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="quarter">Quarter</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Specimen>
    );
  }
  return null;
}
