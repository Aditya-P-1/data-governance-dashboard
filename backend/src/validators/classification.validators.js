const VALID_CLASSIFICATION_LABEL_CODES = new Set([
  'EMAIL',
  'PHONE',
  'NAME',
  'GOVERNMENT_ID',
  'ADDRESS',
  'DATE_OF_BIRTH',
]);

function validateManualClassificationOverrideBody(body) {
  const errors = [];
  const normalized = {
    datasetColumnId: typeof body?.datasetColumnId === 'string' ? body.datasetColumnId.trim() : '',
    classificationLabelCode:
      typeof body?.classificationLabelCode === 'string' ? body.classificationLabelCode.trim().toUpperCase() : '',
    rationale: typeof body?.rationale === 'string' ? body.rationale.trim() : '',
    appliedByUserId: typeof body?.appliedByUserId === 'string' ? body.appliedByUserId.trim() : '',
  };

  if (!normalized.datasetColumnId) {
    errors.push('datasetColumnId is required');
  }

  if (!normalized.classificationLabelCode) {
    errors.push('classificationLabelCode is required');
  } else if (!VALID_CLASSIFICATION_LABEL_CODES.has(normalized.classificationLabelCode)) {
    errors.push('classificationLabelCode must be one of EMAIL, PHONE, NAME, GOVERNMENT_ID, ADDRESS, DATE_OF_BIRTH');
  }

  if (typeof body?.confidence !== 'undefined') {
    const confidence = Number(body.confidence);

    if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
      errors.push('confidence must be a number between 0 and 1');
    } else {
      normalized.confidence = confidence;
    }
  } else {
    normalized.confidence = undefined;
  }

  if (normalized.rationale.length > 500) {
    errors.push('rationale must be 500 characters or less');
  }

  if (normalized.appliedByUserId.length === 0) {
    delete normalized.appliedByUserId;
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return normalized;
}

module.exports = {
  validateManualClassificationOverrideBody,
  VALID_CLASSIFICATION_LABEL_CODES,
};
