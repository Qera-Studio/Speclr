import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentEditor from "../DocumentEditor";
import { selectComboboxOption } from "@/test-utils/combobox";
import type { ClientRecord, InvoiceOption } from "@/lib/domain/types";

const push = jest.fn();
const createDraft = jest.fn();
const updateDraft = jest.fn();
const listInvoicesForClient = jest.fn();
const finalizeDocument = jest.fn();
const deleteDraftAction = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/client",
  useRouter: () => ({ push: (u: string) => push(u), refresh: jest.fn() }),
}));
jest.mock("@/server/actions/documents", () => ({
  createDraft: (...a: unknown[]) => createDraft(...a),
  updateDraft: (...a: unknown[]) => updateDraft(...a),
  listInvoicesForClient: (...a: unknown[]) => listInvoicesForClient(...a),
  finalizeDocument: (...a: unknown[]) => finalizeDocument(...a),
  deleteDraftAction: (...a: unknown[]) => deleteDraftAction(...a),
}));

const clients = [
  {
    id: "c1",
    name: "Acme Co.",
    address: "Road",
    email: "a@b.com",
    phone: "9",
    gstin: "",
    // Unregistered: the place of supply falls back to the address state.
    addressParts: {
      line1: "Road",
      city: "Ghaziabad",
      state: "Uttar Pradesh",
      pincode: "201017",
      country: "IN",
    },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "c2",
    name: "Beta Ltd.",
    address: "Lane",
    email: "b@b.com",
    phone: "9",
    gstin: "",
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "c3",
    name: "Tamil Client",
    address: "Chennai",
    email: "c@b.com",
    phone: "9",
    // Registered: the GSTIN's first two digits win over anything else.
    gstin: "33AABCQ2864Q1ZZ",
    addressParts: {
      line1: "Anna Salai",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600002",
      country: "IN",
    },
    createdAt: 0,
    updatedAt: 0,
  },
] as ClientRecord[];

const invoice: InvoiceOption = {
  id: "inv-1",
  number: "QS-INV-2627-001",
  issueDate: "2026-06-10",
  totalPaise: 177000,
  lineItems: [{ description: "Brand system", ratePaise: 150000, qty: 1 }],
  gstRatePercent: 18,
  placeOfSupplyStateCode: "09",
};

beforeEach(() => {
  jest.clearAllMocks();
  listInvoicesForClient.mockResolvedValue([]);
  Object.defineProperty(URL, "createObjectURL", {
    writable: true,
    value: jest.fn(() => "blob:x"),
  });
});

/**
 * Opens a line item's fields, if that row has a lock at all.
 *
 * Only a row a Service owns is locked — one seeded from the client's retainers,
 * which is the case these tests care about. The blank default row and anything
 * added by hand carry no lock and are open already, so the click is skipped
 * rather than the helper split in two. Addressed by position, because the lock
 * button carries the name and the description beside it is plain text.
 */
async function expandLineItem(u: ReturnType<typeof userEvent.setup>, n = 1) {
  const lock = screen.queryByRole("button", { name: `Unlock line item ${n}` });
  if (lock) await u.click(lock);
}

/**
 * There is no Save button — the draft writes itself a second after the typing
 * stops (`AUTOSAVE_MS`). Real timers rather than fake ones: these tests drive
 * Base UI comboboxes, which schedule their own work, and faking the clock under
 * them is a bigger liability than the second this costs.
 */
async function autosaved(action: jest.Mock) {
  await waitFor(() => expect(action).toHaveBeenCalled(), { timeout: 3000 });
}

