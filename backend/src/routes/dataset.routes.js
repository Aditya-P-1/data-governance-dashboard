const express = require('express');
const {
  createDatasetFromUpload,
  readDataset,
  discoverSchema,
} = require('../controllers/dataset.controller');
const { requireUploadFile, upload } = require('../middlewares/upload.middleware');

const router = express.Router();

router.post('/upload', upload.single('file'), requireUploadFile, createDatasetFromUpload);
router.post('/:datasetId/read', readDataset);
router.post('/:datasetId/discover-schema', discoverSchema);

module.exports = router;
