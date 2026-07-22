const express = require('express');
const { calculateTrustScore } = require('../controllers/trustScore.controller');

const router = express.Router();

router.post('/:datasetId/calculate-trust-score', calculateTrustScore);

module.exports = router;
