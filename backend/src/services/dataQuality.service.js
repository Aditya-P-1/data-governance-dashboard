const fs = require('fs/promises');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { parseWorkbookRows, extractDatasetMatrix } = require('../utils/datasetRead.utils');
const { buildQualityIssueDetails, buildQualitySummary, calculateIssueStatus, calculateSeverity } = require('../utils/quality.utils');
const { findDatasetWithLatestVersion } = require('../repositories/dataset.repository');
const {
  createQualityIssues,
  createQualityRun,
  ensureQualityRules,
  updateQualityRun,
} = require('../repositories/quality.repository');

function buildIssuePayload({
  rule,
  qualityRunId,
  datasetColumnId,
  status,
  severity,
  message,
  observedValue,
  expectedValue,
  affectedRows,
  detailsJson,
}) {
  return {
    qualityRunId,
    qualityRuleId: rule.id,
    datasetColumnId: datasetColumnId || null,
    status,
    severity,
    message,
    observedValue: observedValue || null,
    expectedValue: expectedValue || null,
    affectedRows: typeof affectedRows === 'undefined' ? null : affectedRows,
    detailsJson,
  };
}

function toResponseIssue(issue) {
  return {
    id: issue.id,
    ruleCode: issue.qualityRule.code,
    ruleName: issue.qualityRule.name,
    status: issue.status,
    severity: issue.severity,
    message: issue.message,
    observedValue: issue.observedValue,
    expectedValue: issue.expectedValue,
    affectedRows: issue.affectedRows === null ? null : Number(issue.affectedRows),
    datasetColumnId: issue.datasetColumnId,
    details: issue.detailsJson,
  };
}

function buildMetricIssues(summary, rules) {
  const missingRate = summary.missingRate;
  const duplicateRate = summary.duplicateRate;
  const invalidRate = summary.invalidRate;

  const missingStatus = calculateIssueStatus(missingRate, { warn: 0.01, fail: 0.1 });
  const duplicateStatus = calculateIssueStatus(duplicateRate, { warn: 0.01, fail: 0.05 });
  const invalidStatus = calculateIssueStatus(invalidRate, { warn: 0.01, fail: 0.05 });

  const missingSeverity = calculateSeverity(missingRate, { warn: 0.01, fail: 0.1 });
  const duplicateSeverity = calculateSeverity(duplicateRate, { warn: 0.01, fail: 0.05 });
  const invalidSeverity = calculateSeverity(invalidRate, { warn: 0.01, fail: 0.05 });

  return [
    buildIssuePayload({
      rule: rules.MISSING_VALUES,
      qualityRunId: null,
      status: missingStatus,
      severity: missingSeverity,
      message: `${summary.missingCells} missing cells found across ${summary.totalRows} rows and ${summary.totalColumns} columns.`,
      observedValue: String(summary.missingCells),
      expectedValue: '0 missing cells',
      affectedRows: summary.missingCells,
      detailsJson: {
        rate: summary.missingRate,
        columns: summary.columnStats
          .filter(column => column.missingCount > 0)
          .map(column => ({
            columnId: column.columnId,
            name: column.name,
            missingCount: column.missingCount,
          })),
      },
    }),
    buildIssuePayload({
      rule: rules.DUPLICATE_ROWS,
      qualityRunId: null,
      status: duplicateStatus,
      severity: duplicateSeverity,
      message: `${summary.duplicateRows} duplicate rows found.`,
      observedValue: String(summary.duplicateRows),
      expectedValue: '0 duplicate rows',
      affectedRows: summary.duplicateRows,
      detailsJson: {
        rate: summary.duplicateRate,
        duplicateGroups: summary.duplicateGroups.slice(0, 20),
      },
    }),
    buildIssuePayload({
      rule: rules.INVALID_VALUES,
      qualityRunId: null,
      status: invalidStatus,
      severity: invalidSeverity,
      message: `${summary.invalidCells} invalid values found.`,
      observedValue: String(summary.invalidCells),
      expectedValue: '0 invalid values',
      affectedRows: summary.invalidCells,
      detailsJson: {
        rate: summary.invalidRate,
        columns: summary.columnStats
          .filter(column => column.invalidCount > 0)
          .map(column => ({
            columnId: column.columnId,
            name: column.name,
            normalizedName: column.normalizedName,
            dataType: column.dataType,
            classificationLabelCode: column.classificationLabelCode,
            invalidCount: column.invalidCount,
            sampleInvalidValues: column.sampleInvalidValues,
          })),
      },
    }),
  ];
}

