import {
  serviceInputSchema,
  contractScheduleSchema,
  emptyServiceInput,
  serviceToSchedule,
} from '../serviceTemplate';
import type { ServiceTemplate } from '../serviceTemplate';

const validService = {
  name: 'Shopify E-commerce Website',
  overview: 'Design adaptation, development, setup and deployment.',
  scopeItems: ['Store setup', 'Theme customization'],
  exclusionItems: ['Branding strategy'],
  priceNote: '₹ 50,000.00 ONLY\n50% advance / 50% final',
  milestones: [{ label: 'WEEK 1', scope: 'Store setup, theme finalization' }],
  revisionsNote: 'Up to three rounds of revisions.',
  disclaimerNote: 'Optimized for modern devices.',
  supportNote: 'Thirty days post-launch support.',
};

describe('serviceInputSchema', () => {
  it('accepts a valid service template', () => {
    expect(serviceInputSchema.safeParse(validService).success).toBe(true);
  });
  it('requires a name', () => {
    expect(serviceInputSchema.safeParse({ ...validService, name: '' }).success).toBe(false);
  });
  it('allows empty bullet lists and empty notes', () => {
    expect(
      serviceInputSchema.safeParse({
        ...validService, scopeItems: [], exclusionItems: [], milestones: [],
        overview: '', priceNote: '', revisionsNote: '', disclaimerNote: '', supportNote: '',
      }).success,
    ).toBe(true);
  });
  it('rejects a bullet longer than 500 chars', () => {
    expect(
      serviceInputSchema.safeParse({ ...validService, scopeItems: ['x'.repeat(501)] }).success,
    ).toBe(false);
  });
});

describe('emptyServiceInput', () => {
  it('produces a blank but schema-valid draft shape', () => {
    const blank = emptyServiceInput();
    expect(blank.name).toBe('');
    expect(Array.isArray(blank.scopeItems)).toBe(true);
  });
});

describe('serviceToSchedule', () => {
  it('copies a saved template into an editable schedule with provenance', () => {
    const template: ServiceTemplate = { id: 'svc-1', ...validService, createdAt: 1, updatedAt: 1 };
    const schedule = serviceToSchedule(template);
    expect(schedule.sourceServiceId).toBe('svc-1');
    expect(schedule.title).toBe(template.name);
    expect(schedule.scopeItems).toEqual(template.scopeItems);
    expect(schedule.scopeItems).not.toBe(template.scopeItems); // must be a copy
  });
});

describe('contractScheduleSchema', () => {
  it('validates a schedule shape', () => {
    const template: ServiceTemplate = { id: 'svc-1', ...validService, createdAt: 1, updatedAt: 1 };
    expect(contractScheduleSchema.safeParse(serviceToSchedule(template)).success).toBe(true);
  });
});
