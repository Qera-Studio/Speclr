/**
 * What a client does, as a fixed list.
 *
 * **Fixed, not free text**, and that is the whole reason this file exists. A
 * typed industry is a list of near-duplicates within a month: 'SaaS', 'Saas',
 * 'Software', 'Software as a Service' and 'B2B SaaS' are five rows that group,
 * filter and count as five different kinds of business. The value of this field
 * is entirely in the grouping, so a field that cannot group is a field with no
 * value.
 *
 * **Under a hundred, not every one.** A taxonomy that tries to be exhaustive
 * (NIC 2008 has around 1,200 classes) is a dropdown nobody can find anything
 * in, and the long tail would be picked wrongly more often than rightly. These
 * are the trades a design studio plausibly bills in this decade, which is why
 * the creator economy is here as several rows rather than none: a content
 * creator, an influencer, a podcaster and a newsletter are four different
 * businesses that a list written for incorporated companies would file under
 * "Other" four times over. `other` is still a real answer rather than an
 * admission of defeat: a client whose trade is not on this list is better
 * recorded as "Other" than filed under whichever row was nearest.
 *
 * **It is a fact about who the client is**, so it lives on the client record
 * (`PRINCIPLES.md` rule 2) and not on a document. It is deliberately **not**
 * snapshotted: no sheet prints it, and `ClientSnapshot` is an explicit list
 * precisely so a field gets on it by being printed rather than by existing
 * (rule 4).
 *
 * **Each row names its accent.** Hashing a hue from the label would be less to
 * maintain and worse to look at: the hash decides which industries collide, so
 * two of the commonest would sooner or later draw the same colour while three
 * rare ones spread across the rest. Naming them means the frequent ones can be
 * spread on purpose. The hue still carries no meaning (`lib/accent.ts`): it
 * lets the eye group a column it is scanning, and the label is what says what
 * the thing is.
 *
 * **A key, once issued, is never reused.** The key is what the database stores;
 * the label is what people read. Renaming a label is free and re-keying is not,
 * because a row that changes meaning silently reclassifies every client already
 * filed under it. Retiring one means leaving the key here, not deleting it.
 */

import type { Accent } from '@/lib/accent';

export interface Industry {
  /** Stored. Stable, opaque, never reused. */
  key: string;
  /** Read. Free to reword. */
  label: string;
  accent: Accent;
}

/**
 * Alphabetical by label, because this renders as a searchable list and a reader
 * scanning for "Hospitality" should find it where the alphabet says it is. The
 * accents are spread by hand so that neighbours in the list, which is where
 * two badges are most often seen together, rarely share a hue.
 */
