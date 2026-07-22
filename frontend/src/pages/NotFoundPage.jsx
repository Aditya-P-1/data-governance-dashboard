import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="page page--centered">
      <p className="page__eyebrow">404</p>
      <h1 className="page__title">Page not found</h1>
      <p className="page__lead">The page you requested does not exist yet.</p>
      <Link className="button" to="/">
        Back to Dashboard
      </Link>
    </section>
  );
}
