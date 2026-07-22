const fs = require('fs/promises');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { parseWorkbookRows, extractDatasetMatrix } = require('../utils/datasetRead.utils');
const { buildQualitySummary } = require('../utils/quality.utils');
const { calculateTrustScore } = require('../utils/trustScore.utils');
const { findDatasetWithLatestVersionQualityContext } = require('../repositories/dataset.repository');
const { createTrustScoreSnapshot } = require('../repositories/trustScore.repository');

function getLatestQualityRun(version) {
  return Array.isArray(version?.qualityRuns) && version.qualityRuns.length > 0 ? version.qualityRuns[0] : null;
}

function getIssueByRuleCode(qualityRun, ruleCode) {
  return qualityRun?.issues?.find(issue => issue.qualityRule?.code === ruleCode) || null;
}

function getClassificationCompleteness(columns) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return 0;
  }

  const classifiedColumns = columns.filter(column => {
    const latestClassification = Array.isArray(column.classifications) ? column.classifications[0] : null;
    return Boolean(latestClassification?.classificationLabel);
  }).length;

  return Number(((classifiedColumns / columns.length) * 100).toFixed(2));
}

function getQualityRates(qualityRun, summary) {
  const missingIssue = getIssueByRuleCode(qualityRun, 'MISSING_VALUES');
  const duplicateIssue = getIssueByRuleCode(qualityRun, 'DUPLICATE_ROWS');
  const invalidIssue = getIssueByRuleCode(qualityRun, 'INVALID_VALUES');

  const missingRate =
    typeof missingIssue?.detailsJson?.rate === 'number'
      ? missingIssue.detailsJson.rate
      : summary.missingRate;
  const duplicateRate =
    typeof duplicateIssue?.detailsJson?.rate === 'number'
      ? duplicateIssue.detailsJson.rate
      : summary.duplicateRate;
  const invalidRate =
    typeof invalidIssue?.detailsJson?.rate === 'number'
      ? invalidIssue.detailsJson.rate
      : summary.invalidRate;

  return {
    missingRate,
    duplicateRate,
    invalidRate,
  };
}

function buildTrustScoreResponse({
  dataset,
  version,
  qualityRun,
  snapshot,
  breakdown,
}) {
  return {
    dataset: {
      id: dataset.id,
      slug: dataset.slug,
      name: dataset.name,
      status: dataset.status,
    },
    version: {
      id: version.id,
      versionNumber: version.versionNumber,
      originalFileName: version.originalFileName,
      fileFormat: version.fileFormat,
    },
    trustScore: {
      snapshot: {
        id: snapshot.id,
        overallScore: Number(snapshot.overallScore),
        qualityScore: Number(snapshot.qualityScore),
        completenessScore: Number(snapshot.completenessScore),
        freshnessScore: Number(snapshot.freshnessScore),
        usageScore: Number(snapshot.usageScore),
        classificationScore: Number(snapshot.classificationScore),
        formulaVersion: snapshot.formulaVersion,
        calculatedAt: snapshot.calculatedAt,
      },
      inputs: {
        qualityRunId: qualityRun.id,
        qualityScore: Number(qualityRun.qualityScore),
        classificationCompleteness: breakdown.classificationCompleteness,
        missingRate: breakdown.missingRate,
        duplicateRate: breakdown.duplicateRate,
        invalidRate: breakdown.invalidRate,
        missingScore: breakdown.missingScore,
        duplicateScore: breakdown.duplicateScore,
        invalidScore: breakdown.invalidScore,
        dataIntegrityScore: breakdown.dataIntegrityScore,
      },
    },
  };
}

async function calculateDatasetTrustScore(datasetId) {
  const dataset = await findDatasetWithLatestVersionQualityContext(datasetId);

  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  const version = dataset.versions[0];

  if (!version) {
    throw new AppError('Dataset version not found', 404);
  }

  if (!Array.isArray(version.columns) || version.columns.length === 0) {
    throw new AppError('Run schema discovery before calculating trust score', 409);
  }

  const qualityRun = getLatestQualityRun(version);

  if (!qualityRun) {
    throw new AppError('Run data quality analysis before calculating trust score', 409);
  }

  try {
    await fs.access(version.storagePath);
  } catch {
    throw new AppError('Uploaded file is no longer available on disk', 404);
  }

  const rows = parseWorkbookRows(version.storagePath);
  const { headers, dataRows } = extractDatasetMatrix(rows);
  const summary = buildQualitySummary({
    headers,
    dataRows,
    columns: version.columns,
  });

  const classificationCompleteness = getClassificationCompleteness(version.columns);
  const rates = getQualityRates(qualityRun, summary);
  const breakdown = calculateTrustScore({
    qualityScore: qualityRun.qualityScore,
    classificationCompleteness,
    missingRate: rates.missingRate,
    duplicateRate: rates.duplicateRate,
    invalidRate: rates.invalidRate,
  });

  const calculatedAt = new Date();

  const snapshot = await prisma.$transaction(async transaction =>
    createTrustScoreSnapshot(transaction, {
      datasetId: dataset.id,
      datasetVersionId: version.id,
      overallScore: breakdown.overallScore,
      qualityScore: breakdown.qualityScore,
      completenessScore: breakdown.completenessScore,
      freshnessScore: breakdown.freshnessScore,
      usageScore: breakdown.usageScore,
      classificationScore: breakdown.classificationScore,
      formulaVersion: 'trust_v1',
      calculatedAt,
    }),
  );

  return buildTrustScoreResponse({
    dataset,
    version,
    qualityRun,
    snapshot,
    breakdown: {
      ...breakdown,
      classificationCompleteness,
      missingRate: rates.missingRate,
      duplicateRate: rates.duplicateRate,
      invalidRate: rates.invalidRate,
    },
  });
}

module.exports = {
  calculateDatasetTrustScore,
};
