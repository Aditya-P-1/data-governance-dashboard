import { env } from '../utils/env';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="navbar">
      <Link className="navbar__brand" to="/">
        <span className="navbar__brand-mark">DG</span>
        <span className="navbar__brand-text">
          <strong>Data Governance</strong>
          <small>Dashboard foundation</small>
        </span>
      </Link>
      <div className="navbar__meta">
        <span className="navbar__badge">API</span>
        <span className="navbar__endpoint">{env.apiUrl}</span>
      </div>
    </header>
  );
}
