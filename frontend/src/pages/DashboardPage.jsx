import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getDashboardDatasets } from '../services/datasetService';

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Updated' },
  { value: 'createdAt', label: 'Created' },
  { value: 'name', label: 'Dataset Name' },
  { value: 'rows', label: 'Rows' },
  { value: 'columns', label: 'Columns' },
  { value: 'quality', label: 'Quality' },
  { value: 'trust', label: 'Trust' },
  { value: 'value', label: 'Value' },
  { value: 'views', label: 'Views' },
  { value: 'sensitiveColumns', label: 'Sensitive Columns' },
];

const LIMIT_OPTIONS = [5, 10, 20, 50];

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
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

function getScoreTone(score) {
  if (score >= 80) {
    return 'success';
  }

  if (score >= 60) {
    return 'warning';
  }

  return 'danger';
}

function MetricCard({ label, value, hint }) {
  return (
    <article className="stat-card">
      <p className="stat-card__label">{label}</p>
      <strong className="stat-card__value">{value}</strong>
      <span className="stat-card__hint">{hint}</span>
    </article>
  );
}

function ScorePill({ value }) {
  if (value === null || value === undefined) {
    return <span className="score-pill score-pill--neutral">—</span>;
  }

  const tone = getScoreTone(value);

  return <span className={`score-pill score-pill--${tone}`}>{formatScore(value)}</span>;
}

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [datasets, setDatasets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sortBy = searchParams.get('sortBy') || 'updatedAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const page = Number(searchParams.get('page') || 1);
  const limit = Number(searchParams.get('limit') || 10);
  const paramQuery = searchParams.get('q') || '';

  useEffect(() => {
    setQuery(paramQuery);
  }, [paramQuery]);

  useEffect(() => {
    if (query === paramQuery) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams);

      if (query.trim()) {
        nextParams.set('q', query.trim());
      } else {
        nextParams.delete('q');
      }

      nextParams.set('page', '1');
      setSearchParams(nextParams, { replace: true });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [paramQuery, query, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const response = await getDashboardDatasets({
          q: searchParams.get('q') || '',
          search: searchParams.get('q') || '',
          sortBy,
          sortOrder,
          page,
          limit,
        });

        if (cancelled) {
          return;
        }

        setDatasets(response.items || []);
        setSummary(response.summary || null);
        setPagination(response.pagination || null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.response?.data?.error?.message || 'Failed to load dashboard data.');
          setDatasets([]);
          setSummary(null);
          setPagination(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [limit, page, searchParams, sortBy, sortOrder]);

  const totalPages = pagination?.totalPages || 0;

  const metricCards = useMemo(
    () => [
      {
        label: 'Datasets',
        value: summary ? formatNumber(summary.datasets) : '0',
        hint: 'Tracked datasets in the current view',
      },
      {
        label: 'Rows',
        value: summary ? formatNumber(summary.rows) : '0',
        hint: 'Total rows across visible datasets',
      },
      {
        label: 'Columns',
        value: summary ? formatNumber(summary.columns) : '0',
        hint: 'Discovered columns from latest versions',
      },
      {
        label: 'Quality',
        value: summary ? formatScore(summary.quality) : '—',
        hint: 'Average quality score',
      },
      {
        label: 'Trust',
        value: summary ? formatScore(summary.trust) : '—',
        hint: 'Average trust score',
      },
      {
        label: 'Value',
        value: summary ? formatScore(summary.value) : '—',
        hint: 'Average business value score',
      },
      {
        label: 'Views',
        value: summary ? formatNumber(summary.views) : '0',
        hint: 'Total dataset views',
      },
      {
        label: 'Sensitive Columns',
        value: summary ? formatNumber(summary.sensitiveColumns) : '0',
        hint: 'Classified sensitive columns',
      },
    ],
    [summary],
  );

  function updateSearchParam(key, value) {
    const nextParams = new URLSearchParams(searchParams);

    if (value === null || value === undefined || value === '') {
      nextParams.delete(key);
    } else {
      nextParams.set(key, String(value));
    }

    setSearchParams(nextParams, { replace: key === 'q' });
  }

  function updateSearchParams(changes, options = {}) {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    setSearchParams(nextParams, options);
  }

  function goToPage(nextPage) {
    updateSearchParam('page', String(nextPage));
  }

  function toggleSortOrder() {
    updateSearchParams({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
  }

  function setSortField(nextSortBy) {
    updateSearchParams({ sortBy: nextSortBy, page: 1 });
  }

  function setLimit(nextLimit) {
    updateSearchParams({ limit: nextLimit, page: 1 });
  }

  return (
    <section className="dashboard">
      <div className="page__hero dashboard__hero">
        <div>
          <p className="page__eyebrow">Operational Overview</p>
          <h1 className="page__title">Data Governance Dashboard</h1>
          <p className="page__lead">
            Search, sort, and monitor datasets with the latest quality, trust, value, and usage
            signals in one place.
          </p>
        </div>

        <div className="dashboard__hero-actions">
          <div className="dashboard__hero-chip">
            <span className="dashboard__hero-chip-label">Showing</span>
            <strong>{pagination ? `${pagination.page} / ${pagination.totalPages || 1}` : '1 / 1'}</strong>
          </div>
          <Link className="button" to="/upload">
            Upload Dataset
          </Link>
        </div>
      </div>

      <div className="dashboard__metrics">
        {metricCards.map(card => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="card card--stacked dashboard__panel">
        <div className="dashboard__toolbar">
          <div className="dashboard__search">
            <label className="field">
              <span className="field__label">Search</span>
              <input
                className="input"
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search by name, slug, domain, or source system"
              />
            </label>
          </div>

          <div className="dashboard__controls">
            <label className="field">
              <span className="field__label">Sort by</span>
              <select
                className="input"
                value={sortBy}
                onChange={event => setSortField(event.target.value)}
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button className="button button--secondary" type="button" onClick={toggleSortOrder}>
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </button>

            <label className="field">
              <span className="field__label">Rows per page</span>
              <select
                className="input"
                value={limit}
                onChange={event => setLimit(Number(event.target.value))}
              >
                {LIMIT_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <div className="empty-state">
            <p className="empty-state__title">Unable to load dashboard</p>
            <p className="empty-state__copy">{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="empty-state">
            <p className="empty-state__title">Loading dashboard data</p>
            <p className="empty-state__copy">Fetching the latest governance metrics.</p>
          </div>
        ) : null}

        {!loading && !error && datasets.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">No datasets found</p>
            <p className="empty-state__copy">
              Try a different search term or upload a new dataset to get started.
            </p>
          </div>
        ) : null}

        {!loading && !error && datasets.length > 0 ? (
          <div className="table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Rows</th>
                  <th>Columns</th>
                  <th>Quality</th>
                  <th>Trust</th>
                  <th>Value</th>
                  <th>Views</th>
                  <th>Sensitive Columns</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map(row => (
                  <tr key={row.dataset.id}>
                    <td>
                      <div className="dataset-cell">
                        <Link className="dataset-cell__name" to={`/datasets/${row.dataset.id}`}>
                          {row.dataset.name}
                        </Link>
                        <span className="dataset-cell__meta">{row.dataset.slug}</span>
                        <div className="dataset-cell__tags">
                          <span className="tag">{row.dataset.sourceType}</span>
                          <span className="tag">{row.dataset.criticality}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatNumber(row.metrics.rows)}</td>
                    <td>{formatNumber(row.metrics.columns)}</td>
                    <td>
                      <ScorePill value={row.metrics.quality} />
                    </td>
                    <td>
                      <ScorePill value={row.metrics.trust} />
                    </td>
                    <td>
                      <ScorePill value={row.metrics.value} />
                    </td>
                    <td>{formatNumber(row.metrics.views)}</td>
                    <td>
                      <span
                        className={`count-pill${
                          row.metrics.sensitiveColumns > 0 ? ' count-pill--alert' : ''
                        }`}
                      >
                        {formatNumber(row.metrics.sensitiveColumns)}
                      </span>
                    </td>
                    <td>{formatDate(row.dataset.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {pagination && totalPages > 1 ? (
          <div className="pagination">
            <p className="pagination__summary">
              Page {pagination.page} of {pagination.totalPages} · {formatNumber(pagination.total)} total datasets
            </p>
            <div className="pagination__controls">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => goToPage(Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1}
              >
                Previous
              </button>

              <button
                className="button button--secondary"
                type="button"
                onClick={() => goToPage(Math.min(totalPages, pagination.page + 1))}
                disabled={pagination.page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
