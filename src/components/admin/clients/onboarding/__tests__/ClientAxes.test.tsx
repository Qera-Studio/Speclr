import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientAxes from '../ClientAxes';

/**
 * The row above the step tracker: the client's kind and country, as text that
 * opens a control. It stores nothing, so every case here is "it shows the two
 * facts and hands a change back"; where the change lands is the shell's job
 * and is tested there.
 */
const onKindChange = jest.fn();
const onCountryChange = jest.fn();

beforeEach(() => jest.clearAllMocks());

function renderAxes(kind: 'individual' | 'company' = 'individual', country = 'IN') {
  return render(
    <ClientAxes
      kind={kind}
      country={country}
      onKindChange={onKindChange}
      onCountryChange={onCountryChange}
    />,
  );
}

describe('ClientAxes', () => {
  it('names both answers, each as a control with a purpose a reader can hear', () => {
    renderAxes('company', 'AE');
    expect(screen.getByRole('button', { name: /type:.*company/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /country:.*united arab emirates/i }),
    ).toBeInTheDocument();
  });

  it('offers the other kind and hands it back', async () => {
    const user = userEvent.setup();
    renderAxes('individual');

    await user.click(screen.getByRole('button', { name: /type:/i }));
    await user.click(await screen.findByRole('menuitemradio', { name: /a company/i }));

    expect(onKindChange).toHaveBeenCalledWith('company');
  });

  it('searches the countries and hands the chosen code back', async () => {
    const user = userEvent.setup();
    renderAxes('individual', 'IN');

    await user.click(screen.getByRole('button', { name: /country:/i }));
    await user.type(await screen.findByRole('searchbox', { name: /search countries/i }), 'arab');

    // Narrowed: the Emirates and Saudi Arabia are offered, India is not.
    expect(screen.getByRole('button', { name: /united arab emirates/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^india$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /united arab emirates/i }));
    expect(onCountryChange).toHaveBeenCalledWith('AE');
  });

  it('does not report a change when the current country is picked again', async () => {
    const user = userEvent.setup();
    renderAxes('individual', 'IN');

    await user.click(screen.getByRole('button', { name: /country:/i }));
    await user.type(await screen.findByRole('searchbox', { name: /search countries/i }), 'india');
    await user.click(screen.getByRole('button', { name: /^india$/i }));

    expect(onCountryChange).not.toHaveBeenCalled();
  });
});
