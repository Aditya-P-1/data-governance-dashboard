import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getDatasetDetails,
  overrideColumnClassification,
  trackDatasetView,
} from '../services/datasetService';

const trackedViews = new Map();
const TRACK_SUPPRESSION_WINDOW_MS = 5000;
const CLASSIFICATION_OVERRIDE_OPTIONS = [
  { code: 'EMAIL', label: 'Email' },
  { code: 'PHONE', label: 'Phone' },
  { code: 'NAME', label: 'Name' },
  { code: 'GOVERNMENT_ID', label: 'Government ID' },
  { code: 'ADDRESS', label: 'Address' },
  { code: 'DATE_OF_BIRTH', label: 'Date of Birth' },
];

function shouldTrackDatasetView(currentDatasetId) {
  const lastTrackedAt = trackedViews.get(currentDatasetId);
  const now = Date.now();

  if (lastTrackedAt && now - lastTrackedAt < TRACK_SUPPRESSION_WINDOW_MS) {
    return false;
  }

  trackedViews.set(currentDatasetId, now);
  return true;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function formatPercent(value) {
  if (value === null || value === undefined) {
    return '—';
  }

  return `${Number(value).toFixed(2)}%`;
}

function formatScore(value) {
  if (value === null || value === undefined) {
    return '—';
  }

  return `${Number(value).toFixed(0)}%`;
}

function formatDate(value) {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getTone(score) {
  if (score >= 80) {
    return 'success';
  }

  if (score >= 60) {
    return 'warning';
  }

  return 'danger';
}

function MetricCard({ label, value, note }) {
  return (
    <article className="stat-card stat-card--compact">
      <p className="stat-card__label">{label}</p>
      <strong className="stat-card__value">{value}</strong>
      <span className="stat-card__hint">{note}</span>
    </article>
  );
}

function ScorePill({ value }) {
  if (value === null || value === undefined) {
    return <span className="score-pill score-pill--neutral">—</span>;
  }

  const tone = getTone(value);

  return <span className={`score-pill score-pill--${tone}`}>{formatScore(value)}</span>;
}

function BoolPill({ value, labelTrue = 'Yes', labelFalse = 'No' }) {
  return (
    <span className={`flag-pill${value ? ' flag-pill--active' : ''}`}>
      {value ? labelTrue : labelFalse}
    </span>
  );
}

function ValueAssessmentPanel({ assessment, score, views, lastViewedAt }) {
  if (!assessment?.label) {
    return null;
  }

  return (
    <article className={`value-advisory value-advisory--${assessment.tone || 'neutral'}`}>
      <div className="value-advisory__header">
        <div>
          <p className="card__label">Value advisory</p>
          <h2 className="value-advisory__title">{assessment.label}</h2>
        </div>
        <span className={`assessment-pill assessment-pill--${assessment.tone || 'neutral'}`}>
          {formatScore(score)}
        </span>
      </div>

      <p className="value-advisory__body">{assessment.recommendation}</p>

      <div className="value-advisory__meta">
        <span className="tag">Views {formatNumber(views)}</span>
        <span className="tag">Last viewed {formatDate(lastViewedAt)}</span>
      </div>
    </article>
  );
}

function ManualOverrideControl({ datasetId, column, onOverride }) {
  const [selectedCode, setSelectedCode] = useState(column.classification?.code || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedCode(column.classification?.code || '');
    setMessage('');
    setError('');
  }, [column.classification?.code, column.id]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedCode) {
      setError('Choose a label before applying the override.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await overrideColumnClassification(datasetId, {
        datasetColumnId: column.id,
        classificationLabelCode: selectedCode,
        rationale: 'Manual override applied from the dataset details page.',
      });

      onOverride(response);
      setMessage(`Updated to ${response.assignment?.label?.name || selectedCode}.`);
    } catch (overrideError) {
      setError(
        overrideError?.response?.data?.error?.message || 'Failed to update the classification.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="override-control" onSubmit={handleSubmit}>
      <label className="field override-control__field">
        <span className="field__label">Manual override</span>
        <select
          className="input"
          value={selectedCode}
          onChange={event => setSelectedCode(event.target.value)}
        >
          <option value="">Choose a label</option>
          {CLASSIFICATION_OVERRIDE_OPTIONS.map(option => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="override-control__actions">
        <button className="button button--secondary" type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Apply override'}
        </button>
        <span className="override-control__hint">
          Current tag: {column.classification ? column.classification.code : 'Unclassified'}
        </span>
      </div>

      {message ? <p className="override-control__message override-control__message--success">{message}</p> : null}
      {error ? <p className="override-control__message override-control__message--error">{error}</p> : null}
    </form>
  );
}

function getSensitiveColumnCount(columns) {
  return columns.reduce((count, column) => {
    if (column?.classification?.level === 'CONFIDENTIAL' || column?.classification?.level === 'RESTRICTED') {
      return count + 1;
    }

    return count;
  }, 0);
}

export default function DatasetDetailsPage() {
  const { datasetId } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      setLoading(true);
      setError('');

      try {
        const response = await getDatasetDetails(datasetId);

        if (!cancelled) {
          setDetails(response);
          if (datasetId && shouldTrackDatasetView(datasetId)) {
            void trackDatasetView(datasetId)
              .then(trackResponse => {
                if (cancelled || !trackResponse) {
                  return;
                }

                setDetails(currentDetails =>
                  currentDetails
                    ? {
                        ...currentDetails,
                        metrics: {
                          ...currentDetails.metrics,
                          views: trackResponse.usage.viewCount,
                          value: trackResponse.valueScore.snapshot.overallScore,
                        },
                      }
                    : currentDetails,
                );
              })
              .catch(() => {
                trackedViews.delete(datasetId);
              })
              .finally(() => {
                window.setTimeout(() => {
                  trackedViews.delete(datasetId);
                }, TRACK_SUPPRESSION_WINDOW_MS);
              });
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.response?.data?.error?.message || 'Failed to load dataset details.');
          setDetails(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  function handleClassificationOverride(result) {
    setDetails(currentDetails => {
      if (!currentDetails) {
        return currentDetails;
      }

      const updatedColumns = currentDetails.columns.map(column => {
        if (column.id !== result.column.id) {
          return column;
        }

        return {
          ...column,
          classification: result.classification
            ? {
                ...result.classification,
                source: result.assignment?.source || 'MANUAL',
                appliedAt: result.assignment?.appliedAt || column.classification?.appliedAt || null,
              }
            : null,
          manualOverride: {
            enabled: true,
            rationale: result.assignment?.rationale || null,
            appliedAt: result.assignment?.appliedAt || null,
          },
        };
      });

      return {
        ...currentDetails,
        columns: updatedColumns,
        metrics: {
          ...currentDetails.metrics,
          sensitiveColumns: getSensitiveColumnCount(updatedColumns),
        },
      };
    });
  }

  const summaryCards = useMemo(() => {
    if (!details) {
      return [];
    }

    return [
      {
        label: 'Rows',
        value: formatNumber(details.metrics.rows),
        note: `Latest version ${details.version.versionNumber}`,
      },
      {
        label: 'Columns',
        value: formatNumber(details.metrics.columns),
        note: 'Detected schema columns',
      },
      {
        label: 'Quality',
        value: formatScore(details.metrics.quality),
        note: details.qualityRun ? `Run ${details.qualityRun.status}` : 'Not calculated yet',
      },
      {
        label: 'Trust',
        value: formatScore(details.metrics.trust),
        note: 'Latest trust snapshot',
      },
      {
        label: 'Value',
        value: formatScore(details.metrics.value),
        note: details.metrics.valueAssessment?.label || 'Latest value snapshot',
      },
      {
        label: 'Sensitive Columns',
        value: formatNumber(details.metrics.sensitiveColumns),
        note: 'Confidential or restricted fields',
      },
    ];
  }, [details]);

  return (
    <section className="page dataset-details">
      <div className="page__hero dataset-details__hero">
        <div>
          <p className="page__eyebrow">Dataset</p>
          <h1 className="page__title">
            {details?.dataset.name || 'Dataset Details'}
          </h1>
          <p className="page__lead">
            {details?.dataset.description ||
              'Inspect column-level classification, quality, and manual override information for the latest dataset version.'}
          </p>
          {details ? (
            <div className="dataset-details__meta">
              <span className="tag">{details.dataset.sourceType}</span>
              <span className="tag">{details.dataset.criticality}</span>
              <span className="tag">Version {details.version.versionNumber}</span>
              <span className="tag">{details.version.fileFormat}</span>
            </div>
          ) : null}
        </div>

        <div className="dataset-details__hero-actions">
          <Link className="button button--secondary" to="/">
            Back to Dashboard
          </Link>
          <div className="dataset-details__hero-chip">
            <span className="dataset-details__hero-chip-label">Last processed</span>
            <strong>{details ? formatDate(details.version.processedAt) : '—'}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard__metrics">
        {summaryCards.map(card => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <ValueAssessmentPanel
        assessment={details?.metrics?.valueAssessment}
        score={details?.metrics?.value}
        views={details?.metrics?.views}
        lastViewedAt={details?.metrics?.lastViewedAt}
      />

      {error ? (
        <div className="empty-state">
          <p className="empty-state__title">Unable to load dataset</p>
          <p className="empty-state__copy">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="empty-state">
          <p className="empty-state__title">Loading dataset details</p>
          <p className="empty-state__copy">Fetching the latest column, quality, and classification data.</p>
        </div>
      ) : null}

      {!loading && !error && details ? (
        <div className="card card--stacked dataset-details__panel">
          <div className="dataset-details__panel-header">
            <div>
              <p className="card__label">Columns</p>
              <h2 className="dataset-details__panel-title">Column detail view</h2>
            </div>
            <div className="dataset-details__panel-summary">
              <span className="tag">Views {formatNumber(details.metrics.views)}</span>
              <span className="tag">Processed {formatDate(details.version.processedAt)}</span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="dashboard-table dataset-details__table">
              <thead>
                <tr>
                  <th>Column Name</th>
                  <th>Datatype</th>
                  <th>Classification</th>
                  <th>Missing %</th>
                  <th>Invalid %</th>
                  <th>Manual Override</th>
                  <th>Quality Metrics</th>
                </tr>
              </thead>
              <tbody>
                {details.columns.map(column => (
                  <tr key={column.id}>
                    <td>
                      <div className="dataset-cell">
                        <strong className="dataset-cell__name">{column.name}</strong>
                        <span className="dataset-cell__meta">#{column.ordinal}</span>
                      </div>
                    </td>
                    <td>
                      <span className="tag">{column.dataType}</span>
                    </td>
                    <td>
                      {column.classification ? (
                        <div className="dataset-cell">
                          <strong className="dataset-cell__name">
                            {column.classification.name}
                          </strong>
                          <span className="dataset-cell__meta">
                            {column.classification.code} · {column.classification.level}
                          </span>
                          <span className="tag">
                            {column.classification.source}
                          </span>
                        </div>
                      ) : (
                        <span className="flag-pill">Unclassified</span>
                      )}
                      <ManualOverrideControl
                        datasetId={datasetId}
                        column={column}
                        onOverride={handleClassificationOverride}
                      />
                    </td>
                    <td>{formatPercent(column.qualityMetrics.missingPercent)}</td>
                    <td>{formatPercent(column.qualityMetrics.invalidPercent)}</td>
                    <td>
                      <div className="dataset-cell">
                        <BoolPill value={column.manualOverride.enabled} />
                        {column.manualOverride.enabled ? (
                          <span className="dataset-cell__meta">
                            {column.manualOverride.rationale || 'Manual steward override'}
                          </span>
                        ) : (
                          <span className="dataset-cell__meta">Rule-based classification</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="dataset-details__quality-stack">
                        <ScorePill value={column.qualityMetrics.qualityScore} />
                        <span className="dataset-cell__meta">
                          Missing {formatPercent(column.qualityMetrics.missingPercent)} · Invalid{' '}
                          {formatPercent(column.qualityMetrics.invalidPercent)}
                        </span>
                        <span className="dataset-cell__meta">
                          Completeness {formatScore(column.qualityMetrics.completenessScore)} · Validity{' '}
                          {formatScore(column.qualityMetrics.validityScore)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
