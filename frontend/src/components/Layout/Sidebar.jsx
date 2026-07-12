import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// mirrors backend RBAC: which screens each role is allowed to act on
const NAV_BY_ROLE = {
  fleet_manager: [
    ['/dashboard', 'Dashboard'], ['/vehicles', 'Vehicles'], ['/drivers', 'Drivers'],
    ['/trips', 'Trips'], ['/maintenance', 'Maintenance'], ['/reports', 'Reports']
  ],
  driver: [
    ['/dashboard', 'Dashboard'], ['/trips', 'Trips']
  ],
  safety_officer: [
    ['/dashboard', 'Dashboard'], ['/drivers', 'Drivers']
  ],
  financial_analyst: [
    ['/dashboard', 'Dashboard'], ['/reports', 'Reports']
  ]
};

export default function Sidebar() {
  const { user } = useAuth();
  const links = NAV_BY_ROLE[user?.role] || [['/dashboard', 'Dashboard']];

  return (
    <aside className="sidebar">
      <h1>🚚 TransitOps</h1>
      <nav>
        {links.map(([path, label]) => (
          <NavLink key={path} to={path} className={({ isActive }) => (isActive ? 'active' : '')}>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
