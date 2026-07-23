const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { findDatasetWithLatestVersionDetails } = require('../repositories/dataset.repository');
const { getDatasetViewStats } = require('../repositories/usage.repository');
const { buildValueAssessment } = require('../utils/valueScore.utils');

function roundPercent(value) {
  return Number(value.toFixed(2));
}

function getLatestVersion(dataset) {
  return Array.isArray(dataset.versions) && dataset.versions.length > 0 ? dataset.versions[0] : null;
}

function getLatestQualityRun(version) {
  return Array.isArray(version?.qualityRuns) && version.qualityRuns.length > 0 ? version.qualityRuns[0] : null;
}

function getLatestTrustScore(version) {
  return Array.isArray(version?.trustScores) && version.trustScores.length > 0 ? version.trustScores[0] : null;
}

function getLatestValueScore(version) {
  return Array.isArray(version?.valueScores) && version.valueScores.length > 0 ? version.valueScores[0] : null;
}

function getLatestClassification(column) {
  return Array.isArray(column?.classifications) && column.classifications.length > 0
    ? column.classifications[0]
    : null;
}

function getDaysSinceLastViewed(lastViewedAt) {
  if (!lastViewedAt) {
    return null;
  }

  const diffMs = Date.now() - new Date(lastViewedAt).getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
}

function buildQualityIssueMaps(qualityRun) {
  const missingCounts = new Map();
  const invalidCounts = new Map();

  for (const issue of qualityRun?.issues || []) {
    const entries = Array.isArray(issue.detailsJson?.columns) ? issue.detailsJson.columns : [];

    if (issue.qualityRule?.code === 'MISSING_VALUES') {
      for (const entry of entries) {
        if (entry.columnId) {
          missingCounts.set(entry.columnId, Number(entry.missingCount || 0));
        }
      }
    }

    if (issue.qualityRule?.code === 'INVALID_VALUES') {
      for (const entry of entries) {
        if (entry.columnId) {
          invalidCounts.set(entry.columnId, Number(entry.invalidCount || 0));
        }
      }
    }
  }

  return {
    missingCounts,
    invalidCounts,
  };
}

function getSensitiveColumnCount(columns) {
  return columns.reduce((count, column) => {
    const classification = getLatestClassification(column);
    const level = classification?.classificationLabel?.level;

    if (level === 'CONFIDENTIAL' || level === 'RESTRICTED') {
      return count + 1;
    }

    return count;
  }, 0);
}

function buildColumnMetrics(column, rowCount, qualityMaps) {
  const classification = getLatestClassification(column);
  const classificationLabel = classification?.classificationLabel || null;
  const missingCount = qualityMaps.missingCounts.get(column.id) || 0;
  const invalidCount = qualityMaps.invalidCounts.get(column.id) || 0;
  const missingPercent = rowCount > 0 ? (missingCount / rowCount) * 100 : 0;
  const invalidPercent = rowCount > 0 ? (invalidCount / rowCount) * 100 : 0;
  const completenessScore = 100 - missingPercent;
  const validityScore = 100 - invalidPercent;
  const qualityScore = roundPercent(0.6 * completenessScore + 0.4 * validityScore);

  return {
    id: column.id,
    ordinal: column.ordinal,
    name: column.name,
    normalizedName: column.normalizedName,
    dataType: column.dataType,
    classification: classificationLabel
      ? {
          code: classificationLabel.code,
          name: classificationLabel.name,
          level: classificationLabel.level,
          source: classification.source,
          confidence: classification.confidence === null ? null : Number(classification.confidence),
          rationale: classification.rationale,
          appliedAt: classification.appliedAt,
        }
      : null,
    manualOverride: classification?.source === 'MANUAL'
      ? {
          enabled: true,
          rationale: classification.rationale || null,
          appliedAt: classification.appliedAt,
        }
      : {
          enabled: false,
          rationale: null,
          appliedAt: null,
        },
    qualityMetrics: {
      missingCount,
      invalidCount,
      missingPercent: roundPercent(missingPercent),
      invalidPercent: roundPercent(invalidPercent),
      completenessScore: roundPercent(completenessScore),
      validityScore: roundPercent(validityScore),
      qualityScore,
    },
  };
}

async function getDatasetDetails(datasetId) {
  const dataset = await findDatasetWithLatestVersionDetails(datasetId);

  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  const version = getLatestVersion(dataset);

  if (!version) {
    throw new AppError('Dataset version not found', 404);
  }

  const qualityRun = getLatestQualityRun(version);
  const trustScore = getLatestTrustScore(version);
  const valueScore = getLatestValueScore(version);
  const rowCount = Number(version.rowCount || 0);
  const columnCount = Number(version.columnCount || version.columns.length || 0);
  const qualityMaps = buildQualityIssueMaps(qualityRun);
  const columns = version.columns.map(column => buildColumnMetrics(column, rowCount, qualityMaps));
  const usageStats = await getDatasetViewStats(prisma, dataset.id);
  const sensitiveColumns = getSensitiveColumnCount(version.columns);
  const valueAssessment = buildValueAssessment({
    overallScore: valueScore ? Number(valueScore.overallScore) : null,
    viewCount: usageStats.viewCount,
    viewsLast30Days: usageStats.viewsLast30Days,
    daysSinceLastViewed: getDaysSinceLastViewed(usageStats.lastViewedAt),
  });

  return {
    dataset: {
      id: dataset.id,
      slug: dataset.slug,
      name: dataset.name,
      description: dataset.description,
      businessDomain: dataset.businessDomain,
      sourceSystem: dataset.sourceSystem,
      sourceType: dataset.sourceType,
      status: dataset.status,
      criticality: dataset.criticality,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
    },
    version: {
      id: version.id,
      versionNumber: version.versionNumber,
      originalFileName: version.originalFileName,
      fileFormat: version.fileFormat,
      rowCount,
      columnCount,
      processedAt: version.processedAt,
      ingestionStatus: version.ingestionStatus,
    },
    metrics: {
      rows: rowCount,
      columns: columnCount,
      quality: qualityRun?.qualityScore === null || typeof qualityRun?.qualityScore === 'undefined'
        ? null
        : Number(qualityRun.qualityScore),
      trust: trustScore ? Number(trustScore.overallScore) : null,
      value: valueScore ? Number(valueScore.overallScore) : null,
      valueAssessment,
      views: usageStats.viewCount,
      lastViewedAt: usageStats.lastViewedAt,
      sensitiveColumns,
    },
    qualityRun: qualityRun
      ? {
          id: qualityRun.id,
          status: qualityRun.status,
          qualityScore: qualityRun.qualityScore === null ? null : Number(qualityRun.qualityScore),
          totalChecks: qualityRun.totalChecks,
          passedChecks: qualityRun.passedChecks,
          failedChecks: qualityRun.failedChecks,
          warningChecks: qualityRun.warningChecks,
          startedAt: qualityRun.startedAt,
          finishedAt: qualityRun.finishedAt,
          notes: qualityRun.notes,
        }
      : null,
    columns,
  };
}

module.exports = {
  getDatasetDetails,
};
