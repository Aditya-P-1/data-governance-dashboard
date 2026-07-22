const { analyzeDatasetQuality } = require('../services/dataQuality.service');

async function analyzeQuality(req, res, next) {
  try {
    const result = await analyzeDatasetQuality(req.params.datasetId);
    return res.success(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  analyzeQuality,
};
