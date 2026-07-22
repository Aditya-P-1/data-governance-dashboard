const CLASSIFICATION_DEFINITIONS = [
  {
    code: 'EMAIL',
    name: 'Email',
    description: 'Personal or business email address.',
    level: 'CONFIDENTIAL',
    sortOrder: 1,
    headerKeywords: ['email', 'e mail', 'email address', 'mail address'],
    sampleMatchers: [isEmailValue],
    threshold: 0.6,
  },
  {
    code: 'PHONE',
    name: 'Phone',
    description: 'Personal or business phone number.',
    level: 'CONFIDENTIAL',
    sortOrder: 2,
    headerKeywords: ['phone', 'mobile', 'telephone', 'tel', 'contact', 'cell'],
    sampleMatchers: [isPhoneValue],
    threshold: 0.6,
  },
  {
    code: 'NAME',
    name: 'Name',
    description: 'Person or contact name.',
    level: 'CONFIDENTIAL',
    sortOrder: 3,
    headerKeywords: ['name', 'full name', 'first name', 'last name', 'customer name', 'employee name'],
    sampleMatchers: [isNameValue],
    threshold: 0.55,
  },
  {
    code: 'GOVERNMENT_ID',
    name: 'Government ID',
    description: 'Government-issued identifier such as SSN, passport, tax ID, or national ID.',
    level: 'RESTRICTED',
    sortOrder: 4,
    headerKeywords: [
      'ssn',
      'social security',
      'tax id',
      'taxid',
      'passport',
      'national id',
      'government id',
      'gov id',
      'driver license',
      'driver licence',
      'license number',
      'id number',
      'aadhaar',
      'pan',
    ],
    sampleMatchers: [isGovernmentIdValue],
    threshold: 0.65,
  },
  {
    code: 'ADDRESS',
    name: 'Address',
    description: 'Street address or location-bearing address field.',
    level: 'RESTRICTED',
    sortOrder: 5,
    headerKeywords: ['address', 'street', 'street address', 'addr', 'city', 'state', 'postal', 'postcode', 'zip', 'location'],
    sampleMatchers: [isAddressValue],
    threshold: 0.55,
  },
  {
    code: 'DATE_OF_BIRTH',
    name: 'Date of Birth',
    description: 'Birth date for an individual.',
    level: 'RESTRICTED',
    sortOrder: 6,
    headerKeywords: ['dob', 'date of birth', 'birth date', 'birthdate', 'birthday'],
    sampleMatchers: [isDateOfBirthValue],
    threshold: 0.6,
  },
];

function normalizeMatchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getColumnText(column) {
  return normalizeMatchText([column?.name, column?.normalizedName].filter(Boolean).join(' '));
}

function getSampleValues(column) {
  const profileJson = column?.profileJson || {};
  const sampleValues = Array.isArray(profileJson.sampleValues) ? profileJson.sampleValues : [];

  return sampleValues
    .map(value => String(value ?? '').trim())
    .filter(value => value.length > 0);
}

function countMatches(values, matcher) {
  return values.reduce(
    (count, value) => (matcher(value) ? count + 1 : count),
    0,
  );
}

function getHeaderKeywordHits(headerText, keywords) {
  return keywords.filter(keyword => headerText.includes(normalizeMatchText(keyword)));
}

function hasEnoughDigits(value, minDigits, maxDigits = 99) {
  const digitCount = String(value ?? '').replace(/\D/g, '').length;
  return digitCount >= minDigits && digitCount <= maxDigits;
}

