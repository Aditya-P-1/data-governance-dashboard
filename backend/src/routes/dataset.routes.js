const express = require('express');
const {
  createDatasetFromUpload,
  readDataset,
  discoverSchema,
} = require('../controllers/dataset.controller');
const { readDatasetDetails } = require('../controllers/datasetDetails.controller');
const {
  calculateValueScore,
  trackView,
} = require('../controllers/datasetValue.controller');
const { listDashboard } = require('../controllers/dashboard.controller');
const { requireUploadFile, upload } = require('../middlewares/upload.middleware');

const router = express.Router();

router.post('/upload', upload.single('file'), requireUploadFile, createDatasetFromUpload);
router.get('/dashboard', listDashboard);
router.get('/:datasetId/details', readDatasetDetails);
router.post('/:datasetId/read', readDataset);
router.post('/:datasetId/discover-schema', discoverSchema);
router.post('/:datasetId/track-view', trackView);
router.post('/:datasetId/calculate-value-score', calculateValueScore);

module.exports = router;
