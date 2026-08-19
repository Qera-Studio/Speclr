import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AttachmentsStep from '../AttachmentsStep';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * Attachments.
 *
 * One slot per document, so the two things worth pinning are that the slots
 * follow where the client is, and that a slot holds one file: uploading into a
 * full one replaces what was there rather than stacking a second copy the
 * operator has to tell apart.
 *
 * The upload is a three-to-four second round trip, so the card also has to fill
 * on the pick rather than on the response — a slot that stays empty that long
 * reads as a click that did not land.
 */

// `StepForm` comes from `stepKit`, which imports the client actions, which pull
// `next/cache` into jsdom. The step never calls it — its submit only moves on.
jest.mock('@/server/actions/clients', () => ({ saveClientSection: jest.fn() }));

const uploadClientAttachment = jest.fn();
const deleteClientAttachment = jest.fn();

jest.mock('@/server/actions/attachments', () => ({
  uploadClientAttachment: (...a: unknown[]) => uploadClientAttachment(...a),
  deleteClientAttachment: (...a: unknown[]) => deleteClientAttachment(...a),
}));

const onSaved = jest.fn();
const onRecordChanged = jest.fn();

const client = {
  id: 'c1',
  name: 'Clayora',
  companyName: 'Clayora Private Limited',
  addressParts: { country: 'IN' },
  createdAt: 0,
  updatedAt: 0,
} as unknown as ClientRecord;

const gstCertificate = {
  id: 'a1',
  kind: 'gst_certificate',
  filename: 'Clayora Private Limited - GST registration certificate.pdf',
  mime: 'application/pdf',
  size: 154_624,
  key: 'clients/c1/a1',
  uploadedAt: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  uploadClientAttachment.mockResolvedValue({ success: true, id: 'new' });
});

function renderStep(record: ClientRecord = client, kind: 'individual' | 'company' = 'company') {
  return render(
    <AttachmentsStep
      client={record}
      onSaved={onSaved}
      onRecordChanged={onRecordChanged}
      submitLabel="Access"
      kind={kind}
    />,
  );
}

const pdf = (name: string) => new File(['%PDF'], name, { type: 'application/pdf' });

test('an Indian client is asked for Indian paperwork, and not for anyone else’s', () => {
  renderStep();
  expect(screen.getByLabelText(/Add GST registration certificate/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Add PAN card/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/W-8/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/FIRC/i)).not.toBeInTheDocument();
});

test('a foreign client gets the export paperwork instead', () => {
  renderStep({ ...client, addressParts: { country: 'GB' } } as unknown as ClientRecord);
  // The slot's own file input, not the info icon beside it, which answers to
  // the same words.
  expect(screen.getByLabelText(/^Add W-8/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^Add FIRC/i)).toBeInTheDocument();
  // And each card explains the document behind an icon: an FIRC is unfamiliar
  // until the first export invoice, and hard to obtain a year late.
  expect(screen.getByRole('button', { name: /what is a FIRC/i })).toBeInTheDocument();
  expect(screen.queryByLabelText(/Add GST registration certificate/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Add PAN card/i)).not.toBeInTheDocument();
});

test('an individual is asked for a PAN card and never for an incorporation certificate', () => {
  // No registrar ever issued one, so the slot would be a card that can only
  // stay empty. Their PAN is the KYC document that does apply.
  renderStep(client, 'individual');
  expect(screen.getByLabelText(/Add PAN card/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Add GST registration certificate/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/certificate of incorporation/i)).not.toBeInTheDocument();
});

test('the "anything else" box joins the row when there are fewer than three slots', () => {
  // Two slots leave the row a card short, so the box fills the gap instead of
  // sitting below it as a wide rectangle. With nothing added there is also
  // nothing left to head, so the heading waits until there is.
  renderStep(client, 'individual');
  expect(screen.getByText('Add anything else')).toBeInTheDocument();
  expect(screen.queryByText('Anything else')).not.toBeInTheDocument();

  // Three slots, and it keeps its own section under the separator.
  renderStep();
  expect(screen.getAllByText('Anything else').length).toBe(1);
});

test('a file lands in the slot it was dropped on, with no type to set first', async () => {
  const user = userEvent.setup();
  renderStep();

  await user.upload(screen.getByLabelText(/Add PAN card/i), pdf('scan001.pdf'));

  await waitFor(() => expect(uploadClientAttachment).toHaveBeenCalled());
  const form = uploadClientAttachment.mock.calls[0][1] as FormData;
  expect(form.get('kind')).toBe('pan');
});

