import { completedSteps, onboardingSteps, onboardingStepsFor, resumeStep, stepIndex } from '../steps';
import type { ClientRecord } from '@/lib/domain/types';

const base: ClientRecord = {
  id: 'c1',
  name: 'Rahul Menon',
  companyName: 'Rahul Menon',
  address: 'C-204\nGhaziabad 201017',
  email: 'rahul@example.test',
  phone: '+919876543210',
  gstin: '',
  createdAt: 0,
  updatedAt: 0,
};

describe('onboardingSteps', () => {
  it('gives a company seven steps and an individual six', () => {
    expect(onboardingSteps('company')).toHaveLength(7);
    expect(onboardingSteps('individual')).toHaveLength(6);
  });

  // A person is their own contact; the step's two useful fields moved to
  // Identity. Nothing else differs.
  it('drops only Contacts', () => {
    const dropped = onboardingSteps('company')
      .map((s) => s.key)
      .filter((key) => !onboardingSteps('individual').some((s) => s.key === key));
    expect(dropped).toEqual(['contacts']);
  });

  it('reads a client with no entity type as a company', () => {
    expect(onboardingStepsFor(base)).toHaveLength(7);
    expect(onboardingStepsFor({ ...base, entityType: 'individual' })).toHaveLength(6);
  });
});

describe('stepIndex', () => {
  const individual = onboardingSteps('individual');

  it('finds a step by its slug', () => {
    expect(stepIndex(individual, 'commercial')).toBe(2);
  });

  // A pasted link naming a step this client does not have must land somewhere
  // real. First step, the same answer an unknown slug gets.
  it('falls back to the first step for a slug this kind does not have', () => {
    expect(stepIndex(individual, 'contacts')).toBe(0);
    expect(stepIndex(individual, 'nonsense')).toBe(0);
    expect(stepIndex(individual, null)).toBe(0);
  });
});

describe('completedSteps', () => {
  it('counts against this client’s own steps, never a fixed seven', () => {
    const person: ClientRecord = {
      ...base,
      entityType: 'individual',
      // Identity is complete; Contacts is not one of their steps at all.
      contacts: { roles: { signing: 'primary' } },
    };
    expect(completedSteps(person)).toBe(1);
    expect(completedSteps({ ...person, entityType: 'pvt_ltd' })).toBe(2);
  });
});

describe('resumeStep', () => {
  const person: ClientRecord = { ...base, entityType: 'individual' };

  it('opens the first step the record carries nothing for', () => {
    // Identity is complete, Tax is not, so Tax is where editing resumes.
    expect(resumeStep({ ...person, tax: {} })).toBe('tax');
  });

  // The count and the gap are different questions: four of six complete does
  // not mean the first four are the complete ones.
  it('lands on the gap, not on the step after the count', () => {
    expect(resumeStep({ ...person, tax: { gstin: '09AAACT2727Q1ZW' } })).toBe('commercial');
  });

  it('opens a finished client on its last step', () => {
    const done: ClientRecord = {
      ...person,
      tax: { gstin: '09AAACT2727Q1ZW' },
      commercial: { paymentTermsDays: 15, services: [{ code: 'brand' }] },
      attachments: [
        {
          id: 'a1',
          kind: 'pan',
          filename: 'pan.pdf',
          mime: 'application/pdf',
          size: 1,
          key: 'clients/c1/a1',
          uploadedAt: 0,
        },
      ],
      access: [{ id: 'x1', kind: 'other', label: 'Portal', location: '1Password' }],
    };
    expect(resumeStep(done)).toBe('access');
  });
});