async function analyzeDatasetQuality(datasetId) {
  const dataset = await findDatasetWithLatestVersion(datasetId);

  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  const version = dataset.versions[0];

  if (!version) {
    throw new AppError('Dataset version not found', 404);
  }

  if (!Array.isArray(version.columns) || version.columns.length === 0) {
    throw new AppError('Run schema discovery before analyzing quality', 409);
  }

  try {
    await fs.access(version.storagePath);
  } catch {
    throw new AppError('Uploaded file is no longer available on disk', 404);
  }

  const rows = parseWorkbookRows(version.storagePath);
  const { headers, dataRows } = extractDatasetMatrix(rows);

  if (!dataRows.length) {
    throw new AppError('Dataset does not contain any data rows to analyze', 400);
  }

  const startedAt = new Date();

  const result = await prisma.$transaction(async transaction => {
    const rules = await ensureQualityRules(transaction);
    const summary = buildQualitySummary({
      headers,
      dataRows,
      columns: version.columns,
    });

    const issues = buildMetricIssues(summary, rules).map(issue => ({
      ...issue,
      qualityRunId: null,
    }));

    const qualityRun = await createQualityRun(transaction, {
      datasetId: dataset.id,
      datasetVersionId: version.id,
      status: 'RUNNING',
      startedAt,
      totalChecks: issues.length,
      passedChecks: 0,
      failedChecks: 0,
      warningChecks: 0,
      qualityScore: summary.qualityScore,
    });

    const issuesWithRunId = issues.map(issue => ({
      ...issue,
      qualityRunId: qualityRun.id,
    }));

    const storedIssues = await createQualityIssues(transaction, issuesWithRunId);

    const passedChecks = storedIssues.filter(issue => issue.status === 'PASS').length;
    const warningChecks = storedIssues.filter(issue => issue.status === 'WARN').length;
    const failedChecks = storedIssues.filter(issue => issue.status === 'FAIL').length;

    const finishedAt = new Date();
    const completedRun = await updateQualityRun(transaction, qualityRun.id, {
      status: failedChecks > 0 ? 'COMPLETED' : 'COMPLETED',
      finishedAt,
      totalChecks: storedIssues.length,
      passedChecks,
      warningChecks,
      failedChecks,
      qualityScore: summary.qualityScore,
      notes: `Quality analysis completed with ${summary.missingCells} missing cells, ${summary.duplicateRows} duplicate rows, and ${summary.invalidCells} invalid values.`,
    });

    return {
      qualityRun: completedRun,
      issues: storedIssues,
      summary,
    };
  });

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
    quality: {
      run: {
        id: result.qualityRun.id,
        status: result.qualityRun.status,
        totalChecks: result.qualityRun.totalChecks,
        passedChecks: result.qualityRun.passedChecks,
        warningChecks: result.qualityRun.warningChecks,
        failedChecks: result.qualityRun.failedChecks,
        qualityScore: result.qualityRun.qualityScore === null ? null : Number(result.qualityRun.qualityScore),
        startedAt: result.qualityRun.startedAt,
        finishedAt: result.qualityRun.finishedAt,
        notes: result.qualityRun.notes,
      },
      summary: buildQualityIssueDetails(result.summary),
      issues: result.issues.map(toResponseIssue),
    },
  };
}

module.exports = {
  analyzeDatasetQuality,
};
