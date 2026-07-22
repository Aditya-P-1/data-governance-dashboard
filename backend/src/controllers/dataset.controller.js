const { uploadDataset } = require('../services/datasetUpload.service');
const { readUploadedDataset } = require('../services/datasetRead.service');

async function createDatasetFromUpload(req, res, next) {
  try {
    const metadata = await uploadDataset(req.file);
    return res.success(metadata, 201);
  } catch (error) {
    return next(error);
  }
}

async function readDataset(req, res, next) {
  try {
    const metadata = await readUploadedDataset(req.params.datasetId);
    return res.success(metadata);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createDatasetFromUpload,
  readDataset,
};
