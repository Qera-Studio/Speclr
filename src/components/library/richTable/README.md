# Rich client table (archived)

Archived 9 October 2026. A client list in which every cell is two lines about
one subject, in six columns (client, industry, location, contact, value,
owner), with no sideways scroll. It was built as an experiment against the live
clients list. It is shelved, not rejected: nothing here is wired to a page, the
nav or the component library, but it all still compiles and its tests still
run, so it cannot rot unnoticed.

## What is here

| File | What it is |
|---|---|
| `RichClientTable.tsx` | The table, on `RecordTable` (`fixed`, `controlsVisible`) |
| `rows.ts` | `RichClientRow` and twelve sample rows |
| `fromClient.ts` | `richRowOf`: a real `ClientRecord` as a row, through the shared helpers |
| `RichTableSpecimens.tsx` | The component-library specimen |
| `RichClientsPreview.tsx` | The live table with the real `ClientRowMenu` and server actions |
| `ArchivedPreviewPage.tsx` | The temporary `/client/clients-rich` page |

The shared pieces it added stay in use-ready form and are harmless unused:
`RecordTable`'s `fixed` and `controlsVisible`, `AmountCell`'s `chipClassName`,
`suffix` and `below`, `PeopleCell`'s `size`, and `flagOf` in `LocationCell`.

## Reviving it

1. **Library specimen:** add the `rich-table` entry back to
   `library/catalogue.ts` (source `src/components/library/richTable/RichClientTable.tsx`,
   rule §2.3) and render `RichTableSpecimens` for that slug in
   `ComponentLibrary.tsx`.
2. **Live preview page:** move `ArchivedPreviewPage.tsx` to
   `src/app/(app)/client/clients-rich/page.tsx`, and add
   `{ href: '/client/clients-rich', label: 'Clients (preview)', icon: Rows3 }`
   to the client `records` in `admin/nav.ts` (its two nav tests count the rows).
3. **To replace the clients list for real**, render `RichClientsPreview` (or
   fold it into `ClientManager`) at `/client/clients`, and drop the preview page.
