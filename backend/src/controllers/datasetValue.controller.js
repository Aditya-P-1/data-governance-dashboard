const {
  calculateDatasetValueScore,
  trackDatasetView,
} = require('../services/datasetValue.service');

async function trackView(req, res, next) {
  try {
    const result = await trackDatasetView(req.params.datasetId);
    return res.success(result, 201);
  } catch (error) {
    return next(error);
  }
}

async function calculateValueScore(req, res, next) {
  try {
    const result = await calculateDatasetValueScore(req.params.datasetId);
    return res.success(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  calculateValueScore,
  trackView,
};
