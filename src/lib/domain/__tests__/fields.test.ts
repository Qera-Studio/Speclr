import {
  cinSchema,
  emailSchema,
  gstinSchema,
  ibanSchema,
  panSchema,
  sacSchema,
  swiftSchema,
  tanSchema,
} from '../fields';

/**
 * The shared field rules.
 *
 * The validators underneath (`gstinError`, `panHolderTypeError`, …) have their
 * own exhaustive tests in `taxIds/__tests__/`. This file is about the layer on
 * top of them, which is where the drift actually was: whether a blank is
 * allowed, whether the length is capped, and whether the validator's own
 * message survives to the reader.
 */

const message = (schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }, value: string) => {
  const result = schema.safeParse(value);
  return result.success ? null : result.error!.issues[0].message;
};

describe('blank tolerance', () => {
  /**
   * Onboarding saves one step at a time against a row that already exists, so a
   * half-filled record is a normal state. Required-ness belongs to the form
   * that can explain it, not to the identifier.
   */
  it('accepts a blank by default', () => {
    for (const schema of [emailSchema(), panSchema(), gstinSchema(), tanSchema(), cinSchema()]) {
      expect(schema.safeParse('').success).toBe(true);
    }
  });

  it('refuses a blank when the form says the field is required', () => {
    expect(message(gstinSchema({ required: 'A GSTIN is required.' }), '')).toBe(
      'A GSTIN is required.',
    );
  });

  /** Whitespace is not a value. A pasted line with only spaces reads as blank. */
  it('treats whitespace as blank', () => {
    expect(panSchema().safeParse('   ').success).toBe(true);
    expect(message(panSchema({ required: 'PAN is required.' }), '   ')).toBe('PAN is required.');
  });
});

/**
 * The reason for `superRefine` over `.refine`.
 *
 * The schemas this replaced collapsed every GSTIN failure into "This GSTIN is
 * not valid.", throwing away the specific finding the validator had already
 * made. A reader told the check character is wrong fixes a character; a reader
 * told the GSTIN is invalid retypes the same fifteen.
 */
describe('the validator’s own message survives', () => {
  it('names the check character rather than saying "not valid"', () => {
    // 09AABCQ2864Q1ZQ is well-formed; the last character here is not its check.
    expect(message(gstinSchema(), '09AABCQ2864Q1ZA')).toMatch(/check character/i);
  });

  it('names the ownership code on a structurally sound CIN', () => {
    expect(message(cinSchema(), 'U62099UP2026XXX254312')).toMatch(/XXX/);
  });

  it('names what kind of holder a PAN belongs to', () => {
    // AABCQ… is a `C`, a company. On an employee record that is the wrong
    // document rather than a typo.
    expect(message(panSchema(), 'AABCQ2864Q')).toMatch(/company/i);
  });
});

describe('panSchema', () => {
  it('accepts an individual’s PAN by default', () => {
    expect(panSchema().safeParse('AAPPR2864Q').success).toBe(true);
  });

  /**
   * A client passes `holder: []` because the expected kind comes from the
   * entity type on the record, which this field cannot see. Structure only,
   * deliberately, with the holder check running in `clientTaxCrossErrors`.
   */
  it('checks structure only when no holder type is expected', () => {
    expect(panSchema({ holder: [] }).safeParse('AABCQ2864Q').success).toBe(true);
    expect(message(panSchema({ holder: [] }), 'AABCQ286')).toMatch(/Expected a PAN/);
  });

  it('caps the length', () => {
    expect(panSchema().safeParse('AAPPR2864QXXXX').success).toBe(false);
  });
});

describe('emailSchema', () => {
  it.each(['a@b.co', 'first.last+tag@sub.example.org'])('accepts %s', (value) => {
    expect(emailSchema().safeParse(value).success).toBe(true);
  });

  it.each(['not-an-email', 'a@', '@b.co', 'a b@c.co'])('refuses %s', (value) => {
    expect(emailSchema().safeParse(value).success).toBe(false);
  });

  /** Addresses get pasted out of signatures with trailing whitespace. */
  it('trims before checking', () => {
    expect(emailSchema().safeParse('  a@b.co  ').success).toBe(true);
  });
});

/**
 * Qera's own identifiers, which `studioInputSchema` now holds to these rules
 * rather than to `z.string().min(1)`.
 *
 * They are frozen onto every document by `studioSnapshot` and retained 72
 * months under CGST s.36, so this is the check that must not start refusing
 * them. The CIN in particular has an ROC pair (`UW`) no published list
 * explains, which is why `cinError` does not check it.
 */
describe('the studio’s own registration still passes', () => {
  it('accepts Qera’s GSTIN and CIN', () => {
    expect(gstinSchema({ required: 'x' }).safeParse('09AABCQ2864Q1ZQ').success).toBe(true);
    expect(cinSchema({ required: 'x' }).safeParse('U62099UW2026PTC254312').success).toBe(true);
  });
});

/**
 * SAC. The rule is a shape, and the shape's one job is to catch a goods HSN
 * typed into a services field: those do not start 99, and nothing else about a
 * six-digit number distinguishes them.
 */
describe('sacSchema', () => {
  it.each(['998314', '998315', '999799'])('accepts %s', (value) => {
    expect(sacSchema().safeParse(value).success).toBe(true);
  });

  // 8471 is a goods HSN (computers); 99831 and 9983145 are the near misses.
  it.each(['8471', '99831', '9983145', '123456', 'ABC123'])('refuses %s', (value) => {
    expect(sacSchema().safeParse(value).success).toBe(false);
  });

  /** Blank-tolerant by default, like every other rule in this file. */
  it('allows a blank unless the form says otherwise', () => {
    expect(sacSchema().safeParse('').success).toBe(true);
    expect(sacSchema({ required: 'A SAC is required.' }).safeParse('').success).toBe(false);
  });
});

/**
 * Where a foreign client's money is sent. The same class of check as the
 * GSTIN's mod-36, and worth having for the same reason: a transposed pair of
 * characters is the ordinary failure, and nothing downstream catches it.
 */
describe('swiftSchema and ibanSchema', () => {
  it('takes a SWIFT of 8 or 11 characters and nothing between', () => {
    expect(swiftSchema().safeParse('KKBKINBB').success).toBe(true);
    expect(swiftSchema().safeParse('KKBKINBBCPC').success).toBe(true);
    // Nine characters is what a reader produces by trimming 'XXX' badly.
    expect(swiftSchema().safeParse('KKBKINBBC').success).toBe(false);
    expect(swiftSchema().safeParse('KK1KINBB').success).toBe(false);
  });

  it('verifies an IBAN’s check digits, not just its shape', () => {
    expect(ibanSchema().safeParse('GB29NWBK60161331926819').success).toBe(true);
    expect(ibanSchema().safeParse('DE89370400440532013000').success).toBe(true);
    // A transposition inside the account number: the shape is unchanged.
    expect(ibanSchema().safeParse('GB29NWBK60161331926891').success).toBe(false);
  });

  it('names the check-digit failure rather than calling it malformed', () => {
    const result = ibanSchema().safeParse('GB29NWBK60161331926891');
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0].message).toMatch(/check digits/i);
  });

  it('allows a blank on both — a studio with no foreign clients has neither', () => {
    expect(swiftSchema().safeParse('').success).toBe(true);
    expect(ibanSchema().safeParse('').success).toBe(true);
  });
});