test('the card fills while the upload is in flight, before the server answers', async () => {
  const user = userEvent.setup();
  let resolve!: (value: { success: boolean; id: string }) => void;
  uploadClientAttachment.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );

  renderStep();
  await user.upload(screen.getByLabelText(/Add GST registration certificate/i), pdf('scan001.pdf'));

  expect(await screen.findByText('scan001.pdf')).toBeInTheDocument();
  const bar = screen.getByRole('progressbar', { name: /Uploading scan001\.pdf/i });
  // Indeterminate: only the browser → server leg reports bytes.
  expect(bar).not.toHaveAttribute('aria-valuenow');

  resolve({ success: true, id: 'new' });
  // The record updates and the wizard stays put. Attaching a file is not
  // finishing the step.
  await waitFor(() => expect(onRecordChanged).toHaveBeenCalled());
  expect(onSaved).not.toHaveBeenCalled();
});

test('a stored document shows its format and size', () => {
  renderStep({ ...client, attachments: [gstCertificate] } as unknown as ClientRecord);
  expect(screen.getByText('PDF · 151 KB')).toBeInTheDocument();
});

test('a stored document previews its own first page, PDF or image', () => {
  const { container } = renderStep({
    ...client,
    attachments: [
      gstCertificate,
      { ...gstCertificate, id: 'a2', kind: 'pan', mime: 'image/png' },
    ],
  } as unknown as ClientRecord);

  // The browser's own PDF viewer, with its chrome stripped. jsdom renders no
  // page, so this pins the wiring: the private route, and the fragment that
  // fits the page to the card's width.
  const frame = container.querySelector('iframe')!;
  expect(frame.getAttribute('src')).toBe('/api/clients/c1/files/a1#toolbar=0&navpanes=0&scrollbar=0&view=FitH');
  // An image goes through the same session-gated route, never next/image's
  // optimizer, which would cache a third party's document in a CDN.
  expect(container.querySelector('img')!.getAttribute('src')).toBe('/api/clients/c1/files/a2');
});

test('a password-protected PDF shows a lock instead of a broken viewer', () => {
  const { container } = renderStep({
    ...client,
    attachments: [{ ...gstCertificate, encrypted: true }],
  } as unknown as ClientRecord);

  expect(container.querySelector('iframe')).toBeNull();
  expect(screen.getByText(/is password-protected/i)).toBeInTheDocument();
});

test('uploading into a full slot replaces what was there', async () => {
  const user = userEvent.setup();
  renderStep({ ...client, attachments: [gstCertificate] } as unknown as ClientRecord);

  await user.upload(
    screen.getByLabelText('GST registration certificate', { selector: 'input' }),
    pdf('newer.pdf'),
  );

  await waitFor(() => expect(onRecordChanged).toHaveBeenCalled());
  const saved = onRecordChanged.mock.calls[0][0] as ClientRecord;
  // One GST certificate, and it is the new one. Two would leave the operator
  // guessing which of them the invoice was checked against.
  expect(saved.attachments!.filter((a) => a.kind === 'gst_certificate')).toHaveLength(1);
  expect(saved.attachments![0].id).toBe('new');
});

test('an extra keeps its own name and states its kind, since several may exist', () => {
  renderStep({
    ...client,
    attachments: [{ ...gstCertificate, id: 'a2', kind: 'purchase_order', filename: 'PO-4417.pdf' }],
  } as unknown as ClientRecord);

  expect(screen.getByText('PO-4417.pdf')).toBeInTheDocument();
  // Kind *and* format: the kind alone made a PNG filed as "Other" look like a
  // file whose type had been read as "Other".
  expect(screen.getByText(/Purchase order · PDF · 151 KB/)).toBeInTheDocument();
});

test('a second file picked mid-upload waits its turn rather than being refused', async () => {
  const user = userEvent.setup();
  const resolvers: ((value: { success: boolean; id: string }) => void)[] = [];
  uploadClientAttachment.mockImplementation(
    () => new Promise((r) => resolvers.push(r as never)),
  );

  renderStep();
  await user.upload(screen.getByLabelText(/Add GST registration certificate/i), pdf('gst.pdf'));
  await user.upload(screen.getByLabelText(/Add PAN card/i), pdf('pan.pdf'));

  // One in flight. Two would race: the action rewrites the whole client row, so
  // the second save would drop the first file and orphan its blob.
  await waitFor(() => expect(uploadClientAttachment).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('progressbar', { name: /Uploading gst\.pdf/i })).toBeInTheDocument();
  expect(screen.getByText('pan.pdf')).toBeInTheDocument();
  expect(screen.getByText(/Waiting to upload/i)).toBeInTheDocument();

  resolvers[0]({ success: true, id: 'new' });
  // And the backlog drains on its own.
  await waitFor(() => expect(uploadClientAttachment).toHaveBeenCalledTimes(2));
  expect((uploadClientAttachment.mock.calls[1][1] as FormData).get('kind')).toBe('pan');
});

