const fs = require('fs/promises');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { buildDatasetName, buildDatasetSlug, getUploadFormat } = require('../utils/upload.utils');
const { getOrCreateSystemUser } = require('../repositories/user.repository');
const { createDatasetWithVersion } = require('../repositories/dataset.repository');
const { readUploadedDataset } = require('./datasetRead.service');
const { discoverDatasetSchema } = require('./datasetSchema.service');
const { classifyDatasetColumns } = require('./classification.service');
const { analyzeDatasetQuality } = require('./dataQuality.service');
const { calculateDatasetTrustScore } = require('./trustScore.service');
const { calculateDatasetValueScore } = require('./datasetValue.service');

async function removeTempFile(filePath) {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to clean up temporary upload file', error);
    }
  }
}

async function uploadDataset(file) {
  if (!file) {
    throw new AppError('Upload file is required', 400);
  }

  const fileFormat = getUploadFormat(file);

  if (!fileFormat) {
    throw new AppError('Only CSV and Excel (.xlsx) files are supported', 400);
  }

  const originalFileName = file.originalname;
  const datasetName = buildDatasetName(originalFileName);
  const datasetSlug = buildDatasetSlug(originalFileName);
  const systemUser = await getOrCreateSystemUser();
  let createdDatasetId = null;

  try {
    const { dataset, version } = await createDatasetWithVersion({
      datasetData: {
        name: datasetName,
        slug: datasetSlug,
        sourceType: 'FILE_IMPORT',
        status: 'DRAFT',
        criticality: 'MEDIUM',
        ownerUserId: systemUser.id,
        sourceSystem: 'FILE_UPLOAD',
      },
      versionData: {
        versionNumber: 1,
        originalFileName,
        storageProvider: 'LOCAL',
        storagePath: file.path,
        fileFormat,
        mimeType: file.mimetype,
        fileSizeBytes: BigInt(file.size),
        ingestionStatus: 'RECEIVED',
        uploadedByUserId: systemUser.id,
      },
    });
    createdDatasetId = dataset.id;

    const readResult = await readUploadedDataset(dataset.id);
    const schemaResult = await discoverDatasetSchema(dataset.id);
    const classificationResult = await classifyDatasetColumns(dataset.id);
    const qualityResult = await analyzeDatasetQuality(dataset.id);
    const trustResult = await calculateDatasetTrustScore(dataset.id);
    const valueResult = await calculateDatasetValueScore(dataset.id);

    const activatedDataset = await prisma.dataset.update({
      where: {
        id: dataset.id,
      },
      data: {
        status: 'ACTIVE',
      },
    });

    return {
      dataset: {
        id: activatedDataset.id,
        slug: activatedDataset.slug,
        name: activatedDataset.name,
        status: activatedDataset.status,
        sourceType: activatedDataset.sourceType,
        createdAt: activatedDataset.createdAt,
        updatedAt: activatedDataset.updatedAt,
      },
      upload: {
        versionId: schemaResult.version.id,
        versionNumber: schemaResult.version.versionNumber,
        fileName: schemaResult.version.originalFileName,
        fileSizeBytes: Number(version.fileSizeBytes),
        uploadedAt: version.createdAt,
        storagePath: version.storagePath,
        fileFormat: schemaResult.version.fileFormat,
        ingestionStatus: schemaResult.version.ingestionStatus,
        rowCount: schemaResult.version.rowCount,
        columnCount: schemaResult.version.columnCount,
        processedAt: schemaResult.version.processedAt,
      },
      processing: {
        read: {
          rowCount: readResult.parsing.rowCount,
          columnCount: readResult.parsing.columnCount,
        },
        schema: {
          columnCount: schemaResult.schema.columnCount,
          discoveredColumns: schemaResult.schema.columns.length,
        },
        classification: {
          classifiedCount: classificationResult.classification.classifiedCount,
          unclassifiedCount: classificationResult.classification.unclassifiedCount,
        },
        quality: {
          qualityScore: qualityResult.quality.run.qualityScore,
          totalChecks: qualityResult.quality.run.totalChecks,
        },
        trust: {
          trustScore: trustResult.trustScore.snapshot.overallScore,
        },
        value: {
          valueScore: valueResult.valueScore.snapshot.overallScore,
          viewCount: valueResult.usage.viewCount,
        },
      },
    };
  } catch (error) {
    if (createdDatasetId) {
      await prisma.dataset.update({
        where: {
          id: createdDatasetId,
        },
        data: {
          status: 'FAILED',
          versions: {
            updateMany: {
              where: {
                datasetId: createdDatasetId,
              },
              data: {
                ingestionStatus: 'FAILED',
              },
            },
          },
        },
      });
    }
    await removeTempFile(file.path);
    throw error;
  }
}

module.exports = {
  uploadDataset,
};
