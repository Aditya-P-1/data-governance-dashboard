const {
  classifyDatasetColumns,
  overrideColumnClassification,
} = require('../services/classification.service');

async function classifyDataset(req, res, next) {
  try {
    const result = await classifyDatasetColumns(req.params.datasetId);
    return res.success(result);
  } catch (error) {
    return next(error);
  }
}

async function overrideClassification(req, res, next) {
  try {
    const result = await overrideColumnClassification(req.params.datasetId, req.body);
    return res.success(result, 201);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  classifyDataset,
  overrideClassification,
};