function isEmailValue(value) {
  const trimmed = String(value ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function isPhoneValue(value) {
  const trimmed = String(value ?? '').trim();
  if (!hasEnoughDigits(trimmed, 7, 15)) {
    return false;
  }

  return /^(?:\+?\d{1,3}[\s.-]*)?(?:\(?\d{2,4}\)?[\s.-]*)?\d{3,4}[\s.-]*\d{3,4}(?:\s*(?:x|ext\.?|extension)\s*\d{1,6})?$/i.test(
    trimmed,
  );
}

function isLikelyPersonNameToken(token) {
  return /^[a-z][a-z'-.]*$/i.test(token) && !/^\d+$/.test(token);
}

function isNameValue(value) {
  const trimmed = String(value ?? '').trim();

  if (!trimmed || /[@\d]/.test(trimmed)) {
    return false;
  }

  const normalized = normalizeMatchText(trimmed);
  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (tokens.length === 0 || tokens.length > 4) {
    return false;
  }

  if (!tokens.every(isLikelyPersonNameToken)) {
    return false;
  }

  const blockedTokens = new Set(['street', 'road', 'avenue', 'lane', 'drive', 'boulevard', 'city', 'state', 'zip', 'postal']);
  return !tokens.some(token => blockedTokens.has(token));
}

function isGovernmentIdValue(value) {
  const trimmed = String(value ?? '').trim();

  return [
    /^\d{3}-?\d{2}-?\d{4}$/,
    /^\d{2}-?\d{7}$/,
    /^[A-Z0-9][A-Z0-9-]{5,19}$/i,
    /^[A-Z]{1,3}-?\d{4,12}$/i,
    /^\d{6,20}$/,
  ].some(pattern => pattern.test(trimmed));
}

function isAddressValue(value) {
  const trimmed = String(value ?? '').trim();

  if (!trimmed) {
    return false;
  }

  const normalized = normalizeMatchText(trimmed);
  const addressKeywords = [
    'street',
    'road',
    'avenue',
    'boulevard',
    'lane',
    'drive',
    'court',
    'way',
    'place',
    'suite',
    'apt',
    'apartment',
    'po box',
    'postal code',
    'zip',
    'postcode',
  ];

  const hasStreetMarker = addressKeywords.some(keyword => normalized.includes(keyword));
  const hasPostalCode = /\b\d{5}(?:-\d{4})?\b/.test(trimmed);
  const hasStreetNumber = /^\d+\s+[a-z]/i.test(trimmed);

  return hasStreetMarker || hasPostalCode || (hasStreetNumber && /\b(?:st|street|rd|road|ave|avenue|blvd|boulevard|lane|ln|drive|dr|court|ct|way|place|pl)\b/i.test(trimmed));
}

function parseDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const trimmed = String(value ?? '').trim();

  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function isDateOfBirthValue(value) {
  const parsed = parseDateValue(value);

  if (!parsed) {
    return false;
  }

  const earliestAllowed = new Date('1900-01-01T00:00:00.000Z');
  const now = new Date();

  return parsed >= earliestAllowed && parsed <= now;
}

function scoreClassificationLabel(column, definition) {
  const headerText = getColumnText(column);
  const sampleValues = getSampleValues(column);
  const headerHits = getHeaderKeywordHits(headerText, definition.headerKeywords);
  const sampleMatchCount = countMatches(sampleValues, value => definition.sampleMatchers.some(matcher => matcher(value)));
  const sampleRatio = sampleValues.length ? sampleMatchCount / sampleValues.length : 0;

  let score = 0;
  const signals = [];

  if (headerHits.length > 0) {
    const headerScore = Math.min(0.55, 0.25 + headerHits.length * 0.1);
    score += headerScore;
    signals.push(`Header matched ${headerHits.join(', ')}.`);
  }

  if (sampleValues.length > 0) {
    const sampleScore = sampleRatio * 0.45;
    score += sampleScore;
    signals.push(`${sampleMatchCount}/${sampleValues.length} sample values matched the expected pattern.`);
  }

  if (definition.code === 'DATE_OF_BIRTH' && String(column?.dataType || '').toUpperCase() === 'DATE') {
    score += 0.08;
    signals.push('Column data type is DATE.');
  }

  if (definition.code === 'EMAIL' && String(column?.dataType || '').toUpperCase() === 'STRING') {
    score += 0.03;
  }

  if (definition.code === 'PHONE' && ['STRING', 'NUMBER'].includes(String(column?.dataType || '').toUpperCase())) {
    score += 0.03;
  }

  if (definition.code === 'GOVERNMENT_ID' && ['STRING', 'NUMBER'].includes(String(column?.dataType || '').toUpperCase())) {
    score += 0.04;
  }

  if (definition.code === 'ADDRESS' && String(column?.dataType || '').toUpperCase() === 'STRING') {
    score += 0.03;
  }

  if (definition.code === 'NAME' && String(column?.dataType || '').toUpperCase() === 'STRING') {
    score += 0.03;
  }

  score = Number(Math.min(1, score).toFixed(4));

  return {
    code: definition.code,
    name: definition.name,
    description: definition.description,
    level: definition.level,
    sortOrder: definition.sortOrder,
    score,
    threshold: definition.threshold,
    rationale: signals.length ? signals.join(' ') : 'No strong classification signals were detected.',
    sampleMatchCount,
    sampleCount: sampleValues.length,
    headerHits,
  };
}

function classifyColumn(column) {
  const scoredLabels = CLASSIFICATION_DEFINITIONS.map(definition => scoreClassificationLabel(column, definition))
    .filter(candidate => candidate.score >= candidate.threshold)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.sortOrder - right.sortOrder;
    });

  const bestMatch = scoredLabels[0] || null;

  return {
    bestMatch,
    candidates: scoredLabels,
  };
}

module.exports = {
  CLASSIFICATION_DEFINITIONS,
  classifyColumn,
  getColumnText,
  getSampleValues,
  isAddressValue,
  isDateOfBirthValue,
  isEmailValue,
  isGovernmentIdValue,
  isNameValue,
  isPhoneValue,
  normalizeMatchText,
};
