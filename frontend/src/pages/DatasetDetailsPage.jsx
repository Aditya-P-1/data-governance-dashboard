import { useParams } from 'react-router-dom';

export default function DatasetDetailsPage() {
  const { datasetId } = useParams();

  return (
    <section className="page">
      <p className="page__eyebrow">Dataset</p>
      <h1 className="page__title">Dataset Details</h1>
      <p className="page__lead">Placeholder details view for dataset {datasetId}.</p>

      <div className="card card--stacked">
        <p className="card__label">What belongs here later</p>
        <ul className="list">
          <li>Metadata summary</li>
          <li>Classification labels</li>
          <li>Quality history</li>
          <li>Trust and value snapshots</li>
          <li>Usage activity</li>
        </ul>
      </div>
    </section>
  );
}
