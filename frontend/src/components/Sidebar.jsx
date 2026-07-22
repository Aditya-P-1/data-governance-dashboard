import { NavLink } from 'react-router-dom';
import { routes } from '../utils/routes';

const navItems = [
  { label: 'Dashboard', to: routes.dashboard, end: true },
  { label: 'Upload', to: routes.upload, end: true },
];

export default function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar__section">
        <p className="sidebar__eyebrow">Navigation</p>
        <nav className="sidebar__nav">
          {navItems.map(item => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="sidebar__section sidebar__section--muted">
        <p className="sidebar__eyebrow">Foundation</p>
        <p className="sidebar__copy">
          Route shell, shared layout, API client, and placeholder pages only.
        </p>
      </div>
    </aside>
  );
}
