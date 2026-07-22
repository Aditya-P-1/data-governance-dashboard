function toRate(value) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue) || numericValue < 0) {
    return 0;
  }

  if (numericValue > 1) {
    return 1;
  }

  return numericValue;
}

function toScoreFromRate(rate) {
  return Number(((1 - toRate(rate)) * 100).toFixed(2));
}

function roundScore(value) {
  return Number(Number(value).toFixed(2));
}

function calculateTrustScore({
  qualityScore,
  classificationCompleteness,
  missingRate,
  duplicateRate,
  invalidRate,
}) {
  const normalizedQualityScore = roundScore(Number(qualityScore ?? 0));
  const normalizedClassificationCompleteness = roundScore(Number(classificationCompleteness ?? 0));
  const missingScore = toScoreFromRate(missingRate);
  const duplicateScore = toScoreFromRate(duplicateRate);
  const invalidScore = toScoreFromRate(invalidRate);

  const dataIntegrityScore = roundScore(
    0.5 * missingScore + 0.25 * duplicateScore + 0.25 * invalidScore,
  );

  const overallScore = roundScore(
    0.45 * normalizedQualityScore +
      0.35 * normalizedClassificationCompleteness +
      0.2 * dataIntegrityScore,
  );

  return {
    overallScore,
    qualityScore: normalizedQualityScore,
    classificationScore: normalizedClassificationCompleteness,
    completenessScore: missingScore,
    freshnessScore: duplicateScore,
    usageScore: invalidScore,
    dataIntegrityScore,
    missingScore,
    duplicateScore,
    invalidScore,
  };
}

module.exports = {
  calculateTrustScore,
  roundScore,
  toRate,
  toScoreFromRate,
};
