import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function Vehicles() {
  const { user } = useAuth();
  const { data: vehicles, loading, error, refetch } = useFetch('/vehicles');
  const canEdit = user.role === 'fleet_manager';

  const [form, setForm] = useState({ registration_number: '', name: '', type: '', max_load_capacity: '', acquisition_cost: '' });
  const [formError, setFormError] = useState('');

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await client.post('/vehicles', {
        ...form,
        max_load_capacity: +form.max_load_capacity,
        acquisition_cost: +form.acquisition_cost
      });
      setForm({ registration_number: '', name: '', type: '', max_load_capacity: '', acquisition_cost: '' });
      refetch();
    } catch (err) {
      setFormError(err.message);
    }
  };

  if (loading) return <p style={{ color: 'var(--muted)' }}>Loading…</p>;
  if (error) return <p className="err">{error}</p>;

  return (
    <div className="card">
      {canEdit && (
        <form className="inline-form" onSubmit={handleAdd}>
          <input placeholder="Reg number" value={form.registration_number} onChange={update('registration_number')} required />
          <input placeholder="Name/Model" value={form.name} onChange={update('name')} required />
          <input placeholder="Type" value={form.type} onChange={update('type')} required />
          <input placeholder="Max load (kg)" type="number" value={form.max_load_capacity} onChange={update('max_load_capacity')} required />
          <input placeholder="Acquisition cost" type="number" value={form.acquisition_cost} onChange={update('acquisition_cost')} required />
          <button className="primary" type="submit">Add Vehicle</button>
        </form>
      )}
      {formError && <p className="err">{formError}</p>}

      <table>
        <thead>
          <tr><th>Reg No</th><th>Name</th><th>Type</th><th>Max Load</th><th>Odometer</th><th>Status</th></tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id}>
              <td>{v.registration_number}</td>
              <td>{v.name}</td>
              <td>{v.type}</td>
              <td>{v.max_load_capacity}kg</td>
              <td>{v.odometer}km</td>
              <td><StatusBadge status={v.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
