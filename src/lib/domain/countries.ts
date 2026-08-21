/**
 * The country list, as plain data.
 *
 * Kept separate from `phone.ts` on purpose: `address.ts` needs country names to
 * print on documents and is imported by `db/schema.ts`, so it must not drag
 * libphonenumber's metadata into the server import graph. `phone.ts` layers
 * dial codes on top of this same seed: one list, two consumers.
 *
 * India first: it's the default and by far the common case.
 *
 * **Every place a person can be addressed, not a shortlist.** The list used to
 * hold the twenty-five countries Qera might plausibly bill, which is a rule
 * that only holds until the twenty-sixth client, and a client in Norway could
 * not be added at all. It is the 243 officially assigned ISO 3166-1 codes that
 * libphonenumber carries metadata for, so every row here has a working dial
 * code behind it and the address picker and the phone picker can never offer
 * different worlds.
 *
 * **The names are the ISO short names, not CLDR's.** These strings compose into
 * the `address` line that prints on a tax invoice and freezes into a snapshot
 * for 72 months (CGST s.36), so "Congo - Kinshasa" and "Hong Kong SAR China"
 * are not acceptable spellings of a recipient's country. Where the two differ
 * the ISO name wins; ampersands are spelled out and "St." is written "Saint",
 * because an address is prose rather than a UI label.
 */
/**
 * The continents the picker groups by.
 *
 * Ordered as the list should read, not alphabetically: Asia first because it
 * holds India and every neighbour Qera is most likely to bill, then the two
 * regions the rest of the clients come from, then the rest.
 *
 * "Middle East" is a geographer's quibble and a reader's convenience: somebody
 * looking for the UAE looks there, and a list is for finding things in. The
 * Caribbean and Central America sit under North America for the same reason,
 * which is where a reader goes looking for Jamaica.
 */
export const CONTINENTS = [
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
  'Middle East',
  'Africa',
] as const;

export type Continent = (typeof CONTINENTS)[number];

export interface CountrySeed {
  iso2: string;
  name: string;
  flag: string;
  continent: Continent;
}