describe("DocumentEditor (new invoice)", () => {
  it("renders the client picker, a line item, and GST fields", () => {
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );

    expect(screen.getByLabelText(/^client$/i)).toBeInTheDocument();
    expect(screen.getByText("Untitled item")).toBeInTheDocument();
    expect(screen.getByLabelText(/gst rate/i)).toBeInTheDocument();
  });

  /**
   * The explanation moved behind an info icon, but it must still be a real
   * focusable control rather than a hover-only affordance — and the label must
   * stay exactly "Place of supply", since anything rendered inside a `<label>`
   * joins the input's accessible name.
   */
  it("explains where place of supply comes from, without crowding the label", () => {
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );

    expect(screen.getByLabelText("Place of supply")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /where does place of supply come from/i,
      }),
    ).toBeInTheDocument();
  });

  /**
   * Place of supply is derived from the recipient, not typed — `PRINCIPLES.md`
   * rule 3, and the violation that produced a wrong invoice. The field is
   * read-only until someone deliberately overrides it.
   */
  it("derives place of supply from the picked client and shows it read-only", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );

    await selectComboboxOption(u, "Client", "Tamil Client");

    const field = screen.getByLabelText("Place of supply");
    expect(field).toHaveValue("33 · Tamil Nadu");
    expect(field).toHaveAttribute("readonly");
  });

  it("takes the state from an unregistered client’s address instead", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );

    await selectComboboxOption(u, "Client", "Acme Co.");
    expect(screen.getByLabelText("Place of supply")).toHaveValue(
      "09 · Uttar Pradesh",
    );
  });

  /**
   * The wording is behind one row, not four cards in the rail.
   *
   * The four sections are right on almost every document, so leaving them in
   * the rail spent four rows saying "not this one" above the fields that are
   * actually edited.
   */
  it("keeps the printed wording out of the rail until the dialog is opened", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );

    expect(screen.queryByLabelText("Reverse charge")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Heading/ }),
    ).not.toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: /wording/i }));

    expect(screen.getByLabelText("Reverse charge")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: /^Heading/ }));
    expect(screen.getByLabelText("Masthead")).toBeInTheDocument();
  });

  /**
   * There is no override, and that is the point.
   *
   * `PRINCIPLES.md` rule 3 permits one (derived by default, override explicit
   * and recorded) and there was one here, with a required reason. It was
   * removed on instruction: the code comes from the recipient's registration,
   * and an invoice naming another state is a wrong return rather than a
   * preference. The genuine s.12(3) case (a supply relating to immovable
   * property elsewhere) is what that gives up, and Qera does not make one.
   */
  it("offers no way to change the place of supply", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );

    await selectComboboxOption(u, "Client", "Acme Co.");

    expect(screen.getByLabelText("Place of supply")).toHaveAttribute(
      "readonly",
    );
    expect(
      screen.queryByRole("switch", { name: /override place of supply/i }),
    ).not.toBeInTheDocument();
  });

  /**
   * GST either applies or it does not. Switching it off must actually zero the
   * rate and clear the place of supply — a rate that is merely hidden would go
   * on feeding `computeTotals` and put tax on an invoice whose editor says
   * there is none.
   *
   * Reached through the override now: for a domestic client the switch is not
   * offered until the treatment is unlocked, because turning GST off on a
   * domestic supply is exactly the thing that is legally wrong. The guarantee
   * under test is unchanged.
   */
  it("zeroes the rate and place of supply when GST is switched off", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );

    await u.clear(screen.getByLabelText(/gst rate/i));
    await u.type(screen.getByLabelText(/gst rate/i), "18");
    await selectComboboxOption(u, "Client", "Acme Co.");
    expect(screen.getByLabelText("Place of supply")).toHaveValue(
      "09 · Uttar Pradesh",
    );

    await u.click(screen.getByRole("switch", { name: /edit gst/i }));
    await u.click(screen.getByRole("switch", { name: /gst applies/i }));

    // The rate branch is gone, the note branch is here instead.
    expect(screen.queryByLabelText(/gst rate/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Place of supply")).not.toBeInTheDocument();
    expect(screen.getByLabelText("GST note")).toBeInTheDocument();

    // Back on, and the rate that was actually being charged comes back with it.
    // It used to return as 0, so a document toggled twice was silently a 0%
    // invoice with a place of supply printed on it.
    await u.click(screen.getByRole("switch", { name: /gst applies/i }));
    expect(screen.getByLabelText(/gst rate/i)).toHaveValue("18");
    // Re-derived from the client that is still picked, rather than left blank:
    // the code is a fact about the recipient, not something the switch owns.
    expect(screen.getByLabelText("Place of supply")).toHaveValue(
      "09 · Uttar Pradesh",
    );
  });

  it("no longer offers a notes field", () => {
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );
    expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument();
  });

  it("creates a draft with rupees converted to paise, with no save button pressed", async () => {
    createDraft.mockResolvedValue({ success: true, id: "new-doc" });
    const replaceState = jest.spyOn(window.history, "replaceState");
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );

    await selectComboboxOption(u, /^client$/i, "Acme Co.");
    await expandLineItem(u);
    await u.type(screen.getByLabelText(/^description$/i), "Design");
    await u.type(screen.getByLabelText(/rate \(₹\)/i), "1500");
    await autosaved(createDraft);

    expect(createDraft).toHaveBeenCalledWith(
      "INV",
      "c1",
      expect.objectContaining({
        lineItems: expect.arrayContaining([
          expect.objectContaining({ ratePaise: 150000 }),
        ]),
      }),
    );
    // The URL becomes the draft's own without a navigation — a `router.push`
    // here would remount the editor and take the half-typed document with it.
    expect(replaceState).toHaveBeenCalledWith(null, "", "/client/docs/new-doc");
    expect(push).not.toHaveBeenCalled();
  });

  /** No button to forget, so the affordance is the status line. */
  it("has no save button, and says so once there is something to save", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );

    expect(
      screen.queryByRole("button", { name: /save draft/i }),
    ).not.toBeInTheDocument();

    await expandLineItem(u);
    await u.type(screen.getByLabelText(/^description$/i), "Design");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Pick a client to start saving.",
    );
  });

  it("filters a long client list by typing", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );

    await u.click(screen.getByLabelText(/^client$/i));
    await u.type(screen.getByLabelText(/^client$/i), "Beta");

    expect(
      await screen.findByRole("option", { name: "Beta Ltd." }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Acme Co." }),
    ).not.toBeInTheDocument();
  });

  it("has no invoice picker — that belongs to receipts", () => {
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );
    expect(screen.queryByLabelText(/against invoice/i)).not.toBeInTheDocument();
  });

  it("shows typed line-item text on the document before anything is saved", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );

    await expandLineItem(u);
    await u.type(screen.getByLabelText(/^description$/i), "Hosting for August");

    // The whole point of the preview: what you type is on the paper at once,
    // not after saving a draft and finding the mistake there.
    const sheet = document.querySelector(".print-sheet");
    expect(sheet).toHaveTextContent("Hosting for August");
  });

  it("names the client in the heading as soon as one is picked", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="INV" clients={clients} title="New invoice" />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "New invoice",
    );
    await selectComboboxOption(u, /^client$/i, "Acme Co.");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Acme Co.’s invoice",
    );
  });

  it("reads live form values through a hook, not form.watch()", () => {
    // Guard rail, not style policing. This app builds with `reactCompiler:
    // true`, which memoises an argument-less `watch()` call to its first result
    // for the life of the component — the preview then freezes on the empty
    // form for ever. jsdom runs uncompiled, so no behavioural test above can
    // catch a reintroduction; this can.
    const source = readFileSync(
      join(__dirname, "..", "DocumentEditor.tsx"),
      "utf8",
    );
    // Both ways it could come back: pulled off the form, or called on it.
    expect(source).not.toMatch(/^\s*watch,\s*$/m);
    expect(source).not.toMatch(/form\.watch\(/);
    expect(source).toMatch(/useWatch\(\{\s*control\s*\}\)/);
  });
});

