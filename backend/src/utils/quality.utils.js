const { classifyCell } = require('./schemaDiscovery.utils');
const {
  isAddressValue,
  isDateOfBirthValue,
  isEmailValue,
  isGovernmentIdValue,
  isNameValue,
  isPhoneValue,
} = require('./classification.utils');

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function normalizeCellForComparison(value) {
  if (isBlank(value)) {
    return '__MISSING__';
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(value).toString();
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value).trim();
}

function buildRowFingerprint(row) {
  return row.map(normalizeCellForComparison).join('\u0001');
}

function getClassificationLabelCode(column) {
  const latestClassification = Array.isArray(column?.classifications) ? column.classifications[0] : null;
  return latestClassification?.classificationLabel?.code || null;
}

function getValidatorForColumn(column) {
  const labelCode = getClassificationLabelCode(column);

  if (labelCode === 'EMAIL') {
    return isEmailValue;
  }

  if (labelCode === 'PHONE') {
    return isPhoneValue;
  }

  if (labelCode === 'NAME') {
    return isNameValue;
  }

  if (labelCode === 'GOVERNMENT_ID') {
    return isGovernmentIdValue;
  }

  if (labelCode === 'ADDRESS') {
    return isAddressValue;
  }

  if (labelCode === 'DATE_OF_BIRTH') {
    return isDateOfBirthValue;
  }

  const expectedType = String(column?.dataType || '').toUpperCase();

  if (expectedType === 'NUMBER' || expectedType === 'BOOLEAN' || expectedType === 'DATE') {
    return value => classifyCell(value) === expectedType;
  }

  if (expectedType === 'MIXED') {
    return () => true;
  }

  return () => true;
}

function calculateSeverity(rate, scale) {
  if (rate === 0) {
    return 'LOW';
  }

  if (rate <= scale.warn) {
    return 'LOW';
  }

  if (rate <= scale.fail) {
    return 'MEDIUM';
  }

  return 'HIGH';
}

function calculateIssueStatus(rate, scale) {
  if (rate === 0) {
    return 'PASS';
  }

  if (rate <= scale.warn) {
    return 'WARN';
  }

  return 'FAIL';
}

function roundPercent(value) {
  return Number((value * 100).toFixed(2));
}

function buildQualitySummary({
  headers,
  dataRows,
  columns,
}) {
  const totalRows = dataRows.length;
  const totalColumns = columns.length;
  const totalCells = totalRows * totalColumns;
  const rowFingerprints = new Map();

  const columnStats = columns.map(column => ({
    columnId: column.id,
    ordinal: column.ordinal,
    name: column.name,
    normalizedName: column.normalizedName,
    dataType: column.dataType,
    classificationLabelCode: getClassificationLabelCode(column),
    missingCount: 0,
    invalidCount: 0,
    sampleInvalidValues: [],
  }));

  let missingCells = 0;
  let invalidCells = 0;

  dataRows.forEach(row => {
    const normalizedRow = Array.from({ length: totalColumns }, (_, index) => row?.[index] ?? null);
    const fingerprint = buildRowFingerprint(normalizedRow);
    rowFingerprints.set(fingerprint, (rowFingerprints.get(fingerprint) || 0) + 1);

    normalizedRow.forEach((value, index) => {
      if (isBlank(value)) {
        missingCells += 1;
        columnStats[index].missingCount += 1;
        return;
      }

      const validator = getValidatorForColumn(columns[index]);
      if (!validator(value)) {
        invalidCells += 1;
        columnStats[index].invalidCount += 1;

        if (columnStats[index].sampleInvalidValues.length < 5) {
          columnStats[index].sampleInvalidValues.push(normalizeCellForComparison(value));
        }
      }
    });
  });

  const duplicateGroups = Array.from(rowFingerprints.entries())
    .filter(([, count]) => count > 1)
    .map(([fingerprint, count]) => ({
      fingerprint,
      occurrences: count,
      duplicateRows: count - 1,
    }));

  const duplicateRows = duplicateGroups.reduce((sum, group) => sum + group.duplicateRows, 0);

  const nonMissingCells = Math.max(totalCells - missingCells, 0);
  const validatableCells = Math.max(nonMissingCells, 0);
  const missingRate = totalCells > 0 ? missingCells / totalCells : 0;
  const duplicateRate = totalRows > 0 ? duplicateRows / totalRows : 0;
  const invalidRate = validatableCells > 0 ? invalidCells / validatableCells : 0;

  const completenessScore = 1 - missingRate;
  const uniquenessScore = 1 - duplicateRate;
  const validityScore = 1 - invalidRate;

  const qualityScore = Math.max(
    0,
    Math.min(
      100,
      Number((100 * (0.5 * completenessScore + 0.25 * uniquenessScore + 0.25 * validityScore)).toFixed(2)),
    ),
  );

  return {
    totalRows,
    totalColumns,
    totalCells,
    missingCells,
    duplicateRows,
    invalidCells,
    missingRate,
    duplicateRate,
    invalidRate,
    completenessScore: roundPercent(completenessScore),
    uniquenessScore: roundPercent(uniquenessScore),
    validityScore: roundPercent(validityScore),
    qualityScore,
    columnStats,
    duplicateGroups,
    validatableCells,
    headers,
  };
}

function buildQualityIssueDetails(summary) {
  return {
    totalRows: summary.totalRows,
    totalColumns: summary.totalColumns,
    totalCells: summary.totalCells,
    missingCells: summary.missingCells,
    duplicateRows: summary.duplicateRows,
    invalidCells: summary.invalidCells,
    missingRate: summary.missingRate,
    duplicateRate: summary.duplicateRate,
    invalidRate: summary.invalidRate,
    completenessScore: summary.completenessScore,
    uniquenessScore: summary.uniquenessScore,
    validityScore: summary.validityScore,
    qualityScore: summary.qualityScore,
    columnStats: summary.columnStats,
    duplicateGroups: summary.duplicateGroups.slice(0, 20),
  };
}

module.exports = {
  buildQualityIssueDetails,
  buildQualitySummary,
  calculateIssueStatus,
  calculateSeverity,
  getClassificationLabelCode,
  getValidatorForColumn,
  isBlank,
  normalizeCellForComparison,
};
