const { calculateDatasetTrustScore } = require('../services/trustScore.service');

async function calculateTrustScore(req, res, next) {
  try {
    const result = await calculateDatasetTrustScore(req.params.datasetId);
    return res.success(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  calculateTrustScore,
};
