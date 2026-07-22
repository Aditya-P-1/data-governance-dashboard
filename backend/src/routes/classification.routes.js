const express = require('express');
const { classifyDataset, overrideClassification } = require('../controllers/classification.controller');
const validate = require('../middlewares/validate');
const { validateManualClassificationOverrideBody } = require('../validators/classification.validators');

const router = express.Router();

router.post('/:datasetId/classify', classifyDataset);
router.post(
  '/:datasetId/classifications/override',
  validate({ body: validateManualClassificationOverrideBody }),
  overrideClassification,
);

module.exports = router;
