export default function DashboardPage() {
  return (
    <section className="page">
      <div className="page__hero">
        <div>
          <p className="page__eyebrow">Overview</p>
          <h1 className="page__title">Dashboard</h1>
          <p className="page__lead">
            Foundation page for dataset health, discovery, trust, and usage signals.
          </p>
        </div>
      </div>

      <div className="grid grid--metrics">
        <article className="card">
          <p className="card__label">Datasets</p>
          <h2 className="card__value">Placeholder</h2>
          <p className="card__note">Summary data will be added in a later phase.</p>
        </article>
        <article className="card">
          <p className="card__label">Data Quality</p>
          <h2 className="card__value">Placeholder</h2>
          <p className="card__note">Quality trends will be wired after the backend APIs.</p>
        </article>
        <article className="card">
          <p className="card__label">Trust Score</p>
          <h2 className="card__value">Placeholder</h2>
          <p className="card__note">Calculated trust metrics will render here later.</p>
        </article>
        <article className="card">
          <p className="card__label">Usage Tracking</p>
          <h2 className="card__value">Placeholder</h2>
          <p className="card__note">Usage events and aggregation are planned for future work.</p>
        </article>
      </div>
    </section>
  );
}
