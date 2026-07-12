import { useFetch } from '../hooks/useFetch';

const KPIS = [
  ['active_vehicles', 'Active Vehicles'],
  ['available_vehicles', 'Available'],
  ['vehicles_in_maintenance', 'In Maintenance'],
  ['active_trips', 'Active Trips'],
  ['pending_trips', 'Pending Trips'],
  ['drivers_on_duty', 'Drivers On Duty'],
  ['fleet_utilization_pct', 'Fleet Utilization %']
];

export default function Dashboard() {
  const { data, loading, error } = useFetch('/reports/dashboard');

  if (loading) return <p style={{ color: 'var(--muted)' }}>Loading…</p>;
  if (error) return <p className="err">{error}</p>;

  return (
    <div className="kpi-grid">
      {KPIS.map(([key, label]) => (
        <div className="kpi" key={key}>
          <div className="val">{data[key]}</div>
          <div className="label">{label}</div>
        </div>
      ))}
    </div>
  );
}