describe("DocumentEditor (new receipt)", () => {
  it("waits for a client before offering invoices", () => {
    render(
      <DocumentEditor typeCode="REC" clients={clients} title="New receipt" />,
    );

    expect(screen.getByLabelText("Against invoice")).toBeDisabled();
    expect(listInvoicesForClient).not.toHaveBeenCalled();
  });

  it("lists that client’s finalized invoices once one is chosen", async () => {
    listInvoicesForClient.mockResolvedValue([invoice]);
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="REC" clients={clients} title="New receipt" />,
    );

    await selectComboboxOption(u, /^client$/i, "Acme Co.");

    expect(listInvoicesForClient).toHaveBeenCalledWith("c1");
    await u.click(await screen.findByLabelText("Against invoice"));
    expect(
      await screen.findByRole("option", { name: /QS-INV-2627-001/ }),
    ).toBeInTheDocument();
  });

  it("fills the receipt from the invoice it settles", async () => {
    listInvoicesForClient.mockResolvedValue([invoice]);
    createDraft.mockResolvedValue({ success: true, id: "rec-1" });
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="REC" clients={clients} title="New receipt" />,
    );

    await selectComboboxOption(u, /^client$/i, "Acme Co.");
    await selectComboboxOption(u, "Against invoice", /QS-INV-2627-001/);

    // Line items, GST and place of supply come across, and stay editable.
    await expandLineItem(u);
    expect(screen.getByLabelText(/^description$/i)).toHaveValue("Brand system");
    expect(screen.getByLabelText(/rate \(₹\)/i)).toHaveValue("1500.00");
    expect(screen.getByLabelText(/gst rate/i)).toHaveValue("18");
    expect(screen.getByLabelText("Invoice number")).toHaveValue(
      "QS-INV-2627-001",
    );
  });

  it("stores both the invoice id and the number it prints", async () => {
    listInvoicesForClient.mockResolvedValue([invoice]);
    createDraft.mockResolvedValue({ success: true, id: "rec-1" });
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="REC" clients={clients} title="New receipt" />,
    );

    await selectComboboxOption(u, /^client$/i, "Acme Co.");
    await selectComboboxOption(u, "Against invoice", /QS-INV-2627-001/);
    await autosaved(createDraft);

    expect(createDraft).toHaveBeenCalledWith(
      "REC",
      "c1",
      expect.objectContaining({
        payment: expect.objectContaining({
          againstInvoiceId: "inv-1",
          againstInvoiceNumber: "QS-INV-2627-001",
        }),
      }),
    );
  });

  it("drops the stored id when the number is edited by hand", async () => {
    listInvoicesForClient.mockResolvedValue([invoice]);
    createDraft.mockResolvedValue({ success: true, id: "rec-1" });
    const u = userEvent.setup();
    render(
      <DocumentEditor typeCode="REC" clients={clients} title="New receipt" />,
    );

    await selectComboboxOption(u, /^client$/i, "Acme Co.");
    await selectComboboxOption(u, "Against invoice", /QS-INV-2627-001/);
    await u.type(screen.getByLabelText("Invoice number"), "-AMENDED");

    // A stored id that disagrees with the printed number is worse than no id:
    // once the number is retyped, the link can no longer be vouched for.
    //
    // Asserted on the *last* write rather than the first: autosave may already
    // have banked the un-amended version, which is correct — it was true when
    // it was written.
    await waitFor(
      () => {
        const payload = createDraft.mock.calls.at(-1)?.[2] as
          { payment: Record<string, unknown> } | undefined;
        expect(payload?.payment.againstInvoiceNumber).toBe(
          "QS-INV-2627-001-AMENDED",
        );
        expect(payload?.payment.againstInvoiceId).toBeUndefined();
      },
      { timeout: 3000 },
    );
  });
});

