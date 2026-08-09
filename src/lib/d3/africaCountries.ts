export interface AfricanCountry {
  numericId: string;
  alpha2: string;
  alpha3: string;
  name: string;
}

export const AFRICA_COUNTRIES: readonly AfricanCountry[] = [
  { numericId: '012', alpha2: 'DZ', alpha3: 'DZA', name: 'Algeria' },
  { numericId: '024', alpha2: 'AO', alpha3: 'AGO', name: 'Angola' },
  { numericId: '204', alpha2: 'BJ', alpha3: 'BEN', name: 'Benin' },
  { numericId: '072', alpha2: 'BW', alpha3: 'BWA', name: 'Botswana' },
  { numericId: '854', alpha2: 'BF', alpha3: 'BFA', name: 'Burkina Faso' },
  { numericId: '108', alpha2: 'BI', alpha3: 'BDI', name: 'Burundi' },
  { numericId: '132', alpha2: 'CV', alpha3: 'CPV', name: 'Cabo Verde' },
  { numericId: '120', alpha2: 'CM', alpha3: 'CMR', name: 'Cameroon' },
  { numericId: '140', alpha2: 'CF', alpha3: 'CAF', name: 'Central African Republic' },
  { numericId: '148', alpha2: 'TD', alpha3: 'TCD', name: 'Chad' },
  { numericId: '174', alpha2: 'KM', alpha3: 'COM', name: 'Comoros' },
  { numericId: '178', alpha2: 'CG', alpha3: 'COG', name: 'Congo' },
  { numericId: '180', alpha2: 'CD', alpha3: 'COD', name: 'DR Congo' },
  { numericId: '384', alpha2: 'CI', alpha3: 'CIV', name: "C\u00f4te d'Ivoire" },
  { numericId: '262', alpha2: 'DJ', alpha3: 'DJI', name: 'Djibouti' },
  { numericId: '818', alpha2: 'EG', alpha3: 'EGY', name: 'Egypt' },
  { numericId: '226', alpha2: 'GQ', alpha3: 'GNQ', name: 'Equatorial Guinea' },
  { numericId: '232', alpha2: 'ER', alpha3: 'ERI', name: 'Eritrea' },
  { numericId: '748', alpha2: 'SZ', alpha3: 'SWZ', name: 'Eswatini' },
  { numericId: '231', alpha2: 'ET', alpha3: 'ETH', name: 'Ethiopia' },
  { numericId: '266', alpha2: 'GA', alpha3: 'GAB', name: 'Gabon' },
  { numericId: '270', alpha2: 'GM', alpha3: 'GMB', name: 'Gambia' },
  { numericId: '288', alpha2: 'GH', alpha3: 'GHA', name: 'Ghana' },
  { numericId: '324', alpha2: 'GN', alpha3: 'GIN', name: 'Guinea' },
  { numericId: '624', alpha2: 'GW', alpha3: 'GNB', name: 'Guinea-Bissau' },
  { numericId: '404', alpha2: 'KE', alpha3: 'KEN', name: 'Kenya' },
  { numericId: '426', alpha2: 'LS', alpha3: 'LSO', name: 'Lesotho' },
  { numericId: '430', alpha2: 'LR', alpha3: 'LBR', name: 'Liberia' },
  { numericId: '434', alpha2: 'LY', alpha3: 'LBY', name: 'Libya' },
  { numericId: '450', alpha2: 'MG', alpha3: 'MDG', name: 'Madagascar' },
  { numericId: '454', alpha2: 'MW', alpha3: 'MWI', name: 'Malawi' },
  { numericId: '466', alpha2: 'ML', alpha3: 'MLI', name: 'Mali' },
  { numericId: '478', alpha2: 'MR', alpha3: 'MRT', name: 'Mauritania' },
  { numericId: '480', alpha2: 'MU', alpha3: 'MUS', name: 'Mauritius' },
  { numericId: '504', alpha2: 'MA', alpha3: 'MAR', name: 'Morocco' },
  { numericId: '508', alpha2: 'MZ', alpha3: 'MOZ', name: 'Mozambique' },
  { numericId: '516', alpha2: 'NA', alpha3: 'NAM', name: 'Namibia' },
  { numericId: '562', alpha2: 'NE', alpha3: 'NER', name: 'Niger' },
  { numericId: '566', alpha2: 'NG', alpha3: 'NGA', name: 'Nigeria' },
  { numericId: '646', alpha2: 'RW', alpha3: 'RWA', name: 'Rwanda' },
  { numericId: '678', alpha2: 'ST', alpha3: 'STP', name: 'Sao Tome and Principe' },
  { numericId: '686', alpha2: 'SN', alpha3: 'SEN', name: 'Senegal' },
  { numericId: '690', alpha2: 'SC', alpha3: 'SYC', name: 'Seychelles' },
  { numericId: '694', alpha2: 'SL', alpha3: 'SLE', name: 'Sierra Leone' },
  { numericId: '706', alpha2: 'SO', alpha3: 'SOM', name: 'Somalia' },
  { numericId: '710', alpha2: 'ZA', alpha3: 'ZAF', name: 'South Africa' },
  { numericId: '728', alpha2: 'SS', alpha3: 'SSD', name: 'South Sudan' },
  { numericId: '729', alpha2: 'SD', alpha3: 'SDN', name: 'Sudan' },
  { numericId: '834', alpha2: 'TZ', alpha3: 'TZA', name: 'Tanzania' },
  { numericId: '768', alpha2: 'TG', alpha3: 'TGO', name: 'Togo' },
  { numericId: '788', alpha2: 'TN', alpha3: 'TUN', name: 'Tunisia' },
  { numericId: '800', alpha2: 'UG', alpha3: 'UGA', name: 'Uganda' },
  { numericId: '732', alpha2: 'EH', alpha3: 'ESH', name: 'Western Sahara' },
  { numericId: '894', alpha2: 'ZM', alpha3: 'ZMB', name: 'Zambia' },
  { numericId: '716', alpha2: 'ZW', alpha3: 'ZWE', name: 'Zimbabwe' },
];

