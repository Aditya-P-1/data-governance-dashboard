const { getDatasetDetails } = require('../services/datasetDetails.service');

async function readDatasetDetails(req, res, next) {
  try {
    const metadata = await getDatasetDetails(req.params.datasetId);
    return res.success(metadata);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  readDatasetDetails,
};
