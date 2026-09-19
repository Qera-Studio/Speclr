import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServicePage from '../ServicePage';
import { PARTS } from '@/lib/domain/seed/parts';
import { removeService } from '@/server/actions/services';

const push = jest.fn();
jest.mock('@/server/actions/services', () => ({
  saveServiceSection: jest.fn(async () => ({ success: true })),
  removeService: jest.fn(async () => ({ success: true })),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: jest.fn() }) }));

/**
 * One Service, on its own page: the items, the wording and the libraries, each
 * its own form, and the one way to retire it.
 *
 * A page rather than a second tab in the details dialog. That dialog is five
 * scalar fields by design; a Service also carries thirteen list fields and a
 * list of items, and two surfaces writing one row is how a section quietly goes
 * missing (CONTEXT §5d made the same call for clients).
 */

const build = PARTS.find((s) => s.code === '06')!;

beforeEach(() => jest.clearAllMocks());

describe('ServicePage', () => {
  it('is titled by the service, with its code and schedule', () => {
    render(<ServicePage service={build} exclusions={[]} clientInputs={[]} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Custom web build' })).toBeInTheDocument();
    expect(screen.getByText('06')).toBeInTheDocument();
    expect(screen.getByText('Build')).toBeInTheDocument();
  });

  it('holds the three sections, each with its own save', () => {
    render(<ServicePage service={build} exclusions={[]} clientInputs={[]} />);

    expect(screen.getByRole('heading', { name: 'Items' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Wording' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Libraries' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save items' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save wording' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save libraries' })).toBeInTheDocument();
  });

  /**
   * Archiving asks first and then leaves for the catalogue. It archives
   * rather than deletes: a Service that has been on a contract stays readable,
   * and every contract holds its own copy regardless.
   */
  it('archives after asking, then returns to the catalogue', async () => {
    const user = userEvent.setup();
    render(<ServicePage service={build} exclusions={[]} clientInputs={[]} />);

    await user.click(screen.getByRole('button', { name: 'Archive service' }));
    expect(removeService).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Archive' }));

    expect(removeService).toHaveBeenCalledWith('06');
    expect(push).toHaveBeenCalledWith('/client/services');
  });
});
