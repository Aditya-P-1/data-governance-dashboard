const prisma = require('../config/prisma');
const { findDatasetsForDashboard } = require('../repositories/dataset.repository');

const SENSITIVE_LEVELS = new Set(['CONFIDENTIAL', 'RESTRICTED']);
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const VALID_SORT_FIELDS = new Set([
  'updatedAt',
  'createdAt',
  'name',
  'rows',
  'columns',
  'quality',
  'trust',
  'value',
  'views',
  'sensitiveColumns',
]);

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function normalizeSortOrder(value) {
  return String(value || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
}

function normalizeSortField(value) {
  const candidate = String(value || 'updatedAt');
  return VALID_SORT_FIELDS.has(candidate) ? candidate : 'updatedAt';
}

function toNumber(value, fallback = 0) {
  if (value === null || typeof value === 'undefined') {
    return fallback;
  }

  const numeric = Number(value);
  return Number.isNaN(numeric) ? fallback : numeric;
}

function toNullableNumber(value) {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function getLatestVersion(dataset) {
  return Array.isArray(dataset.versions) && dataset.versions.length > 0 ? dataset.versions[0] : null;
}

function getLatestClassification(column) {
  return Array.isArray(column?.classifications) && column.classifications.length > 0
    ? column.classifications[0]
    : null;
}

function getSensitiveColumnCount(columns) {
  return columns.reduce((count, column) => {
    const latestClassification = getLatestClassification(column);
    const level = latestClassification?.classificationLabel?.level;

    if (level && SENSITIVE_LEVELS.has(level)) {
      return count + 1;
    }

    return count;
  }, 0);
}

function getDatasetUsageStats(datasetId, usageMap) {
  return usageMap.get(datasetId) || {
    viewCount: 0,
    lastViewedAt: null,
  };
}

function compareNullableNumbers(left, right, direction) {
  const leftValue = left ?? -1;
  const rightValue = right ?? -1;

  if (leftValue === rightValue) {
    return 0;
  }

  return direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
}

function compareNullableDates(left, right, direction) {
  const leftValue = left ? new Date(left).getTime() : -1;
  const rightValue = right ? new Date(right).getTime() : -1;

  if (leftValue === rightValue) {
    return 0;
  }

  return direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
}

function buildDatasetRow(dataset, usageMap) {
  const version = getLatestVersion(dataset);
  const columns = version?.columns || [];
  const qualityRun = version?.qualityRuns?.[0] || null;
  const trustSnapshot = version?.trustScores?.[0] || null;
  const valueSnapshot = version?.valueScores?.[0] || null;
  const usageStats = getDatasetUsageStats(dataset.id, usageMap);

  const rows = toNumber(version?.rowCount, 0);
  const columnsCount = toNumber(version?.columnCount, columns.length);
  const sensitiveColumns = getSensitiveColumnCount(columns);

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
    version: version
      ? {
          id: version.id,
          versionNumber: version.versionNumber,
          rowCount: rows,
          columnCount: columnsCount,
          processedAt: version.processedAt,
          ingestionStatus: version.ingestionStatus,
        }
      : null,
    metrics: {
      rows,
      columns: columnsCount,
      quality: toNullableNumber(qualityRun?.qualityScore),
      trust: toNullableNumber(trustSnapshot?.overallScore),
      value: toNullableNumber(valueSnapshot?.overallScore),
      views: usageStats.viewCount,
      lastViewedAt: usageStats.lastViewedAt,
      sensitiveColumns,
    },
  };
}

function compareDashboardRows(left, right, sortField, sortOrder) {
  const direction = sortOrder === 'asc' ? 'asc' : 'desc';

  switch (sortField) {
    case 'name':
      return direction === 'asc'
        ? left.dataset.name.localeCompare(right.dataset.name)
        : right.dataset.name.localeCompare(left.dataset.name);
    case 'rows':
      return compareNullableNumbers(left.metrics.rows, right.metrics.rows, direction);
    case 'columns':
      return compareNullableNumbers(left.metrics.columns, right.metrics.columns, direction);
    case 'quality':
      return compareNullableNumbers(left.metrics.quality, right.metrics.quality, direction);
    case 'trust':
      return compareNullableNumbers(left.metrics.trust, right.metrics.trust, direction);
    case 'value':
      return compareNullableNumbers(left.metrics.value, right.metrics.value, direction);
    case 'views':
      return compareNullableNumbers(left.metrics.views, right.metrics.views, direction);
    case 'sensitiveColumns':
      return compareNullableNumbers(left.metrics.sensitiveColumns, right.metrics.sensitiveColumns, direction);
    case 'createdAt':
      return compareNullableDates(left.dataset.createdAt, right.dataset.createdAt, direction);
    case 'updatedAt':
    default:
      return compareNullableDates(left.dataset.updatedAt, right.dataset.updatedAt, direction);
  }
}

async function getDashboardDatasets(query = {}) {
  const search = String(query.search || '').trim();
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInteger(query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const sortBy = normalizeSortField(query.sortBy);
  const sortOrder = normalizeSortOrder(query.sortOrder);

  const datasets = await findDatasetsForDashboard({ search });
  const datasetIds = datasets.map(dataset => dataset.id);

  const usageSummary = datasetIds.length
    ? await prisma.usageEvent.groupBy({
        by: ['datasetId'],
        where: {
          datasetId: {
            in: datasetIds,
          },
          eventType: 'VIEW',
        },
        _count: {
          _all: true,
        },
        _max: {
          occurredAt: true,
        },
      })
    : [];

  const usageMap = new Map(
    usageSummary.map(row => [
      row.datasetId,
      {
        viewCount: row._count._all,
        lastViewedAt: row._max.occurredAt,
      },
    ]),
  );

  const rows = datasets.map(dataset => buildDatasetRow(dataset, usageMap));
  rows.sort((left, right) => compareDashboardRows(left, right, sortBy, sortOrder));

  const total = rows.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const offset = (currentPage - 1) * limit;
  const items = rows.slice(offset, offset + limit);

  const summary = rows.reduce(
    (accumulator, item) => {
      accumulator.rows += item.metrics.rows;
      accumulator.columns += item.metrics.columns;
      if (item.metrics.quality !== null) {
        accumulator.quality += item.metrics.quality;
        accumulator.qualityCount += 1;
      }
      if (item.metrics.trust !== null) {
        accumulator.trust += item.metrics.trust;
        accumulator.trustCount += 1;
      }
      if (item.metrics.value !== null) {
        accumulator.value += item.metrics.value;
        accumulator.valueCount += 1;
      }
      accumulator.views += item.metrics.views;
      accumulator.sensitiveColumns += item.metrics.sensitiveColumns;
      return accumulator;
    },
    {
      rows: 0,
      columns: 0,
      quality: 0,
      qualityCount: 0,
      trust: 0,
      trustCount: 0,
      value: 0,
      valueCount: 0,
      views: 0,
      sensitiveColumns: 0,
    },
  );

  return {
    items,
    pagination: {
      page: currentPage,
      limit,
      total,
      totalPages,
      sortBy,
      sortOrder,
      search,
    },
    summary: {
      datasets: total,
      rows: summary.rows,
      columns: summary.columns,
      quality: summary.qualityCount ? Number((summary.quality / summary.qualityCount).toFixed(2)) : null,
      trust: summary.trustCount ? Number((summary.trust / summary.trustCount).toFixed(2)) : null,
      value: summary.valueCount ? Number((summary.value / summary.valueCount).toFixed(2)) : null,
      views: summary.views,
      sensitiveColumns: summary.sensitiveColumns,
    },
  };
}

module.exports = {
  getDashboardDatasets,
};
