const express = require('express');
const {
  createDatasetFromUpload,
  readDataset,
} = require('../controllers/dataset.controller');
const { requireUploadFile, upload } = require('../middlewares/upload.middleware');

const router = express.Router();

router.post('/upload', upload.single('file'), requireUploadFile, createDatasetFromUpload);
router.post('/:datasetId/read', readDataset);

module.exports = router;
