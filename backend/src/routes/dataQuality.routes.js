const express = require('express');
const { analyzeQuality } = require('../controllers/dataQuality.controller');

const router = express.Router();

router.post('/:datasetId/analyze-quality', analyzeQuality);

module.exports = router;