describe("DocumentEditor (existing draft)", () => {
  const draft = {
    id: "d1",
    type: "INV",
    status: "draft",
    clientId: "c1",
    clientSnapshot: {
      name: "Acme Co.",
      address: "Road",
      email: "a@b.com",
      phone: "9",
    },
    issueDate: "2026-06-10",
    lineItems: [{ description: "Design", ratePaise: 150000, qty: 1 }],
    gstRatePercent: 18,
    placeOfSupplyStateCode: "09",
    createdAt: 0,
    updatedAt: 0,
  } as unknown as Parameters<typeof DocumentEditor>[0]["doc"];

  /**
   * The endorsement is written onto `content` when a zero-rated client is
   * picked, and for a long while nothing ever unwrote it. Change the client to
   * a domestic one and the invoice charged IGST while still carrying Rule 46's
   * export declaration: a statement that is false on its face, on a tax
   * invoice. The lock that keeps the rate and the label equal to the derived
   * treatment now keeps this equal to it too, so a draft carrying a stale one
   * corrects itself when it is opened.
   */
  it("drops a stale export endorsement on a domestic invoice", async () => {
    const stale = {
      ...draft,
      content: {
        exportEndorsement:
          "SUPPLY MEANT FOR EXPORT UNDER BOND OR LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX",
      },
    } as typeof draft;
    render(
      <DocumentEditor
        typeCode="INV"
        clients={clients}
        doc={stale}
        title="Edit invoice draft"
      />,
    );

    await waitFor(() =>
      expect(screen.queryByText(/SUPPLY MEANT FOR EXPORT/)).toBeNull(),
    );
  });

  it("will not finalize on a single click", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor
        typeCode="INV"
        clients={clients}
        doc={draft}
        title="Edit invoice draft"
      />,
    );

    await u.click(screen.getByRole("button", { name: /finalize/i }));

    // Finalizing claims a permanent GST number and makes the document
    // immutable. It must never happen from one stray click.
    expect(finalizeDocument).not.toHaveBeenCalled();
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });

  it("will not delete a draft on a single click", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor
        typeCode="INV"
        clients={clients}
        doc={draft}
        title="Edit invoice draft"
      />,
    );

    await u.click(screen.getByRole("button", { name: /delete draft/i }));

    expect(deleteDraftAction).not.toHaveBeenCalled();
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });

  it("deletes once confirmed", async () => {
    deleteDraftAction.mockResolvedValue({ success: true });
    const u = userEvent.setup();
    render(
      <DocumentEditor
        typeCode="INV"
        clients={clients}
        doc={draft}
        title="Edit invoice draft"
      />,
    );

    await u.click(screen.getByRole("button", { name: /delete draft/i }));
    const dialog = await screen.findByRole("alertdialog");
    await u.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    expect(deleteDraftAction).toHaveBeenCalledWith("d1");
  });
});

