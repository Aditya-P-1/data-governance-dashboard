const { toJsonSafe } = require('./json.utils');

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function normalizeColumnName(label, index) {
  const fallbackName = `column_${index + 1}`;
  const rawName = String(label ?? '').trim() || fallbackName;

  return rawName
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || fallbackName;
}

function normalizeDisplayName(label, index) {
  const fallbackName = `column_${index + 1}`;
  return String(label ?? '').trim() || fallbackName;
}

function isBooleanString(value) {
  return /^(true|false)$/i.test(value);
}

function isNumberString(value) {
  return /^-?(?:\d+\.?\d*|\d*\.\d+)$/.test(value);
}

function isDateString(value) {
  const trimmed = value.trim();
  const dateLikePatterns = [
    /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/,
    /^\d{4}\/\d{1,2}\/\d{1,2}$/,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s.*)?$/,
  ];

  if (!dateLikePatterns.some(pattern => pattern.test(trimmed))) {
    return false;
  }

  return !Number.isNaN(Date.parse(trimmed));
}

function classifyCell(value) {
  if (isBlank(value)) {
    return 'NULL';
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return 'DATE';
  }

  if (typeof value === 'boolean') {
    return 'BOOLEAN';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return 'NUMBER';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (isBooleanString(trimmed)) {
      return 'BOOLEAN';
    }

    if (isNumberString(trimmed)) {
      return 'NUMBER';
    }

    if (isDateString(trimmed)) {
      return 'DATE';
    }

    return 'STRING';
  }

  return 'STRING';
}

function detectColumnType(values) {
  const typeCounts = {
    STRING: 0,
    NUMBER: 0,
    BOOLEAN: 0,
    DATE: 0,
    NULL: 0,
  };

  const samples = [];

  for (const value of values) {
    const detectedType = classifyCell(value);
    typeCounts[detectedType] += 1;

    if (!isBlank(value) && samples.length < 5) {
      samples.push(value);
    }
  }

  const nonNullTypes = Object.entries(typeCounts)
    .filter(([type, count]) => type !== 'NULL' && count > 0)
    .map(([type]) => type);

  let dataType = 'NULL';

  if (nonNullTypes.length === 1) {
    [dataType] = nonNullTypes;
  } else if (nonNullTypes.length > 1) {
    dataType = 'MIXED';
  }

  return {
    dataType,
    isNullable: typeCounts.NULL > 0 || nonNullTypes.length === 0,
    profileJson: {
      detectedType: dataType,
      typeCounts,
      totalRows: values.length,
      nonNullCount: values.length - typeCounts.NULL,
      nullCount: typeCounts.NULL,
      sampleValues: toJsonSafe(samples),
    },
  };
}

function buildDiscoveredColumns(headers, dataRows) {
  const usedNames = new Set();

  return headers.map((header, index) => {
    const name = normalizeDisplayName(header, index);
    const baseNormalizedName = normalizeColumnName(header, index);
    let normalizedName = baseNormalizedName;
    let suffix = 2;

    while (usedNames.has(normalizedName)) {
      normalizedName = `${baseNormalizedName}_${suffix}`;
      suffix += 1;
    }

    usedNames.add(normalizedName);

    const values = dataRows.map(row => (row ? row[index] : null));
    const { dataType, isNullable, profileJson } = detectColumnType(values);

    return {
      ordinal: index + 1,
      name,
      normalizedName,
      dataType,
      isNullable,
      isPrimaryKey: false,
      isUnique: false,
      description: null,
      profileJson,
      profiledAt: new Date(),
    };
  });
}

module.exports = {
  buildDiscoveredColumns,
  classifyCell,
  detectColumnType,
  normalizeColumnName,
  normalizeDisplayName,
};
