const fs = require('fs/promises');
const AppError = require('../utils/AppError');
const { extractDatasetMatrix, parseWorkbookRows } = require('../utils/datasetRead.utils');
const { buildDiscoveredColumns } = require('../utils/schemaDiscovery.utils');
const { toJsonSafe } = require('../utils/json.utils');
const prisma = require('../config/prisma');
const { replaceDatasetMetadata } = require('../repositories/metadata.repository');
const { replaceDatasetColumns } = require('../repositories/datasetColumn.repository');
const { updateDatasetVersionParsing } = require('../repositories/datasetVersion.repository');
const { findDatasetWithLatestVersion } = require('../repositories/dataset.repository');

function buildSchemaMetadata({ headers, discoveredColumns, discoveredAt }) {
  return [
    {
      key: 'discovered_headers',
      scope: 'VERSION',
      valueType: 'JSON',
      valueJson: toJsonSafe(headers),
      source: 'SYSTEM',
    },
    {
      key: 'discovered_columns',
      scope: 'VERSION',
      valueType: 'JSON',
      valueJson: toJsonSafe(discoveredColumns),
      source: 'SYSTEM',
    },
    {
      key: 'schema_discovered_at',
      scope: 'VERSION',
      valueType: 'DATETIME',
      valueDateTime: discoveredAt,
      source: 'SYSTEM',
    },
  ];
}

async function discoverDatasetSchema(datasetId) {
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
  const discoveredAt = new Date();
  const discoveredColumns = buildDiscoveredColumns(headers, dataRows);
  const schemaMetadata = buildSchemaMetadata({
    headers,
    discoveredColumns,
    discoveredAt,
  });

  const parsedVersion = await prisma.$transaction(async transaction => {
    const storedColumns = await replaceDatasetColumns(transaction, version.id, discoveredColumns);

    await replaceDatasetMetadata({
      transaction,
      datasetId: dataset.id,
      datasetVersionId: version.id,
      datasetEntries: [],
      versionEntries: schemaMetadata,
    });

    const updatedVersion = await updateDatasetVersionParsing(transaction, version.id, {
      rowCount: BigInt(rowCount),
      columnCount,
      ingestionStatus: 'READY',
      processedAt: discoveredAt,
    });

    return {
      updatedVersion,
      storedColumns,
    };
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
      id: parsedVersion.updatedVersion.id,
      versionNumber: parsedVersion.updatedVersion.versionNumber,
      originalFileName: parsedVersion.updatedVersion.originalFileName,
      fileFormat: parsedVersion.updatedVersion.fileFormat,
      rowCount: Number(parsedVersion.updatedVersion.rowCount || 0),
      columnCount: parsedVersion.updatedVersion.columnCount || 0,
      ingestionStatus: parsedVersion.updatedVersion.ingestionStatus,
      processedAt: parsedVersion.updatedVersion.processedAt,
    },
    schema: {
      headers,
      rowCount,
      columnCount,
      columns: parsedVersion.storedColumns,
    },
  };
}

module.exports = {
  discoverDatasetSchema,
};
