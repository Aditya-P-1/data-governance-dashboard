const fs = require('fs/promises');
const { Prisma } = require('@prisma/client');
const AppError = require('../utils/AppError');
const {
  extractDatasetMatrix,
  parseWorkbookRows,
} = require('../utils/datasetRead.utils');
const prisma = require('../config/prisma');
const { replaceDatasetMetadata } = require('../repositories/metadata.repository');
const {
  findDatasetWithLatestVersion,
} = require('../repositories/dataset.repository');
const {
  updateDatasetVersionParsing,
} = require('../repositories/datasetVersion.repository');

function buildVersionMetadata({ headers, dataRows, rowCount, columnCount, parsedAt }) {
  return [
    {
      key: 'headers',
      scope: 'VERSION',
      valueType: 'JSON',
      valueJson: headers,
      source: 'SYSTEM',
    },
    {
      key: 'row_count',
      scope: 'VERSION',
      valueType: 'NUMBER',
      valueNumber: new Prisma.Decimal(rowCount),
      source: 'SYSTEM',
    },
    {
      key: 'column_count',
      scope: 'VERSION',
      valueType: 'NUMBER',
      valueNumber: new Prisma.Decimal(columnCount),
      source: 'SYSTEM',
    },
    {
      key: 'rows_preview',
      scope: 'VERSION',
      valueType: 'JSON',
      valueJson: dataRows.slice(0, 10),
      source: 'SYSTEM',
    },
    {
      key: 'parsed_at',
      scope: 'VERSION',
      valueType: 'DATETIME',
      valueDateTime: parsedAt,
      source: 'SYSTEM',
    },
  ];
}

function buildDatasetMetadata({ originalFileName, uploadedAt, fileFormat, fileSizeBytes }) {
  return [
    {
      key: 'source_file_name',
      scope: 'DATASET',
      valueType: 'TEXT',
      valueText: originalFileName,
      source: 'SYSTEM',
    },
    {
      key: 'upload_timestamp',
      scope: 'DATASET',
      valueType: 'DATETIME',
      valueDateTime: uploadedAt,
      source: 'SYSTEM',
    },
    {
      key: 'file_format',
      scope: 'DATASET',
      valueType: 'TEXT',
      valueText: fileFormat,
      source: 'SYSTEM',
    },
    {
      key: 'file_size_bytes',
      scope: 'DATASET',
      valueType: 'NUMBER',
      valueNumber: new Prisma.Decimal(String(fileSizeBytes)),
      source: 'SYSTEM',
    },
  ];
}

async function readUploadedDataset(datasetId) {
  const dataset = await findDatasetWithLatestVersion(datasetId);

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
  const { headers, dataRows, rowCount, columnCount } = extractDatasetMatrix(rows);
  const parsedAt = new Date();

  const datasetMetadata = buildDatasetMetadata({
    originalFileName: version.originalFileName,
    uploadedAt: version.createdAt,
    fileFormat: version.fileFormat,
    fileSizeBytes: version.fileSizeBytes,
  });
  const versionMetadata = buildVersionMetadata({
    headers,
    dataRows,
    rowCount,
    columnCount,
    parsedAt,
  });

  const parsedVersion = await prisma.$transaction(async transaction => {
    await replaceDatasetMetadata({
      transaction,
      datasetId: dataset.id,
      datasetVersionId: version.id,
      datasetEntries: datasetMetadata,
      versionEntries: versionMetadata,
    });

    return updateDatasetVersionParsing(transaction, version.id, {
      rowCount: BigInt(rowCount),
      columnCount,
      ingestionStatus: 'READY',
      processedAt: parsedAt,
    });
  });

  return {
    dataset: {
      id: dataset.id,
      slug: dataset.slug,
      name: dataset.name,
      status: dataset.status,
      sourceType: dataset.sourceType,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
    },
    version: {
      id: parsedVersion.id,
      versionNumber: parsedVersion.versionNumber,
      originalFileName: parsedVersion.originalFileName,
      fileFormat: parsedVersion.fileFormat,
      rowCount: Number(parsedVersion.rowCount || 0),
      columnCount: parsedVersion.columnCount || 0,
      ingestionStatus: parsedVersion.ingestionStatus,
      processedAt: parsedVersion.processedAt,
    },
    parsing: {
      headers,
      rows: dataRows,
      rowCount,
      columnCount,
    },
  };
}

module.exports = {
  readUploadedDataset,
};
