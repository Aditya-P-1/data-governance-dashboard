import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDatasetDetails } from '../services/datasetService';

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
        note: 'Latest value snapshot',
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
