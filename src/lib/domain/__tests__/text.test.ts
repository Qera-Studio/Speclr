import {
  httpsUrlSchema,
  multilineSchema,
  orgNameSchema,
  personNameSchema,
  sanitizeText,
  textSchema,
} from '../text';

/** Readable names for the characters this module exists to remove. */
const RLO = '\u202E'; // right-to-left override (Trojan Source)
const PDF = '\u202C'; // pop directional formatting
const ZWSP = '\u200B'; // zero-width space
const SHY = '\u00AD'; // soft hyphen
const NBSP = '\u00A0'; // non-breaking space
const BOM = '\uFEFF';
const ZWNJ = '\u200C'; // Devanagari, must survive
const ZWJ = '\u200D';

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: string) =>
  schema.safeParse(v).success;

const parsed = (schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown } }, v: string) =>
  schema.safeParse(v).data as string;

const message = (
  schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } },
  v: string,
) => schema.safeParse(v).error?.issues[0]?.message ?? '';

describe('sanitizeText', () => {
  it('strips the bidi overrides that reorder a rendered line', () => {
    // The attack: what renders is not what is stored, so an invoice can show
    // one payee and hold another.
    expect(sanitizeText(`Acme${RLO} Ltd${PDF}`)).toBe('Acme Ltd');
    expect(sanitizeText('\u2066Acme\u2069')).toBe('Acme');
  });

  it('strips zero-width and invisible passengers', () => {
    expect(sanitizeText(`Clay${ZWSP}ora`)).toBe('Clayora');
    expect(sanitizeText(`09AABCQ${SHY}2864Q1ZQ`)).toBe('09AABCQ2864Q1ZQ');
    expect(sanitizeText(`${BOM}Qera`)).toBe('Qera');
  });

  it('keeps ZWNJ and ZWJ, which Indic scripts need', () => {
    // Stripping these would corrupt a name written in Devanagari, and they
    // carry none of the bidi behaviour the list above does.
    expect(sanitizeText(`क${ZWNJ}ष`)).toBe(`क${ZWNJ}ष`);
    expect(sanitizeText(`क${ZWJ}ष`)).toBe(`क${ZWJ}ष`);
  });

  it('strips control characters', () => {
    expect(sanitizeText('Qera\u0000 Studio\u0007')).toBe('Qera Studio');
    expect(sanitizeText('a\u001Fb')).toBe('ab');
  });

  it('turns look-alike spaces into real ones', () => {
    expect(sanitizeText(`Qera${NBSP}Studio`)).toBe('Qera Studio');
    expect(sanitizeText('Qera\u2009Studio')).toBe('Qera Studio');
  });

  it('normalises to NFC so the same name compares equal', () => {
    const composed = 'José'; // é as one code point
    const decomposed = 'José'; // e + combining acute
    expect(decomposed).not.toBe(composed);
    expect(sanitizeText(decomposed)).toBe(composed);
  });

  it('collapses whitespace and trims', () => {
    expect(sanitizeText('  Qera   Studio  ')).toBe('Qera Studio');
  });

  it('folds newlines to a space in single-line mode', () => {
    expect(sanitizeText('Qera\nStudio')).toBe('Qera Studio');
    expect(sanitizeText('Qera\u2028Studio')).toBe('Qera Studio');
  });

  it('keeps paragraphs in multiline mode, capped at one blank line', () => {
    expect(sanitizeText('One\n\n\n\nTwo', { multiline: true })).toBe('One\n\nTwo');
    expect(sanitizeText('One\r\nTwo', { multiline: true })).toBe('One\nTwo');
    expect(sanitizeText('  One  \n   Two  ', { multiline: true })).toBe('One\nTwo');
  });
});

