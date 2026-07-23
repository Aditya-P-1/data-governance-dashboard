const fs = require('fs/promises');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { parseWorkbookRows, extractDatasetMatrix } = require('../utils/datasetRead.utils');
const { calculateValueScore, getCriticalityScore } = require('../utils/valueScore.utils');
const { findDatasetWithLatestVersionValueContext } = require('../repositories/dataset.repository');
const { createDataValueSnapshot } = require('../repositories/value.repository');
const {
  createUsageEvent,
  getDatasetViewStats,
  getOrCreateSystemConsumer,
} = require('../repositories/usage.repository');

function getLatestTrustScore(version) {
  return Array.isArray(version?.trustScores) && version.trustScores.length > 0 ? version.trustScores[0] : null;
}

function buildValueResponse({
  dataset,
  version,
  usageStats,
  snapshot,
  valueBreakdown,
  trackedEvent = null,
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
    usage: {
      viewCount: usageStats.viewCount,
      lastViewedAt: usageStats.lastViewedAt,
      viewsLast30Days: usageStats.viewsLast30Days,
      accessFrequencyPerDay: usageStats.accessFrequencyPerDay,
      firstViewedAt: usageStats.firstViewedAt,
      trackedEvent,
    },
    valueScore: {
      snapshot: {
        id: snapshot.id,
        overallScore: Number(snapshot.overallScore),
        qualityScore: Number(snapshot.qualityScore),
        businessCriticalityScore: Number(snapshot.businessCriticalityScore),
        freshnessScore: Number(snapshot.freshnessScore),
        usageScore: Number(snapshot.usageScore),
        formulaVersion: snapshot.formulaVersion,
        calculatedAt: snapshot.calculatedAt,
      },
      inputs: valueBreakdown,
      assessment: valueBreakdown.assessment,
    },
  };
}

async function calculateAndStoreValueScore(transaction, dataset, version, usageStats) {
  const latestTrustScore = getLatestTrustScore(version);
  const qualityScore = latestTrustScore ? Number(latestTrustScore.overallScore) : 0;
  const businessCriticalityScore = getCriticalityScore(dataset.criticality);
  const valueBreakdown = calculateValueScore({
    viewCount: usageStats.viewCount,
    lastViewedAt: usageStats.lastViewedAt,
    viewsLast30Days: usageStats.viewsLast30Days,
  });

  const calculatedAt = new Date();

  const snapshot = await createDataValueSnapshot(transaction, {
    datasetId: dataset.id,
    datasetVersionId: version.id,
    overallScore: valueBreakdown.overallScore,
    businessCriticalityScore,
    qualityScore,
    freshnessScore: valueBreakdown.freshnessScore,
    usageScore: valueBreakdown.usageScore,
    formulaVersion: 'value_v1',
    calculatedAt,
  });

  return {
    snapshot,
    valueBreakdown: {
      ...valueBreakdown,
      qualityScore,
      businessCriticalityScore,
      latestTrustScore: latestTrustScore ? Number(latestTrustScore.overallScore) : null,
    },
  };
}

async function calculateDatasetValueScore(datasetId) {
  const dataset = await findDatasetWithLatestVersionValueContext(datasetId);

  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  const version = dataset.versions[0];

  if (!version) {
    throw new AppError('Dataset version not found', 404);
  }

  try {
    await fs.access(version.storagePath);
  } catch {
    throw new AppError('Uploaded file is no longer available on disk', 404);
  }

  const rows = parseWorkbookRows(version.storagePath);
  extractDatasetMatrix(rows);

  const usageStats = await getDatasetViewStats(prisma, dataset.id);

  const { snapshot, valueBreakdown } = await prisma.$transaction(async transaction =>
    calculateAndStoreValueScore(transaction, dataset, version, usageStats),
  );

  return buildValueResponse({
    dataset,
    version,
    usageStats,
    snapshot,
    valueBreakdown,
  });
}

async function trackDatasetView(datasetId) {
  const dataset = await findDatasetWithLatestVersionValueContext(datasetId);

  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  const version = dataset.versions[0];

  if (!version) {
    throw new AppError('Dataset version not found', 404);
  }

  try {
    await fs.access(version.storagePath);
  } catch {
    throw new AppError('Uploaded file is no longer available on disk', 404);
  }

  const trackedAt = new Date();

  const result = await prisma.$transaction(async transaction => {
    const consumer = await getOrCreateSystemConsumer(transaction);

    const trackedEvent = await createUsageEvent(transaction, {
      datasetId: dataset.id,
      datasetVersionId: version.id,
      consumerId: consumer.id,
      eventType: 'VIEW',
      occurredAt: trackedAt,
    });

    const usageStats = await getDatasetViewStats(transaction, dataset.id, trackedAt);
    const { snapshot, valueBreakdown } = await calculateAndStoreValueScore(
      transaction,
      dataset,
      version,
      usageStats,
    );

    return {
      trackedEvent,
      usageStats,
      snapshot,
      valueBreakdown,
    };
  });

  return buildValueResponse({
    dataset,
    version,
    usageStats: result.usageStats,
    snapshot: result.snapshot,
    valueBreakdown: result.valueBreakdown,
    trackedEvent: {
      id: result.trackedEvent.id,
      eventType: result.trackedEvent.eventType,
      occurredAt: result.trackedEvent.occurredAt,
    },
  });
}

module.exports = {
  calculateDatasetValueScore,
  trackDatasetView,
};
