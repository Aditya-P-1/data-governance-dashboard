import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { uploadDataset } from '../services/uploadService';
import { buildDatasetDetailsPath, routes } from '../utils/routes';

function formatBytes(bytes) {
  const value = Number(bytes || 0);

  if (value < 1024) {
    return `${value} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let currentValue = value / 1024;
  let unitIndex = 0;

  while (currentValue >= 1024 && unitIndex < units.length - 1) {
    currentValue /= 1024;
    unitIndex += 1;
  }

  return `${currentValue.toFixed(currentValue >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function formatScore(value) {
  if (value === null || value === undefined) {
    return '—';
  }

  return `${Number(value).toFixed(0)}%`;
}

function getFileExtension(fileName) {
  const parts = String(fileName || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

export default function UploadPage() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileSummary = useMemo(() => {
    if (!selectedFile) {
      return null;
    }

    return {
      name: selectedFile.name,
      size: formatBytes(selectedFile.size),
      type: selectedFile.type || 'Unknown type',
      extension: getFileExtension(selectedFile.name) || 'unknown',
    };
  }, [selectedFile]);

  function resetFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function clearSelection() {
    setSelectedFile(null);
    setUploadResult(null);
    setError('');
    resetFileInput();
  }

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0] || null;

    setSelectedFile(nextFile);
    setUploadResult(null);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setError('Please choose a CSV or Excel (.xlsx) file first.');
      return;
    }

    const extension = getFileExtension(selectedFile.name);
    if (!['csv', 'xlsx'].includes(extension)) {
      setError('Only CSV and Excel (.xlsx) files are supported.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await uploadDataset(selectedFile);
      setUploadResult(response);
      setSelectedFile(null);
      resetFileInput();
    } catch (uploadError) {
      setUploadResult(null);
      setError(uploadError?.response?.data?.error?.message || 'Failed to upload the dataset.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page upload-page">
      <div className="page__hero upload-page__hero">
        <div>
          <p className="page__eyebrow">Ingestion</p>
          <h1 className="page__title">Upload Dataset</h1>
          <p className="page__lead">
            Upload a CSV or Excel file to create a governed dataset record with temporary file
            storage and metadata capture.
          </p>
        </div>

        <div className="upload-page__hero-actions">
          <Link className="button button--secondary" to={routes.dashboard}>
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="upload-page__layout">
        <form className="card card--stacked upload-page__form" onSubmit={handleSubmit}>
          <p className="card__label">Dataset upload</p>
          <div className="field">
            <label className="field__label" htmlFor="dataset-file">
              Select CSV or Excel file
            </label>
            <input
              ref={fileInputRef}
              id="dataset-file"
              className="input upload-page__file-input"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
            />
          </div>

          {fileSummary ? (
            <div className="upload-page__file-card">
              <div className="upload-page__file-main">
                <p className="upload-page__file-name">{fileSummary.name}</p>
                <div className="upload-page__file-meta">
                  <span className="tag">{fileSummary.extension.toUpperCase()}</span>
                  <span className="tag">{fileSummary.size}</span>
                  <span className="tag">{fileSummary.type}</span>
                </div>
              </div>

              <button
                className="button button--secondary upload-page__clear-button"
                type="button"
                onClick={clearSelection}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state__title">No file selected</p>
              <p className="empty-state__copy">
                Choose a CSV or Excel file to create a dataset record.
              </p>
            </div>
          )}

          <div className="upload-page__actions">
            <button className="button" type="submit" disabled={!selectedFile || loading}>
              {loading ? 'Uploading...' : 'Upload Dataset'}
            </button>
            <p className="upload-page__hint">
              The backend stores the uploaded file temporarily and captures filename, file size,
              file format, and upload timestamp.
            </p>
          </div>

          {error ? (
            <div className="empty-state" role="alert">
              <p className="empty-state__title">Upload failed</p>
              <p className="empty-state__copy">{error}</p>
            </div>
          ) : null}

          {uploadResult ? (
            <div className="upload-page__result">
              <div className="upload-page__result-heading">
                <div>
                  <p className="card__label">Upload and processing complete</p>
                  <h2 className="upload-page__result-title">{uploadResult.dataset.name}</h2>
                </div>
                <div className="upload-page__result-actions">
                  <Link
                    className="button"
                    to={buildDatasetDetailsPath(uploadResult.dataset.id)}
                  >
                    View details
                  </Link>
                  <Link className="button button--secondary" to={routes.dashboard}>
                    Go to dashboard
                  </Link>
                </div>
              </div>

              <div className="upload-page__result-grid">
                <article className="stat-card stat-card--compact">
                  <p className="stat-card__label">Dataset slug</p>
                  <strong className="stat-card__value">{uploadResult.dataset.slug}</strong>
                  <span className="stat-card__hint">Permanent identifier for the catalog</span>
                </article>
                <article className="stat-card stat-card--compact">
                  <p className="stat-card__label">File name</p>
                  <strong className="stat-card__value">{uploadResult.upload.fileName}</strong>
                  <span className="stat-card__hint">{uploadResult.upload.fileFormat}</span>
                </article>
                <article className="stat-card stat-card--compact">
                  <p className="stat-card__label">File size</p>
                  <strong className="stat-card__value">
                    {formatBytes(uploadResult.upload.fileSizeBytes)}
                  </strong>
                  <span className="stat-card__hint">
                    Uploaded at {formatDate(uploadResult.upload.uploadedAt)}
                  </span>
                </article>
                <article className="stat-card stat-card--compact">
                  <p className="stat-card__label">Ingestion status</p>
                  <strong className="stat-card__value">
                    {uploadResult.upload.ingestionStatus}
                  </strong>
                  <span className="stat-card__hint">
                    Version {uploadResult.upload.versionNumber}
                  </span>
                </article>
              </div>

              {uploadResult.processing ? (
                <div className="upload-page__pipeline">
                  <p className="card__label">Automated pipeline</p>
                  <div className="upload-page__pipeline-grid">
                    <span className="tag">Read {formatNumber(uploadResult.processing.read.rowCount)} rows</span>
                    <span className="tag">
                      Schema {formatNumber(uploadResult.processing.schema.columnCount)} columns
                    </span>
                    <span className="tag">
                      Classified {formatNumber(uploadResult.processing.classification.classifiedCount)} columns
                    </span>
                    <span className="tag">
                      Quality {formatScore(uploadResult.processing.quality.qualityScore)}
                    </span>
                    <span className="tag">
                      Trust {formatScore(uploadResult.processing.trust.trustScore)}
                    </span>
                    <span className="tag">
                      Value {formatScore(uploadResult.processing.value.valueScore)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </form>

        <aside className="card card--stacked upload-page__aside">
          <p className="card__label">Upload flow</p>
          <h2 className="upload-page__aside-title">What happens after upload</h2>
          <ol className="list">
            <li>The file is stored temporarily on the backend.</li>
            <li>The dataset record and initial version are created in PostgreSQL.</li>
            <li>Metadata such as filename, file size, and upload time are saved.</li>
            <li>You can open the dataset details page from the success state.</li>
          </ol>

          <div className="upload-page__aside-note">
            <p className="card__label">Supported files</p>
            <p className="card__note">
              CSV and Excel (.xlsx) files only. The backend rejects unsupported formats to keep
              the ingestion flow predictable.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