export const COUNTRY_SEED: CountrySeed[] = [
  // Asia
  { iso2: 'IN', name: 'India', flag: '🇮🇳', continent: 'Asia' },
  { iso2: 'AF', name: 'Afghanistan', flag: '🇦🇫', continent: 'Asia' },
  { iso2: 'AM', name: 'Armenia', flag: '🇦🇲', continent: 'Asia' },
  { iso2: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', continent: 'Asia' },
  { iso2: 'BD', name: 'Bangladesh', flag: '🇧🇩', continent: 'Asia' },
  { iso2: 'BT', name: 'Bhutan', flag: '🇧🇹', continent: 'Asia' },
  { iso2: 'IO', name: 'British Indian Ocean Territory', flag: '🇮🇴', continent: 'Asia' },
  { iso2: 'BN', name: 'Brunei', flag: '🇧🇳', continent: 'Asia' },
  { iso2: 'KH', name: 'Cambodia', flag: '🇰🇭', continent: 'Asia' },
  { iso2: 'CN', name: 'China', flag: '🇨🇳', continent: 'Asia' },
  { iso2: 'CX', name: 'Christmas Island', flag: '🇨🇽', continent: 'Asia' },
  { iso2: 'CC', name: 'Cocos (Keeling) Islands', flag: '🇨🇨', continent: 'Asia' },
  { iso2: 'GE', name: 'Georgia', flag: '🇬🇪', continent: 'Asia' },
  { iso2: 'HK', name: 'Hong Kong', flag: '🇭🇰', continent: 'Asia' },
  { iso2: 'ID', name: 'Indonesia', flag: '🇮🇩', continent: 'Asia' },
  { iso2: 'JP', name: 'Japan', flag: '🇯🇵', continent: 'Asia' },
  { iso2: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', continent: 'Asia' },
  { iso2: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬', continent: 'Asia' },
  { iso2: 'LA', name: 'Laos', flag: '🇱🇦', continent: 'Asia' },
  { iso2: 'MO', name: 'Macau', flag: '🇲🇴', continent: 'Asia' },
  { iso2: 'MY', name: 'Malaysia', flag: '🇲🇾', continent: 'Asia' },
  { iso2: 'MV', name: 'Maldives', flag: '🇲🇻', continent: 'Asia' },
  { iso2: 'MN', name: 'Mongolia', flag: '🇲🇳', continent: 'Asia' },
  { iso2: 'MM', name: 'Myanmar', flag: '🇲🇲', continent: 'Asia' },
  { iso2: 'NP', name: 'Nepal', flag: '🇳🇵', continent: 'Asia' },
  { iso2: 'KP', name: 'North Korea', flag: '🇰🇵', continent: 'Asia' },
  { iso2: 'PK', name: 'Pakistan', flag: '🇵🇰', continent: 'Asia' },
  { iso2: 'PH', name: 'Philippines', flag: '🇵🇭', continent: 'Asia' },
  { iso2: 'SG', name: 'Singapore', flag: '🇸🇬', continent: 'Asia' },
  { iso2: 'KR', name: 'South Korea', flag: '🇰🇷', continent: 'Asia' },
  { iso2: 'LK', name: 'Sri Lanka', flag: '🇱🇰', continent: 'Asia' },
  { iso2: 'TW', name: 'Taiwan', flag: '🇹🇼', continent: 'Asia' },
  { iso2: 'TJ', name: 'Tajikistan', flag: '🇹🇯', continent: 'Asia' },
  { iso2: 'TH', name: 'Thailand', flag: '🇹🇭', continent: 'Asia' },
  { iso2: 'TL', name: 'Timor-Leste', flag: '🇹🇱', continent: 'Asia' },
  { iso2: 'TM', name: 'Turkmenistan', flag: '🇹🇲', continent: 'Asia' },
  { iso2: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', continent: 'Asia' },
  { iso2: 'VN', name: 'Vietnam', flag: '🇻🇳', continent: 'Asia' },
  // Europe
  { iso2: 'AX', name: 'Åland Islands', flag: '🇦🇽', continent: 'Europe' },
  { iso2: 'AL', name: 'Albania', flag: '🇦🇱', continent: 'Europe' },
  { iso2: 'AD', name: 'Andorra', flag: '🇦🇩', continent: 'Europe' },
  { iso2: 'AT', name: 'Austria', flag: '🇦🇹', continent: 'Europe' },
  { iso2: 'BY', name: 'Belarus', flag: '🇧🇾', continent: 'Europe' },
  { iso2: 'BE', name: 'Belgium', flag: '🇧🇪', continent: 'Europe' },
  { iso2: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦', continent: 'Europe' },
  { iso2: 'BG', name: 'Bulgaria', flag: '🇧🇬', continent: 'Europe' },
  { iso2: 'HR', name: 'Croatia', flag: '🇭🇷', continent: 'Europe' },
  { iso2: 'CY', name: 'Cyprus', flag: '🇨🇾', continent: 'Europe' },
  { iso2: 'CZ', name: 'Czechia', flag: '🇨🇿', continent: 'Europe' },
  { iso2: 'DK', name: 'Denmark', flag: '🇩🇰', continent: 'Europe' },
  { iso2: 'EE', name: 'Estonia', flag: '🇪🇪', continent: 'Europe' },
  { iso2: 'FO', name: 'Faroe Islands', flag: '🇫🇴', continent: 'Europe' },
  { iso2: 'FI', name: 'Finland', flag: '🇫🇮', continent: 'Europe' },
  { iso2: 'FR', name: 'France', flag: '🇫🇷', continent: 'Europe' },
  { iso2: 'DE', name: 'Germany', flag: '🇩🇪', continent: 'Europe' },
  { iso2: 'GI', name: 'Gibraltar', flag: '🇬🇮', continent: 'Europe' },
  { iso2: 'GR', name: 'Greece', flag: '🇬🇷', continent: 'Europe' },
  { iso2: 'GG', name: 'Guernsey', flag: '🇬🇬', continent: 'Europe' },
  { iso2: 'HU', name: 'Hungary', flag: '🇭🇺', continent: 'Europe' },
  { iso2: 'IS', name: 'Iceland', flag: '🇮🇸', continent: 'Europe' },
  { iso2: 'IE', name: 'Ireland', flag: '🇮🇪', continent: 'Europe' },
  { iso2: 'IM', name: 'Isle of Man', flag: '🇮🇲', continent: 'Europe' },
  { iso2: 'IT', name: 'Italy', flag: '🇮🇹', continent: 'Europe' },
  { iso2: 'JE', name: 'Jersey', flag: '🇯🇪', continent: 'Europe' },
  { iso2: 'XK', name: 'Kosovo', flag: '🇽🇰', continent: 'Europe' },
  { iso2: 'LV', name: 'Latvia', flag: '🇱🇻', continent: 'Europe' },
  { iso2: 'LI', name: 'Liechtenstein', flag: '🇱🇮', continent: 'Europe' },
  { iso2: 'LT', name: 'Lithuania', flag: '🇱🇹', continent: 'Europe' },
  { iso2: 'LU', name: 'Luxembourg', flag: '🇱🇺', continent: 'Europe' },
  { iso2: 'MT', name: 'Malta', flag: '🇲🇹', continent: 'Europe' },
  { iso2: 'MD', name: 'Moldova', flag: '🇲🇩', continent: 'Europe' },
  { iso2: 'MC', name: 'Monaco', flag: '🇲🇨', continent: 'Europe' },
  { iso2: 'ME', name: 'Montenegro', flag: '🇲🇪', continent: 'Europe' },
  { iso2: 'NL', name: 'Netherlands', flag: '🇳🇱', continent: 'Europe' },
  { iso2: 'MK', name: 'North Macedonia', flag: '🇲🇰', continent: 'Europe' },
  { iso2: 'NO', name: 'Norway', flag: '🇳🇴', continent: 'Europe' },
  { iso2: 'PL', name: 'Poland', flag: '🇵🇱', continent: 'Europe' },
  { iso2: 'PT', name: 'Portugal', flag: '🇵🇹', continent: 'Europe' },
  { iso2: 'RO', name: 'Romania', flag: '🇷🇴', continent: 'Europe' },
  { iso2: 'RU', name: 'Russia', flag: '🇷🇺', continent: 'Europe' },
  { iso2: 'SM', name: 'San Marino', flag: '🇸🇲', continent: 'Europe' },
  { iso2: 'RS', name: 'Serbia', flag: '🇷🇸', continent: 'Europe' },
  { iso2: 'SK', name: 'Slovakia', flag: '🇸🇰', continent: 'Europe' },
  { iso2: 'SI', name: 'Slovenia', flag: '🇸🇮', continent: 'Europe' },
  { iso2: 'ES', name: 'Spain', flag: '🇪🇸', continent: 'Europe' },
  { iso2: 'SJ', name: 'Svalbard and Jan Mayen', flag: '🇸🇯', continent: 'Europe' },
  { iso2: 'SE', name: 'Sweden', flag: '🇸🇪', continent: 'Europe' },
  { iso2: 'CH', name: 'Switzerland', flag: '🇨🇭', continent: 'Europe' },
  { iso2: 'TR', name: 'Türkiye', flag: '🇹🇷', continent: 'Europe' },
  { iso2: 'UA', name: 'Ukraine', flag: '🇺🇦', continent: 'Europe' },
  { iso2: 'GB', name: 'United Kingdom', flag: '🇬🇧', continent: 'Europe' },
  { iso2: 'VA', name: 'Vatican City', flag: '🇻🇦', continent: 'Europe' },
  // North America
  { iso2: 'AI', name: 'Anguilla', flag: '🇦🇮', continent: 'North America' },
  { iso2: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬', continent: 'North America' },
  { iso2: 'AW', name: 'Aruba', flag: '🇦🇼', continent: 'North America' },
  { iso2: 'BS', name: 'Bahamas', flag: '🇧🇸', continent: 'North America' },
  { iso2: 'BB', name: 'Barbados', flag: '🇧🇧', continent: 'North America' },
  { iso2: 'BZ', name: 'Belize', flag: '🇧🇿', continent: 'North America' },
  { iso2: 'BM', name: 'Bermuda', flag: '🇧🇲', continent: 'North America' },
  { iso2: 'BQ', name: 'Bonaire, Sint Eustatius and Saba', flag: '🇧🇶', continent: 'North America' },
  { iso2: 'VG', name: 'British Virgin Islands', flag: '🇻🇬', continent: 'North America' },
  { iso2: 'CA', name: 'Canada', flag: '🇨🇦', continent: 'North America' },
  { iso2: 'KY', name: 'Cayman Islands', flag: '🇰🇾', continent: 'North America' },
  { iso2: 'CR', name: 'Costa Rica', flag: '🇨🇷', continent: 'North America' },
  { iso2: 'CU', name: 'Cuba', flag: '🇨🇺', continent: 'North America' },
  { iso2: 'CW', name: 'Curaçao', flag: '🇨🇼', continent: 'North America' },
  { iso2: 'DM', name: 'Dominica', flag: '🇩🇲', continent: 'North America' },
  { iso2: 'DO', name: 'Dominican Republic', flag: '🇩🇴', continent: 'North America' },
  { iso2: 'SV', name: 'El Salvador', flag: '🇸🇻', continent: 'North America' },
  { iso2: 'GL', name: 'Greenland', flag: '🇬🇱', continent: 'North America' },
  { iso2: 'GD', name: 'Grenada', flag: '🇬🇩', continent: 'North America' },
  { iso2: 'GP', name: 'Guadeloupe', flag: '🇬🇵', continent: 'North America' },
  { iso2: 'GT', name: 'Guatemala', flag: '🇬🇹', continent: 'North America' },
  { iso2: 'HT', name: 'Haiti', flag: '🇭🇹', continent: 'North America' },
  { iso2: 'HN', name: 'Honduras', flag: '🇭🇳', continent: 'North America' },
  { iso2: 'JM', name: 'Jamaica', flag: '🇯🇲', continent: 'North America' },
  { iso2: 'MQ', name: 'Martinique', flag: '🇲🇶', continent: 'North America' },
  { iso2: 'MX', name: 'Mexico', flag: '🇲🇽', continent: 'North America' },
  { iso2: 'MS', name: 'Montserrat', flag: '🇲🇸', continent: 'North America' },
  { iso2: 'NI', name: 'Nicaragua', flag: '🇳🇮', continent: 'North America' },
  { iso2: 'PA', name: 'Panama', flag: '🇵🇦', continent: 'North America' },
  { iso2: 'PR', name: 'Puerto Rico', flag: '🇵🇷', continent: 'North America' },
  { iso2: 'BL', name: 'Saint Barthélemy', flag: '🇧🇱', continent: 'North America' },
  { iso2: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳', continent: 'North America' },
  { iso2: 'LC', name: 'Saint Lucia', flag: '🇱🇨', continent: 'North America' },
  { iso2: 'MF', name: 'Saint Martin', flag: '🇲🇫', continent: 'North America' },
  { iso2: 'PM', name: 'Saint Pierre and Miquelon', flag: '🇵🇲', continent: 'North America' },
  { iso2: 'VC', name: 'Saint Vincent and Grenadines', flag: '🇻🇨', continent: 'North America' },
  { iso2: 'SX', name: 'Sint Maarten', flag: '🇸🇽', continent: 'North America' },
  { iso2: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹', continent: 'North America' },
  { iso2: 'TC', name: 'Turks and Caicos Islands', flag: '🇹🇨', continent: 'North America' },
  { iso2: 'US', name: 'United States', flag: '🇺🇸', continent: 'North America' },
  { iso2: 'VI', name: 'United States Virgin Islands', flag: '🇻🇮', continent: 'North America' },
  // South America
  { iso2: 'AR', name: 'Argentina', flag: '🇦🇷', continent: 'South America' },
  { iso2: 'BO', name: 'Bolivia', flag: '🇧🇴', continent: 'South America' },
  { iso2: 'BR', name: 'Brazil', flag: '🇧🇷', continent: 'South America' },
  { iso2: 'CL', name: 'Chile', flag: '🇨🇱', continent: 'South America' },
  { iso2: 'CO', name: 'Colombia', flag: '🇨🇴', continent: 'South America' },
  { iso2: 'EC', name: 'Ecuador', flag: '🇪🇨', continent: 'South America' },
  { iso2: 'FK', name: 'Falkland Islands', flag: '🇫🇰', continent: 'South America' },
  { iso2: 'GF', name: 'French Guiana', flag: '🇬🇫', continent: 'South America' },
  { iso2: 'GY', name: 'Guyana', flag: '🇬🇾', continent: 'South America' },
  { iso2: 'PY', name: 'Paraguay', flag: '🇵🇾', continent: 'South America' },
  { iso2: 'PE', name: 'Peru', flag: '🇵🇪', continent: 'South America' },
  { iso2: 'SR', name: 'Suriname', flag: '🇸🇷', continent: 'South America' },
  { iso2: 'UY', name: 'Uruguay', flag: '🇺🇾', continent: 'South America' },
  { iso2: 'VE', name: 'Venezuela', flag: '🇻🇪', continent: 'South America' },
  // Oceania
  { iso2: 'AS', name: 'American Samoa', flag: '🇦🇸', continent: 'Oceania' },
  { iso2: 'AU', name: 'Australia', flag: '🇦🇺', continent: 'Oceania' },
  { iso2: 'CK', name: 'Cook Islands', flag: '🇨🇰', continent: 'Oceania' },
  { iso2: 'FJ', name: 'Fiji', flag: '🇫🇯', continent: 'Oceania' },
  { iso2: 'PF', name: 'French Polynesia', flag: '🇵🇫', continent: 'Oceania' },
  { iso2: 'GU', name: 'Guam', flag: '🇬🇺', continent: 'Oceania' },
  { iso2: 'KI', name: 'Kiribati', flag: '🇰🇮', continent: 'Oceania' },
  { iso2: 'MH', name: 'Marshall Islands', flag: '🇲🇭', continent: 'Oceania' },
  { iso2: 'FM', name: 'Micronesia', flag: '🇫🇲', continent: 'Oceania' },
  { iso2: 'NR', name: 'Nauru', flag: '🇳🇷', continent: 'Oceania' },
  { iso2: 'NC', name: 'New Caledonia', flag: '🇳🇨', continent: 'Oceania' },
  { iso2: 'NZ', name: 'New Zealand', flag: '🇳🇿', continent: 'Oceania' },
  { iso2: 'NU', name: 'Niue', flag: '🇳🇺', continent: 'Oceania' },
  { iso2: 'NF', name: 'Norfolk Island', flag: '🇳🇫', continent: 'Oceania' },
  { iso2: 'MP', name: 'Northern Mariana Islands', flag: '🇲🇵', continent: 'Oceania' },
  { iso2: 'PW', name: 'Palau', flag: '🇵🇼', continent: 'Oceania' },
  { iso2: 'PG', name: 'Papua New Guinea', flag: '🇵🇬', continent: 'Oceania' },
  { iso2: 'WS', name: 'Samoa', flag: '🇼🇸', continent: 'Oceania' },
  { iso2: 'SB', name: 'Solomon Islands', flag: '🇸🇧', continent: 'Oceania' },
  { iso2: 'TK', name: 'Tokelau', flag: '🇹🇰', continent: 'Oceania' },
  { iso2: 'TO', name: 'Tonga', flag: '🇹🇴', continent: 'Oceania' },
  { iso2: 'TV', name: 'Tuvalu', flag: '🇹🇻', continent: 'Oceania' },
  { iso2: 'VU', name: 'Vanuatu', flag: '🇻🇺', continent: 'Oceania' },
  { iso2: 'WF', name: 'Wallis and Futuna', flag: '🇼🇫', continent: 'Oceania' },
  // Middle East
  { iso2: 'BH', name: 'Bahrain', flag: '🇧🇭', continent: 'Middle East' },
  { iso2: 'IR', name: 'Iran', flag: '🇮🇷', continent: 'Middle East' },
  { iso2: 'IQ', name: 'Iraq', flag: '🇮🇶', continent: 'Middle East' },
  { iso2: 'IL', name: 'Israel', flag: '🇮🇱', continent: 'Middle East' },
  { iso2: 'JO', name: 'Jordan', flag: '🇯🇴', continent: 'Middle East' },
  { iso2: 'KW', name: 'Kuwait', flag: '🇰🇼', continent: 'Middle East' },
  { iso2: 'LB', name: 'Lebanon', flag: '🇱🇧', continent: 'Middle East' },
  { iso2: 'OM', name: 'Oman', flag: '🇴🇲', continent: 'Middle East' },
  { iso2: 'PS', name: 'Palestine', flag: '🇵🇸', continent: 'Middle East' },
  { iso2: 'QA', name: 'Qatar', flag: '🇶🇦', continent: 'Middle East' },
  { iso2: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', continent: 'Middle East' },
  { iso2: 'SY', name: 'Syria', flag: '🇸🇾', continent: 'Middle East' },
  { iso2: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', continent: 'Middle East' },
  { iso2: 'YE', name: 'Yemen', flag: '🇾🇪', continent: 'Middle East' },
  // Africa
  { iso2: 'DZ', name: 'Algeria', flag: '🇩🇿', continent: 'Africa' },
  { iso2: 'AO', name: 'Angola', flag: '🇦🇴', continent: 'Africa' },
  { iso2: 'BJ', name: 'Benin', flag: '🇧🇯', continent: 'Africa' },
  { iso2: 'BW', name: 'Botswana', flag: '🇧🇼', continent: 'Africa' },
  { iso2: 'BF', name: 'Burkina Faso', flag: '🇧🇫', continent: 'Africa' },
  { iso2: 'BI', name: 'Burundi', flag: '🇧🇮', continent: 'Africa' },
  { iso2: 'CV', name: 'Cabo Verde', flag: '🇨🇻', continent: 'Africa' },
  { iso2: 'CM', name: 'Cameroon', flag: '🇨🇲', continent: 'Africa' },
  { iso2: 'CF', name: 'Central African Republic', flag: '🇨🇫', continent: 'Africa' },
  { iso2: 'TD', name: 'Chad', flag: '🇹🇩', continent: 'Africa' },
  { iso2: 'KM', name: 'Comoros', flag: '🇰🇲', continent: 'Africa' },
  { iso2: 'CI', name: 'Cote d\'Ivoire', flag: '🇨🇮', continent: 'Africa' },
  { iso2: 'CD', name: 'Democratic Republic of the Congo', flag: '🇨🇩', continent: 'Africa' },
  { iso2: 'DJ', name: 'Djibouti', flag: '🇩🇯', continent: 'Africa' },
  { iso2: 'EG', name: 'Egypt', flag: '🇪🇬', continent: 'Africa' },
  { iso2: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶', continent: 'Africa' },
  { iso2: 'ER', name: 'Eritrea', flag: '🇪🇷', continent: 'Africa' },
  { iso2: 'SZ', name: 'Eswatini', flag: '🇸🇿', continent: 'Africa' },
  { iso2: 'ET', name: 'Ethiopia', flag: '🇪🇹', continent: 'Africa' },
  { iso2: 'GA', name: 'Gabon', flag: '🇬🇦', continent: 'Africa' },
  { iso2: 'GM', name: 'Gambia', flag: '🇬🇲', continent: 'Africa' },
  { iso2: 'GH', name: 'Ghana', flag: '🇬🇭', continent: 'Africa' },
  { iso2: 'GN', name: 'Guinea', flag: '🇬🇳', continent: 'Africa' },
  { iso2: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', continent: 'Africa' },
  { iso2: 'KE', name: 'Kenya', flag: '🇰🇪', continent: 'Africa' },
  { iso2: 'LS', name: 'Lesotho', flag: '🇱🇸', continent: 'Africa' },
  { iso2: 'LR', name: 'Liberia', flag: '🇱🇷', continent: 'Africa' },
  { iso2: 'LY', name: 'Libya', flag: '🇱🇾', continent: 'Africa' },
  { iso2: 'MG', name: 'Madagascar', flag: '🇲🇬', continent: 'Africa' },
  { iso2: 'MW', name: 'Malawi', flag: '🇲🇼', continent: 'Africa' },
  { iso2: 'ML', name: 'Mali', flag: '🇲🇱', continent: 'Africa' },
  { iso2: 'MR', name: 'Mauritania', flag: '🇲🇷', continent: 'Africa' },
  { iso2: 'MU', name: 'Mauritius', flag: '🇲🇺', continent: 'Africa' },
  { iso2: 'YT', name: 'Mayotte', flag: '🇾🇹', continent: 'Africa' },
  { iso2: 'MA', name: 'Morocco', flag: '🇲🇦', continent: 'Africa' },
  { iso2: 'MZ', name: 'Mozambique', flag: '🇲🇿', continent: 'Africa' },
  { iso2: 'NA', name: 'Namibia', flag: '🇳🇦', continent: 'Africa' },
  { iso2: 'NE', name: 'Niger', flag: '🇳🇪', continent: 'Africa' },
  { iso2: 'NG', name: 'Nigeria', flag: '🇳🇬', continent: 'Africa' },
  { iso2: 'CG', name: 'Republic of the Congo', flag: '🇨🇬', continent: 'Africa' },
  { iso2: 'RE', name: 'Réunion', flag: '🇷🇪', continent: 'Africa' },
  { iso2: 'RW', name: 'Rwanda', flag: '🇷🇼', continent: 'Africa' },
  { iso2: 'SH', name: 'Saint Helena', flag: '🇸🇭', continent: 'Africa' },
  { iso2: 'ST', name: 'São Tomé and Príncipe', flag: '🇸🇹', continent: 'Africa' },
  { iso2: 'SN', name: 'Senegal', flag: '🇸🇳', continent: 'Africa' },
  { iso2: 'SC', name: 'Seychelles', flag: '🇸🇨', continent: 'Africa' },
  { iso2: 'SL', name: 'Sierra Leone', flag: '🇸🇱', continent: 'Africa' },
  { iso2: 'SO', name: 'Somalia', flag: '🇸🇴', continent: 'Africa' },
  { iso2: 'ZA', name: 'South Africa', flag: '🇿🇦', continent: 'Africa' },
  { iso2: 'SS', name: 'South Sudan', flag: '🇸🇸', continent: 'Africa' },
  { iso2: 'SD', name: 'Sudan', flag: '🇸🇩', continent: 'Africa' },
  { iso2: 'TZ', name: 'Tanzania', flag: '🇹🇿', continent: 'Africa' },
  { iso2: 'TG', name: 'Togo', flag: '🇹🇬', continent: 'Africa' },
  { iso2: 'TN', name: 'Tunisia', flag: '🇹🇳', continent: 'Africa' },
  { iso2: 'UG', name: 'Uganda', flag: '🇺🇬', continent: 'Africa' },
  { iso2: 'EH', name: 'Western Sahara', flag: '🇪🇭', continent: 'Africa' },
  { iso2: 'ZM', name: 'Zambia', flag: '🇿🇲', continent: 'Africa' },
  { iso2: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', continent: 'Africa' },
];

/**
 * 'AU' → 'Australia'. Falls back to the code itself for anything not listed, so
 * an unknown value still prints something rather than vanishing off a document.
 */
export function countryName(iso2: string): string {
  const code = (iso2 ?? '').trim().toUpperCase();
  if (!code) return '';
  return COUNTRY_SEED.find((c) => c.iso2 === code)?.name ?? code;
}

/**
 * The seed under continent headings, in `CONTINENTS` order.
 *
 * Built from the seed rather than from `phone.ts`'s list, because this is what
 * the address picker offers and an address does not need a dial code. A
 * continent with nothing in it never renders, so the seed stays the only place
 * a country is declared.
 */
export const COUNTRIES_BY_CONTINENT: Array<{ continent: Continent; countries: CountrySeed[] }> =
  CONTINENTS.map((continent) => ({
    continent,
    countries: COUNTRY_SEED.filter((c) => c.continent === continent),
  })).filter((g) => g.countries.length > 0);
