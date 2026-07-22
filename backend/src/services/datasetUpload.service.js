const fs = require('fs/promises');
const AppError = require('../utils/AppError');
const { buildDatasetName, buildDatasetSlug, getUploadFormat } = require('../utils/upload.utils');
const { getOrCreateSystemUser } = require('../repositories/user.repository');
const { createDatasetWithVersion } = require('../repositories/dataset.repository');

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
      upload: {
        versionId: version.id,
        versionNumber: version.versionNumber,
        fileName: version.originalFileName,
        fileSizeBytes: Number(version.fileSizeBytes),
        uploadedAt: version.createdAt,
        storagePath: version.storagePath,
        fileFormat: version.fileFormat,
        ingestionStatus: version.ingestionStatus,
      },
    };
  } catch (error) {
    await removeTempFile(file.path);
    throw error;
  }
}

module.exports = {
  uploadDataset,
};
