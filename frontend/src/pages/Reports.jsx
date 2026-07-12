import { useState, useEffect } from 'react';
import client, { API_URL } from '../api/client';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const { token } = useAuth();
  const { data: vehicles, loading, error } = useFetch('/vehicles');
  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  useEffect(() => {
    if (!vehicles) return;
    (async () => {
      setRowsLoading(true);
      const results = await Promise.all(
        vehicles.map((v) => client.get(`/reports/vehicle/${v.id}`).then((r) => r.data).catch(() => null))
      );
      setRows(results.filter(Boolean));
      setRowsLoading(false);
    })();
  }, [vehicles]);

  if (loading || rowsLoading) return <p style={{ color: 'var(--muted)' }}>Loading…</p>;
  if (error) return <p className="err">{error}</p>;

  return (
    <div className="card">
      <a className="export-link csv" href={`${API_URL}/reports/export/trips.csv?token=${token}`} target="_blank" rel="noreferrer">
        ⬇ Export Trips CSV
      </a>
      <a className="export-link pdf" href={`${API_URL}/reports/export/fleet-report.pdf?token=${token}`} target="_blank" rel="noreferrer">
        ⬇ Export Fleet Report PDF
      </a>

      <table>
        <thead>
          <tr><th>Vehicle</th><th>Fuel Efficiency (km/L)</th><th>Operational Cost</th><th>Revenue</th><th>ROI</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.vehicle}</td>
              <td>{r.fuel_efficiency_km_per_l ?? '—'}</td>
              <td>₹{r.operational_cost}</td>
              <td>₹{r.total_revenue}</td>
              <td>{r.roi ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