test('a delete says it is happening while the round trip runs', async () => {
  const user = userEvent.setup();
  let resolve!: (value: { success: boolean }) => void;
  deleteClientAttachment.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );

  renderStep({ ...client, attachments: [gstCertificate] } as unknown as ClientRecord);
  await user.click(screen.getByRole('button', { name: /Remove Clayora/i }));
  await user.click(screen.getByRole('button', { name: /^Remove$|Delete/i }));

  expect(await screen.findByText(/Deleting Clayora/i)).toBeInTheDocument();

  resolve({ success: true });
  await waitFor(() => expect(onRecordChanged).toHaveBeenCalled());
});

describe('the “anything else” picker', () => {
  const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
    renderStep();
    // The last box is the extras one; the slots come first.
    const boxes = screen.getAllByRole('button', { name: /Drag and drop/i });
    await user.click(boxes[boxes.length - 1]);
    return screen.findByRole('dialog');
  };

  test('the box asks which document it is, rather than opening a file picker', async () => {
    const user = userEvent.setup();
    await openDialog(user);

    expect(screen.getByRole('button', { name: /^Purchase order/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Signature/ })).toBeInTheDocument();
    // The type used to be set beforehand in a combobox and stayed set, so the
    // next upload was filed as whatever the last one had been.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  test('search narrows the list, and never hides the generic card', async () => {
    const user = userEvent.setup();
    await openDialog(user);

    await user.type(screen.getByRole('searchbox', { name: /Search document types/i }), 'purchase');
    expect(screen.getByRole('button', { name: /^Purchase order/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Signature/ })).not.toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: /Search document types/i }));
    await user.type(screen.getByRole('searchbox', { name: /Search document types/i }), 'zzz');
    // Nothing matched, and that is exactly when "Other" is needed: it is the
    // answer for a document none of the cards name.
    expect(screen.getByRole('button', { name: /^Other/ })).toBeInTheDocument();
  });

  test('choosing a card uploads the file under that kind', async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user);

    // The card clicks the dialog's own hidden input; `user.upload` on it is the
    // same event the file dialog would produce. Scoped to the dialog: the slots
    // above have inputs of their own.
    await user.click(screen.getByRole('button', { name: /^Purchase order/ }));
    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, pdf('PO-4417.pdf'));

    await waitFor(() => expect(uploadClientAttachment).toHaveBeenCalled());
    expect((uploadClientAttachment.mock.calls[0][1] as FormData).get('kind')).toBe(
      'purchase_order',
    );
  });

  test('a file dropped on the box is uploaded once its kind is chosen', async () => {
    const user = userEvent.setup();
    renderStep();
    const boxes = screen.getAllByRole('button', { name: /Drag and drop/i });

    fireEvent.drop(boxes[boxes.length - 1], { dataTransfer: { files: [pdf('nda.pdf')] } });

    // The file is already in hand, so the dialog asks what it is and never
    // opens a second picker.
    await user.click(await screen.findByRole('button', { name: /^Non-disclosure agreement/ }));
    await waitFor(() => expect(uploadClientAttachment).toHaveBeenCalled());
    const form = uploadClientAttachment.mock.calls[0][1] as FormData;
    expect(form.get('kind')).toBe('nda');
    expect((form.get('file') as File).name).toBe('nda.pdf');
  });
});

test('a file over the size limit is refused here, not by the framework', async () => {
  const user = userEvent.setup();
  renderStep();

  // Over `MAX_ATTACHMENT_BYTES`. Sent, the body would be cut off mid-stream and
  // the action would reject with "Unexpected end of form", which crashes the
  // step instead of naming the problem.
  const huge = pdf('scan.pdf');
  Object.defineProperty(huge, 'size', { value: 26 * 1024 * 1024 });
  await user.upload(screen.getByLabelText(/Add GST registration certificate/i), huge);

  expect(await screen.findByText(/scan\.pdf is larger than 25 MB/i)).toBeInTheDocument();
  expect(uploadClientAttachment).not.toHaveBeenCalled();
});

test('a drop of several files uploads one and says what happened to the rest', async () => {
  renderStep();
  const files = [pdf('gst.pdf'), pdf('pan.pdf'), pdf('incorporation.pdf')];

  // `fireEvent`, and only here. The house rule is `userEvent`, which has no
  // drag-and-drop API at all — and the file inputs carry no `multiple`, so a
  // drop is the *only* way several files can reach this component.
  fireEvent.drop(screen.getAllByRole('button', { name: /Drag and drop/i })[0], {
    dataTransfer: { files },
  });

  await waitFor(() => expect(uploadClientAttachment).toHaveBeenCalledTimes(1));
  expect(screen.getByText(/2 other files were not uploaded/i)).toBeInTheDocument();
});
