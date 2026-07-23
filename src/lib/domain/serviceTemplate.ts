/**
 * Reusable service templates and the per-contract schedule they seed.
 *
 * A ServiceTemplate is a saved, named block of work (scope, exclusions,
 * milestones, pricing note). Copying a template into a contract produces an
 * editable ContractSchedule that keeps a provenance link back to its source
 * template but is otherwise a detached copy — editing the contract never
 * mutates the saved template.
 *
 * Client-safe: zod schemas are shared by client forms and Server Actions.
 */

import { z } from 'zod';
import type { ContractSchedule, ContractMilestone } from './types';

export interface ServiceTemplate {
  id: string;
  name: string;
  overview: string;
  scopeItems: string[];
  exclusionItems: string[];
  priceNote: string;
  milestones: ContractMilestone[];
  revisionsNote: string;
  disclaimerNote: string;
  supportNote: string;
  createdAt: number;
  updatedAt: number;
}

const bullet = z.string().trim().max(500);
const note = z.string().trim().max(4000);
const milestone = z.object({
  label: z.string().trim().max(60),
  scope: z.string().trim().max(500),
});

export const serviceInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  overview: note,
  scopeItems: z.array(bullet).max(60),
  exclusionItems: z.array(bullet).max(60),
  priceNote: note,
  milestones: z.array(milestone).max(30),
  revisionsNote: note,
  disclaimerNote: note,
  supportNote: note,
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;

export const contractScheduleSchema = serviceInputSchema
  .extend({
    sourceServiceId: z.string().optional(),
    title: z.string().trim().min(1).max(200),
  })
  .omit({ name: true });

export function emptyServiceInput(): ServiceInput {
  return {
    name: '', overview: '', scopeItems: [], exclusionItems: [], priceNote: '',
    milestones: [], revisionsNote: '', disclaimerNote: '', supportNote: '',
  };
}

export function serviceToSchedule(template: ServiceTemplate): ContractSchedule {
  return {
    sourceServiceId: template.id,
    title: template.name,
    overview: template.overview,
    scopeItems: [...template.scopeItems],
    exclusionItems: [...template.exclusionItems],
    priceNote: template.priceNote,
    milestones: template.milestones.map((m) => ({ ...m })),
    revisionsNote: template.revisionsNote,
    disclaimerNote: template.disclaimerNote,
    supportNote: template.supportNote,
  };
}
