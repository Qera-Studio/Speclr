/**
 * Reusable employee/intern records for HR documents (stipend slips, offer,
 * experience, and exit letters). Mirrors the ServiceTemplate/ClientRecord
 * entity pattern: an interface, a zod input schema, an empty-input helper,
 * and a pronoun resolver used by letter boilerplate.
 *
 * Client-safe: zod schemas are shared by client forms and Server Actions.
 */

import { z } from 'zod';
import { isISODate } from './dates';
import type { EngagementType, PronounKey } from './types';

export interface EmployeeRecord {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  role: string;
  engagementType: EngagementType;
  pronoun: PronounKey;
  joiningDate: string;
  endDate?: string;
  payAmountPaise: number;
  bank: { bankName: string; accountNo: string; ifsc: string; upiId?: string };
  createdAt: number;
  updatedAt: number;
}

const isoDate = z.string().refine(isISODate, { message: "Expected 'YYYY-MM-DD'." });

export const employeeInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(500),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(1).max(30),
  role: z.string().trim().min(1).max(200),
  engagementType: z.enum(['intern', 'employee']),
  pronoun: z.enum(['he', 'she', 'they']),
  joiningDate: isoDate,
  endDate: isoDate.optional(),
  payAmountPaise: z.number().int().min(0).max(1e13),
  bank: z.object({
    bankName: z.string().trim().max(120),
    accountNo: z.string().trim().max(40),
    ifsc: z.string().trim().max(20),
    upiId: z.string().trim().max(60).optional(),
  }),
});

export type EmployeeInput = z.infer<typeof employeeInputSchema>;

export function emptyEmployeeInput(todayIso: string): EmployeeInput {
  return {
    name: '', address: '', email: '', phone: '', role: '',
    engagementType: 'intern', pronoun: 'he',
    joiningDate: todayIso, payAmountPaise: 0,
    bank: { bankName: '', accountNo: '', ifsc: '', upiId: '' },
  };
}

const PRONOUNS: Record<PronounKey, { subject: string; object: string; possessive: string }> = {
  he: { subject: 'he', object: 'him', possessive: 'his' },
  she: { subject: 'she', object: 'her', possessive: 'her' },
  they: { subject: 'they', object: 'them', possessive: 'their' },
};
export function pronounSet(p: PronounKey) {
  return PRONOUNS[p];
}
