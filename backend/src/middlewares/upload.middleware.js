const path = require('path');
const nodeCrypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');
const { uploadDirectory, allowedFileFormats } = require('../config/upload');

function detectAllowedFormat(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const mimeType = (file.mimetype || '').toLowerCase();

  return Object.values(allowedFileFormats).some(
    format => extension === format.extension || format.mimeTypes.has(mimeType),
  );
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDirectory);
  },
  filename(req, file, cb) {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const uniqueSuffix = `${Date.now()}-${nodeCrypto.randomUUID()}`;
    cb(null, `${uniqueSuffix}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter(req, file, cb) {
    if (!detectAllowedFormat(file)) {
      return cb(new AppError('Only CSV and Excel (.xlsx) files are supported', 400));
    }

    return cb(null, true);
  },
});

function requireUploadFile(req, res, next) {
  if (!req.file) {
    return next(new AppError('A CSV or Excel file is required', 400));
  }

  return next();
}

module.exports = {
  upload,
  requireUploadFile,
};