export const INDUSTRIES: readonly Industry[] = [
  { key: 'accounting', label: 'Accounting & Tax', accent: 'teal' },
  { key: 'advertising', label: 'Advertising & Media', accent: 'magenta' },
  { key: 'agriculture', label: 'Agriculture', accent: 'green' },
  { key: 'ai', label: 'AI & Machine Learning', accent: 'violet' },
  { key: 'animation', label: 'Animation & VFX', accent: 'cyan' },
  { key: 'apparel', label: 'Apparel & Fashion', accent: 'rose' },
  { key: 'architecture', label: 'Architecture', accent: 'amber' },
  { key: 'art', label: 'Art & Galleries', accent: 'magenta' },
  { key: 'authors', label: 'Authors & Writers', accent: 'teal' },
  { key: 'automotive', label: 'Automotive', accent: 'cyan' },
  { key: 'aviation', label: 'Aviation & Aerospace', accent: 'violet' },
  { key: 'beauty', label: 'Beauty & Cosmetics', accent: 'rose' },
  { key: 'biotech', label: 'Biotechnology', accent: 'teal' },
  { key: 'ceramics', label: 'Ceramics & Homeware', accent: 'orange' },
  { key: 'clinics', label: 'Clinics & Dental', accent: 'cyan' },
  { key: 'coaching', label: 'Coaching & Mentoring', accent: 'violet' },
  { key: 'communities', label: 'Communities & Memberships', accent: 'green' },
  { key: 'construction', label: 'Construction', accent: 'amber' },
  { key: 'consulting', label: 'Consulting', accent: 'violet' },
  { key: 'creators', label: 'Content Creators', accent: 'magenta' },
  { key: 'coworking', label: 'Coworking & Coliving', accent: 'teal' },
  { key: 'd2c', label: 'D2C & Consumer Brands', accent: 'rose' },
  { key: 'creative_agency', label: 'Design & Creative Agencies', accent: 'orange' },
  { key: 'ecommerce', label: 'E-commerce', accent: 'magenta' },
  { key: 'edtech', label: 'EdTech & Online Courses', accent: 'teal' },
  { key: 'education', label: 'Education', accent: 'cyan' },
  { key: 'ev', label: 'Electric Vehicles & Mobility', accent: 'amber' },
  { key: 'energy', label: 'Energy & Utilities', accent: 'green' },
  { key: 'entertainment', label: 'Entertainment', accent: 'magenta' },
  { key: 'esports', label: 'Esports', accent: 'violet' },
  { key: 'events', label: 'Events & Weddings', accent: 'rose' },
  { key: 'financial', label: 'Financial Services', accent: 'teal' },
  { key: 'fintech', label: 'Fintech', accent: 'cyan' },
  { key: 'fitness', label: 'Fitness & Wellness', accent: 'green' },
  { key: 'food', label: 'Food & Beverage', accent: 'orange' },
  { key: 'furniture', label: 'Furniture & Interiors', accent: 'amber' },
  { key: 'gaming', label: 'Gaming', accent: 'violet' },
  { key: 'government', label: 'Government & Public Sector', accent: 'cyan' },
  { key: 'handmade', label: 'Handmade & Crafts', accent: 'orange' },
  { key: 'hardware', label: 'Hardware & IoT', accent: 'violet' },
  { key: 'healthcare', label: 'Healthcare', accent: 'teal' },
  { key: 'home_services', label: 'Home Services', accent: 'amber' },
  { key: 'hospitality', label: 'Hospitality & Hotels', accent: 'orange' },
  { key: 'influencers', label: 'Influencers & Personal Brands', accent: 'magenta' },
  { key: 'insurance', label: 'Insurance', accent: 'cyan' },
  { key: 'interior_design', label: 'Interior Design', accent: 'amber' },
  { key: 'it_services', label: 'IT Services & Software', accent: 'violet' },
  { key: 'jewellery', label: 'Jewellery', accent: 'rose' },
  { key: 'parenting', label: 'Kids & Parenting', accent: 'green' },
  { key: 'legal', label: 'Legal', accent: 'violet' },
  { key: 'logistics', label: 'Logistics & Shipping', accent: 'green' },
  { key: 'luxury', label: 'Luxury & Lifestyle', accent: 'rose' },
  { key: 'manufacturing', label: 'Manufacturing', accent: 'orange' },
  { key: 'marketing', label: 'Marketing Agency', accent: 'magenta' },
  { key: 'marketplaces', label: 'Marketplaces & Platforms', accent: 'teal' },
  { key: 'matrimony', label: 'Matrimony & Dating', accent: 'rose' },
  { key: 'mining', label: 'Mining & Metals', accent: 'amber' },
  { key: 'apps', label: 'Mobile Apps', accent: 'cyan' },
  { key: 'music', label: 'Music & Artists', accent: 'violet' },
  { key: 'newsletters', label: 'Newsletters & Independent Media', accent: 'orange' },
  { key: 'nonprofit', label: 'Non-profit & NGO', accent: 'green' },
  { key: 'pets', label: 'Pets & Animal Care', accent: 'amber' },
  { key: 'pharma', label: 'Pharmaceuticals', accent: 'teal' },
  { key: 'photography', label: 'Photography & Film', accent: 'magenta' },
  { key: 'podcasting', label: 'Podcasts & Audio', accent: 'violet' },
  { key: 'politics', label: 'Politics & Campaigns', accent: 'cyan' },
  { key: 'printing', label: 'Printing & Packaging', accent: 'orange' },
  { key: 'publishing', label: 'Publishing', accent: 'violet' },
  { key: 'real_estate', label: 'Real Estate', accent: 'amber' },
  { key: 'recruitment', label: 'Recruitment & HR', accent: 'cyan' },
  { key: 'research', label: 'Research', accent: 'teal' },
  { key: 'restaurants', label: 'Restaurants & Cafes', accent: 'orange' },
  { key: 'retail', label: 'Retail', accent: 'rose' },
  { key: 'saas', label: 'SaaS', accent: 'violet' },
  { key: 'salons', label: 'Salons & Spas', accent: 'rose' },
  { key: 'security', label: 'Security', accent: 'cyan' },
  { key: 'sports', label: 'Sports', accent: 'green' },
  { key: 'streaming', label: 'Streaming & Video', accent: 'magenta' },
  { key: 'sustainability', label: 'Sustainability & Climate', accent: 'green' },
  { key: 'telecom', label: 'Telecommunications', accent: 'cyan' },
  { key: 'textiles', label: 'Textiles', accent: 'rose' },
  { key: 'performing_arts', label: 'Theatre & Performing Arts', accent: 'violet' },
  { key: 'travel', label: 'Travel & Tourism', accent: 'green' },
  { key: 'tutoring', label: 'Tutoring & Test Prep', accent: 'amber' },
  { key: 'web3', label: 'Web3 & Crypto', accent: 'orange' },
  { key: 'yoga', label: 'Yoga & Spirituality', accent: 'teal' },
  { key: 'other', label: 'Other', accent: 'violet' },
] as const;

/** Built once: this resolves on every row of every clients page. */
const BY_KEY = new Map(INDUSTRIES.map((i) => [i.key, i]));

/**
 * The row for a stored key, or `undefined`.
 *
 * Undefined rather than a fallback row, because the two cases a caller has are
 * genuinely different: a client with no industry recorded prints nothing, and a
 * client whose stored key is not on this list is a bug worth seeing rather than
 * quietly relabelling as "Other".
 */
export function industryByKey(key: string | undefined): Industry | undefined {
  return key ? BY_KEY.get(key) : undefined;
}

/** Every key, for the Zod enum. Non-empty, which is what `z.enum` requires. */
export const INDUSTRY_KEYS = INDUSTRIES.map((i) => i.key) as [string, ...string[]];
