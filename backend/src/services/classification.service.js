const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { findDatasetWithLatestVersion } = require('../repositories/dataset.repository');
const {
  createColumnClassification,
  deleteColumnClassifications,
  ensureClassificationLabels,
} = require('../repositories/classification.repository');
const { classifyColumn } = require('../utils/classification.utils');

function toNumberConfidence(score) {
  return Number(new Prisma.Decimal(score).toFixed(2));
}

function buildColumnResponse(column, classificationResult, assignment) {
  return {
    column: {
      id: column.id,
      ordinal: column.ordinal,
      name: column.name,
      normalizedName: column.normalizedName,
      dataType: column.dataType,
    },
    classification: classificationResult
      ? {
          code: classificationResult.code,
          name: classificationResult.name,
          level: classificationResult.level,
          score: classificationResult.score,
          threshold: classificationResult.threshold,
          rationale: classificationResult.rationale,
        }
      : null,
    assignment: assignment
      ? {
          id: assignment.id,
          source: assignment.source,
          scope: assignment.scope,
          confidence: assignment.confidence === null ? null : Number(assignment.confidence),
          rationale: assignment.rationale,
          appliedAt: assignment.appliedAt,
          label: assignment.classificationLabel
            ? {
                id: assignment.classificationLabel.id,
                code: assignment.classificationLabel.code,
                name: assignment.classificationLabel.name,
                level: assignment.classificationLabel.level,
              }
            : null,
        }
      : null,
  };
}

async function classifyDatasetColumns(datasetId) {
  const dataset = await findDatasetWithLatestVersion(datasetId);

  if (!dataset) {
    throw new AppError('Dataset not found', 404);
  }

  const version = dataset.versions[0];

  if (!version) {
    throw new AppError('Dataset version not found', 404);
  }

  if (!Array.isArray(version.columns) || version.columns.length === 0) {
    throw new AppError('Run schema discovery before classifying sensitive data', 409);
  }

  const classifiedAt = new Date();

  const result = await prisma.$transaction(async transaction => {
    const labelsByCode = await ensureClassificationLabels(transaction);
    const classifiedColumns = [];
    const unclassifiedColumns = [];

    for (const column of version.columns) {
      const classificationResult = classifyColumn(column);

      await deleteColumnClassifications(transaction, {
        datasetId: dataset.id,
        datasetVersionId: version.id,
        datasetColumnId: column.id,
        source: 'RULE_BASED',
      });

      if (!classificationResult.bestMatch) {
        unclassifiedColumns.push(buildColumnResponse(column, null, null));
        continue;
      }

      const matchedLabel = labelsByCode[classificationResult.bestMatch.code];

      const assignment = await createColumnClassification(transaction, {
        classificationLabelId: matchedLabel.id,
        datasetId: dataset.id,
        datasetVersionId: version.id,
        datasetColumnId: column.id,
        scope: 'COLUMN',
        source: 'RULE_BASED',
        confidence: toNumberConfidence(classificationResult.bestMatch.score),
        rationale: classificationResult.bestMatch.rationale,
      });

      classifiedColumns.push(buildColumnResponse(column, classificationResult.bestMatch, assignment));
    }

    return {
      classifiedColumns,
      unclassifiedColumns,
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
      processedAt: classifiedAt,
    },
    classification: {
      classifiedCount: result.classifiedColumns.length,
      unclassifiedCount: result.unclassifiedColumns.length,
      classifiedColumns: result.classifiedColumns,
      unclassifiedColumns: result.unclassifiedColumns,
    },
  };
}

async function overrideColumnClassification(datasetId, body) {
  const { datasetColumnId, classificationLabelCode, rationale, confidence, appliedByUserId } = body;

  const column = await prisma.datasetColumn.findFirst({
    where: {
      id: datasetColumnId,
      datasetVersion: {
        datasetId,
      },
    },
    include: {
      datasetVersion: true,
    },
  });

  if (!column) {
    throw new AppError('Dataset column not found', 404);
  }

  const result = await prisma.$transaction(async transaction => {
    const labelsByCode = await ensureClassificationLabels(transaction);
    const matchedLabel = labelsByCode[classificationLabelCode];

    if (!matchedLabel) {
      throw new AppError('Classification label not found', 404);
    }

    await deleteColumnClassifications(transaction, {
      datasetId,
      datasetVersionId: column.datasetVersionId,
      datasetColumnId: column.id,
      source: 'MANUAL',
    });

    const assignment = await createColumnClassification(transaction, {
      classificationLabelId: matchedLabel.id,
      datasetId,
      datasetVersionId: column.datasetVersionId,
      datasetColumnId: column.id,
      scope: 'COLUMN',
      source: 'MANUAL',
      confidence: typeof confidence === 'undefined' ? null : confidence,
      rationale: rationale || null,
      appliedByUserId: appliedByUserId || null,
    });

    return {
      column,
      assignment,
      label: matchedLabel,
    };
  });

  return buildColumnResponse(
    result.column,
    {
      code: result.label.code,
      name: result.label.name,
      level: result.label.level,
      score: result.assignment.confidence === null ? null : Number(result.assignment.confidence),
      threshold: null,
      rationale: result.assignment.rationale || 'Manual override applied.',
    },
    result.assignment,
  );
}

module.exports = {
  classifyDatasetColumns,
  overrideColumnClassification,
};