export const AFRICA_NUMERIC_IDS: Set<string> = new Set(AFRICA_COUNTRIES.map((c) => c.numericId));

export function findByAlpha2(alpha2: string): AfricanCountry | undefined {
  if (!alpha2) return undefined;
  return AFRICA_COUNTRIES.find((c) => c.alpha2 === alpha2.toUpperCase());
}

export function findByNumericId(numericId: string | number): AfricanCountry | undefined {
  return AFRICA_COUNTRIES.find((c) => c.numericId === String(numericId));
}

export const CURRENCY_TO_ALPHA2: Record<string, string> = {
  NGN: 'NG',
  GHS: 'GH',
  KES: 'KE',
  UGX: 'UG',
};

// Every African country's own ISO 4217 currency. Only the four in
// CURRENCY_TO_ALPHA2 are converted live by the FX service today (see
// public/docs/pricing.md); the rest are here so the map can still name a
// country's currency and fall back to USD honestly when no rate exists.
export const ALPHA2_TO_CURRENCY: Record<string, string> = {
  DZ: 'DZD', AO: 'AOA', BJ: 'XOF', BW: 'BWP', BF: 'XOF',
  BI: 'BIF', CV: 'CVE', CM: 'XAF', CF: 'XAF', TD: 'XAF',
  KM: 'KMF', CG: 'XAF', CD: 'CDF', CI: 'XOF', DJ: 'DJF',
  EG: 'EGP', GQ: 'XAF', ER: 'ERN', SZ: 'SZL', ET: 'ETB',
  GA: 'XAF', GM: 'GMD', GH: 'GHS', GN: 'GNF', GW: 'XOF',
  KE: 'KES', LS: 'LSL', LR: 'LRD', LY: 'LYD', MG: 'MGA',
  MW: 'MWK', ML: 'XOF', MR: 'MRU', MU: 'MUR', MA: 'MAD',
  MZ: 'MZN', NA: 'NAD', NE: 'XOF', NG: 'NGN', RW: 'RWF',
  ST: 'STN', SN: 'XOF', SC: 'SCR', SL: 'SLE', SO: 'SOS',
  ZA: 'ZAR', SS: 'SSP', SD: 'SDG', TZ: 'TZS', TG: 'XOF',
  TN: 'TND', UG: 'UGX', EH: 'MAD', ZM: 'ZMW', ZW: 'ZWG',
};

export function currencyForAlpha2(alpha2?: string): string | undefined {
  if (!alpha2) return undefined;
  return ALPHA2_TO_CURRENCY[alpha2.toUpperCase()];
}
