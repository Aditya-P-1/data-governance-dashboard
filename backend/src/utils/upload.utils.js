const nodeCrypto = require('crypto');
const path = require('path');
const { allowedFileFormats } = require('../config/upload');

function getUploadFormat(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const mimeType = (file.mimetype || '').toLowerCase();

  for (const format of Object.values(allowedFileFormats)) {
    if (extension === format.extension || format.mimeTypes.has(mimeType)) {
      return format.prismaFormat;
    }
  }

  return null;
}

function buildDatasetName(originalFileName) {
  const baseName = path.parse(originalFileName).name || 'Dataset';

  return baseName
    .split(/[-_.]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildDatasetSlug(originalFileName) {
  const baseName = path
    .parse(originalFileName)
    .name.toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const suffix = nodeCrypto.randomBytes(4).toString('hex');

  return `${baseName || 'dataset'}-${suffix}`;
}

module.exports = {
  getUploadFormat,
  buildDatasetName,
  buildDatasetSlug,
};
