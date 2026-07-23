const path = require('path');
const fs = require('fs/promises');
const request = require('supertest');
const prisma = require('../src/config/prisma');
const { uploadDirectory } = require('../src/config/upload');

const mockUploadDataset = jest.fn();

jest.mock('../src/services/datasetUpload.service', () => ({
  uploadDataset: (...args) => mockUploadDataset(...args),
}));

const app = require('../src/app');

async function cleanupUploadDirectory() {
  const entries = await fs.readdir(uploadDirectory).catch(error => {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  });

  await Promise.all(
    entries.map(entry =>
      fs.unlink(path.join(uploadDirectory, entry)).catch(error => {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }),
    ),
  );
}

describe('POST /datasets/upload', () => {
  afterEach(async () => {
    mockUploadDataset.mockReset();
    await cleanupUploadDirectory();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('accepts a CSV file and returns the created dataset metadata', async () => {
    mockUploadDataset.mockResolvedValue({
      dataset: {
        id: 'dataset_123',
        slug: 'sales_2026_csv',
        name: 'Sales 2026',
        status: 'ACTIVE',
        sourceType: 'FILE_IMPORT',
        createdAt: '2026-07-23T10:00:00.000Z',
        updatedAt: '2026-07-23T10:00:00.000Z',
      },
      upload: {
        versionId: 'version_123',
        versionNumber: 1,
        fileName: 'sales.csv',
        fileSizeBytes: 31,
        uploadedAt: '2026-07-23T10:00:00.000Z',
        storagePath: '/tmp/uploads/sales.csv',
        fileFormat: 'CSV',
        ingestionStatus: 'READY',
        rowCount: 1,
        columnCount: 2,
        processedAt: '2026-07-23T10:01:00.000Z',
      },
      processing: {
        read: {
          rowCount: 1,
          columnCount: 2,
        },
        schema: {
          columnCount: 2,
          discoveredColumns: 2,
        },
        classification: {
          classifiedCount: 1,
          unclassifiedCount: 1,
        },
        quality: {
          qualityScore: 92.5,
          totalChecks: 3,
        },
        trust: {
          trustScore: 88.2,
        },
        value: {
          valueScore: 41.7,
          viewCount: 0,
        },
      },
    });

    const response = await request(app)
      .post('/datasets/upload')
      .attach('file', Buffer.from('email,age\nalice@example.com,33\n'), {
        filename: 'sales.csv',
        contentType: 'text/csv',
      })
      .expect(201);

    expect(mockUploadDataset).toHaveBeenCalledTimes(1);
    expect(mockUploadDataset.mock.calls[0][0]).toMatchObject({
      originalname: 'sales.csv',
      mimetype: 'text/csv',
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        dataset: {
          id: 'dataset_123',
          slug: 'sales_2026_csv',
          status: 'ACTIVE',
        },
        upload: {
          fileName: 'sales.csv',
          fileFormat: 'CSV',
          ingestionStatus: 'READY',
        },
        processing: {
          read: {
            rowCount: 1,
            columnCount: 2,
          },
          classification: {
            classifiedCount: 1,
            unclassifiedCount: 1,
          },
        },
      },
    });
  });

  test('rejects unsupported file types before reaching the upload service', async () => {
    const response = await request(app)
      .post('/datasets/upload')
      .attach('file', Buffer.from('hello world'), {
        filename: 'notes.txt',
        contentType: 'application/octet-stream',
      })
      .expect(400);

    expect(mockUploadDataset).not.toHaveBeenCalled();
    expect(response.text).toContain('Only CSV and Excel (.xlsx) files are supported');
  });
});
