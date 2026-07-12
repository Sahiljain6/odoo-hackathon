// src/components/Layout/Sidebar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const TABS = {
  fleet_manager: ['dashboard', 'vehicles', 'drivers', 'trips', 'maintenance', 'reports'],
  driver: ['dashboard', 'trips'],
  safety_officer: ['dashboard', 'drivers'],
  financial_analyst: ['dashboard', 'reports']
};

export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const allowedTabs = TABS[user?.role] || ['dashboard'];

  return (
    <div style={{ width: '240px', background: '#1e293b', minHeight: '100vh', padding: '20px 10px', borderRight: '1px solid #334155' }}>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '30px', paddingLeft: '10px' }}>
        TransitOps
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {allowedTabs.map(tab => {
          const path = tab === 'dashboard' ? '/' : `/${tab}`;
          const isActive = location.pathname === path;
          return (
            <button
              key={tab}
              onClick={() => navigate(path)}
              style={{
                textTransform: 'capitalize',
                textAlign: 'left',
                padding: '10px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                background: isActive ? '#3b82f6' : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
