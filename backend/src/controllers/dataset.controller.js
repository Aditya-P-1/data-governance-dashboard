const { uploadDataset } = require('../services/datasetUpload.service');

async function createDatasetFromUpload(req, res, next) {
  try {
    const metadata = await uploadDataset(req.file);
    return res.success(metadata, 201);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createDatasetFromUpload,
};
