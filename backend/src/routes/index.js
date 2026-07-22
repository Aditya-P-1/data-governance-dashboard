const express = require('express');
const healthRoutes = require('./health.routes');
const datasetRoutes = require('./dataset.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/datasets', datasetRoutes);

module.exports = router;