describe('personNameSchema', () => {
  it('accepts the punctuation that appears in real names', () => {
    for (const name of ["O'Brien", 'Jean-Luc Picard', 'J. R. R. Tolkien', 'D’Souza']) {
      expect(ok(personNameSchema(), name)).toBe(true);
    }
  });

  it('accepts non-Latin scripts and accents', () => {
    expect(ok(personNameSchema(), 'शिवांशु पारीक')).toBe(true);
    expect(ok(personNameSchema(), 'José Ramírez')).toBe(true);
    expect(ok(personNameSchema(), '张伟')).toBe(true);
  });

  it('rejects digits, and says so as a rule rather than a character', () => {
    expect(ok(personNameSchema(), 'Shivanshu 2')).toBe(false);
    expect(message(personNameSchema(), 'Shivanshu 2')).toBe('A name cannot contain numbers.');
  });

  it('rejects a script tag, naming the character', () => {
    expect(ok(personNameSchema(), '<script>alert(1)</script>')).toBe(false);
    expect(message(personNameSchema(), '<script>')).toContain('“<”');
  });

  it('rejects punctuation that never appears in a name', () => {
    for (const bad of ['a@b', 'a;b', 'a\\b', 'a"b', 'a{b', 'a|b', 'a=b']) {
      expect(ok(personNameSchema(), bad)).toBe(false);
    }
  });

  it('rejects a value with no letter in it', () => {
    expect(ok(personNameSchema(), '...')).toBe(false);
    expect(ok(personNameSchema(), '--')).toBe(false);
  });

  it('strips the invisible before judging the visible', () => {
    // The value is fixed rather than refused, because nobody could see it.
    expect(parsed(personNameSchema(), `Shiv${ZWSP}anshu`)).toBe('Shivanshu');
    expect(parsed(personNameSchema(), `Shivanshu${RLO}`)).toBe('Shivanshu');
  });

  it('blank is allowed unless the form says otherwise', () => {
    expect(ok(personNameSchema(), '')).toBe(true);
    expect(ok(personNameSchema(200, { required: 'A name is required.' }), '')).toBe(false);
    expect(message(personNameSchema(200, { required: 'A name is required.' }), '   ')).toBe(
      'A name is required.',
    );
  });

  it('measures length after sanitising, not before', () => {
    // Padding with zero-width spaces must not fail a value that fits.
    expect(ok(personNameSchema(5), `Ab${ZWSP}${ZWSP}${ZWSP}cde`)).toBe(true);
    expect(ok(personNameSchema(5), 'Abcdef')).toBe(false);
  });
});

describe('orgNameSchema', () => {
  it('allows digits and business punctuation', () => {
    for (const name of [
      'Qera Private Limited',
      '3M India Ltd.',
      'Smith & Sons (Pvt) Ltd',
      'Section 8 Foundation',
      'A/B Design Co.',
    ]) {
      expect(ok(orgNameSchema(), name)).toBe(true);
    }
  });

  it('still rejects an angle bracket', () => {
    expect(ok(orgNameSchema(), 'Acme <b>Ltd</b>')).toBe(false);
    expect(message(orgNameSchema(), 'Acme <b>')).toContain('company name');
  });

  it('rejects a leading = so the value cannot be read as a formula', () => {
    expect(ok(orgNameSchema(), '=1+1')).toBe(false);
  });
});

describe('textSchema and multilineSchema', () => {
  it('keep every visible character, including an angle bracket', () => {
    // Free prose: "amounts < ₹5,000" is legitimate, and React escapes it.
    expect(ok(textSchema(300), 'Payable on amounts < ₹5,000')).toBe(true);
    expect(ok(multilineSchema(4000), 'Clause 1 <see schedule>')).toBe(true);
  });

  it('still strip the invisible', () => {
    expect(parsed(textSchema(300), `Net${ZWSP} 30${RLO}`)).toBe('Net 30');
  });

  it('refuse a value past the cap', () => {
    expect(ok(textSchema(10), 'x'.repeat(11))).toBe(false);
  });
});

describe('httpsUrlSchema', () => {
  it('accepts an https URL', () => {
    expect(ok(httpsUrlSchema(), 'https://portal.clayora.com/invoices')).toBe(true);
  });

  it('refuses the schemes that make a link dangerous', () => {
    // Nothing renders this as a link today. This is what keeps it that way
    // when something does.
    for (const bad of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
    ]) {
      expect(ok(httpsUrlSchema(), bad)).toBe(false);
    }
  });

  it('refuses plaintext http', () => {
    expect(ok(httpsUrlSchema(), 'http://portal.clayora.com')).toBe(false);
    expect(message(httpsUrlSchema(), 'http://portal.clayora.com')).toContain('https://');
  });

  it('refuses something that is not a URL at all', () => {
    expect(ok(httpsUrlSchema(), 'portal.clayora.com')).toBe(false);
  });
});
