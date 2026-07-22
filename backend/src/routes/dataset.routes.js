const express = require('express');
const { createDatasetFromUpload } = require('../controllers/dataset.controller');
const { requireUploadFile, upload } = require('../middlewares/upload.middleware');

const router = express.Router();

router.post('/upload', upload.single('file'), requireUploadFile, createDatasetFromUpload);

module.exports = router;
