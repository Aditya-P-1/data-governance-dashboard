const fs = require('fs');
const path = require('path');

const uploadDirectory = path.join(__dirname, '..', '..', 'tmp', 'uploads');

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedFileFormats = {
  csv: {
    extension: '.csv',
    mimeTypes: new Set(['text/csv', 'application/csv', 'text/plain']),
    prismaFormat: 'CSV',
  },
  xlsx: {
    extension: '.xlsx',
    mimeTypes: new Set([
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]),
    prismaFormat: 'XLSX',
  },
};

module.exports = {
  uploadDirectory,
  allowedFileFormats,
};