/**
 * What the whole client record exists for.
 *
 * A retainer is the same description at the same rate every month, and it was
 * being re-typed from memory into every invoice while the answer sat on the
 * client's own record. Rule 3, one document over.
 */
describe("DocumentEditor (line items from the client record)", () => {
  const services = [
    {
      code: "15",
      name: "Social media management",
      scheduleKey: "retainer",
      sortOrder: 1,
      archived: false,
      sacCode: "998314",
      overview: ["Paid and organic social, planned and posted monthly."],
      ratePaise: 30_000_00,
    },
    {
      code: "03",
      name: "Website build",
      scheduleKey: "build",
      sortOrder: 1,
      archived: false,
      sacCode: "998313",
      ratePaise: 120_000_00,
    },
  ] as unknown as Parameters<typeof DocumentEditor>[0]["services"];

  /** Acme, with one retainer at an agreed rate and one build at the list price. */
  const engaged = [
    {
      ...clients[0],
      commercial: {
        services: [{ code: "15", ratePaise: 20_000_00 }, { code: "03" }],
      },
    },
    clients[1],
  ] as ClientRecord[];

  it("fills the retainer lines when the client is picked", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor
        typeCode="INV"
        clients={engaged}
        services={services}
        title="New invoice"
      />,
    );

    await selectComboboxOption(u, "Client", "Acme Co.");

    // The client's own agreed rate, not the catalogue's ₹30,000.
    // Twice: once in the rail's summary, once on the sheet beside it.
    expect(await screen.findAllByText("Social media management")).toHaveLength(
      2,
    );
    expect(screen.getAllByText(/20,000\.00/).length).toBeGreaterThan(0);
    // The build is engaged but billed once, on a date nothing here knows, so it
    // is offered in the menu rather than assumed onto the document.
    expect(screen.queryByText("Website build")).not.toBeInTheDocument();
  });

  /**
   * The SAC is checked on the *sheet*, not in an input, because a seeded line
   * has no SAC input: the code is the Service's classification and Rule 46(g)
   * prints it, so retyping it per invoice is the thing being prevented.
   */
  it("brings the SAC with it", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor
        typeCode="INV"
        clients={engaged}
        services={services}
        title="New invoice"
      />,
    );

    await selectComboboxOption(u, "Client", "Acme Co.");

    expect(await screen.findByText("998314")).toBeInTheDocument();
  });

  /**
   * And **not** the Service's overview as a second description under it. The
   * catalogue's own account of the work used to seed a `detail` line that the
   * sheet printed under the description; nothing in CGST Rule 46 asks for one,
   * and two descriptions of one supply is one more thing that can disagree
   * with the other on a document retained 72 months. No input offers it now.
   */
  it("does not offer a detail line on a seeded row", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor
        typeCode="INV"
        clients={engaged}
        services={services}
        title="New invoice"
      />,
    );

    await selectComboboxOption(u, "Client", "Acme Co.");
    await expandLineItem(u);

    expect(screen.queryByLabelText(/^detail$/i)).toBeNull();
    expect(
      screen.queryByText(
        "Paid and organic social, planned and posted monthly.",
      ),
    ).toBeNull();
  });

  it("never overwrites lines that have already been written", async () => {
    const u = userEvent.setup();
    render(
      <DocumentEditor
        typeCode="INV"
        clients={engaged}
        services={services}
        title="New invoice"
      />,
    );

    await expandLineItem(u);
    await u.type(screen.getByLabelText("Description"), "Emergency rebrand");
    await selectComboboxOption(u, "Client", "Acme Co.");

    expect(screen.getAllByText("Emergency rebrand").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("Social media management"),
    ).not.toBeInTheDocument();
  });

  /**
   * The menu offers *this client's* other services and nothing else. The whole
   * catalogue used to follow them, which put twenty-two things nobody agreed to
   * under a heading that made them look agreed.
   */
  it("offers the client's own services, not the catalogue", async () => {
    const u = userEvent.setup();
    const withStranger = [
      ...(services ?? []),
      {
        code: "99",
        name: "Photography",
        scheduleKey: "build",
        overview: [],
        archived: false,
        ratePaise: 500000,
      },
    ] as typeof services;
    render(
      <DocumentEditor
        typeCode="INV"
        clients={engaged}
        services={withStranger}
        title="New invoice"
      />,
    );

    await selectComboboxOption(u, "Client", "Acme Co.");
    await u.click(screen.getByRole("button", { name: /add line item/i }));

    // Engaged but not seeded, so it is here.
    expect(
      await screen.findByRole("menuitem", { name: /Website build/ }),
    ).toBeInTheDocument();
    // Seeded onto the document already, so it is not offered twice.
    expect(
      screen.queryByRole("menuitem", { name: /Social media management/ }),
    ).not.toBeInTheDocument();
    // Never sold to this client, so it is a custom line if it is anything.
    expect(
      screen.queryByRole("menuitem", { name: /Photography/ }),
    ).not.toBeInTheDocument();
    // A catalogue that does not name what is being billed is an ordinary
    // Tuesday, so the free row never stops being reachable.
    expect(
      screen.getByRole("menuitem", { name: /custom line/i }),
    ).toBeInTheDocument();
  });
});
