export default function UploadPage() {
  return (
    <section className="page">
      <p className="page__eyebrow">Ingestion</p>
      <h1 className="page__title">Upload</h1>
      <p className="page__lead">
        Placeholder upload screen for dataset file intake and metadata capture.
      </p>

      <div className="card card--stacked">
        <p className="card__label">Future steps</p>
        <ol className="list">
          <li>Select file</li>
          <li>Attach metadata</li>
          <li>Validate schema</li>
          <li>Create dataset version</li>
        </ol>
      </div>
    </section>
  );
}
