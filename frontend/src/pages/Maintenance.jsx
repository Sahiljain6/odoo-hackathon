import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function Maintenance() {
  const { data: logs, loading, error, refetch } = useFetch('/maintenance');
  const { data: vehicles } = useFetch('/vehicles');

  const [form, setForm] = useState({ vehicle_id: '', description: '', cost: '' });
  const [formError, setFormError] = useState('');

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await client.post('/maintenance', { ...form, vehicle_id: +form.vehicle_id, cost: +form.cost });
      setForm({ vehicle_id: '', description: '', cost: '' });
      refetch();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const closeLog = async (id) => {
    try {
      await client.patch(`/maintenance/${id}/close`);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p style={{ color: 'var(--muted)' }}>Loading…</p>;
  if (error) return <p className="err">{error}</p>;

  const eligibleVehicles = (vehicles || []).filter((v) => v.status !== 'On Trip');

  return (
    <div className="card">
      <form className="inline-form" onSubmit={handleAdd}>
        <select value={form.vehicle_id} onChange={update('vehicle_id')} required>
          <option value="" disabled>Vehicle</option>
          {eligibleVehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
        </select>
        <input placeholder="Description (e.g. Oil change)" value={form.description} onChange={update('description')} required />
        <input placeholder="Cost" type="number" value={form.cost} onChange={update('cost')} required />
        <button className="primary" type="submit">Open Maintenance Log</button>
      </form>
      {formError && <p className="err">{formError}</p>}

      <table>
        <thead>
          <tr><th>Vehicle</th><th>Description</th><th>Cost</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {logs.map((m) => (
            <tr key={m.id}>
              <td>#{m.vehicle_id}</td>
              <td>{m.description}</td>
              <td>₹{m.cost}</td>
              <td><StatusBadge status={m.status} /></td>
              <td>{m.status === 'Active' ? <button className="sm" onClick={() => closeLog(m.id)}>Close</button> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
