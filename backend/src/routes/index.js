const express = require('express');
const healthRoutes = require('./health.routes');
const datasetRoutes = require('./dataset.routes');
const classificationRoutes = require('./classification.routes');
const dataQualityRoutes = require('./dataQuality.routes');
const trustScoreRoutes = require('./trustScore.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/datasets', datasetRoutes);
router.use('/datasets', classificationRoutes);
router.use('/datasets', dataQualityRoutes);
router.use('/datasets', trustScoreRoutes);

module.exports = router;
