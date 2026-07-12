import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function Drivers() {
  const { user } = useAuth();
  const { data: drivers, loading, error, refetch } = useFetch('/drivers');
  const canEdit = ['fleet_manager', 'safety_officer'].includes(user.role);

  const [form, setForm] = useState({ name: '', license_number: '', license_expiry_date: '', contact_number: '' });
  const [formError, setFormError] = useState('');

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // digits only, max 10 chars — blocks bad input at the source instead of rejecting after submit
  const updatePhone = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, contact_number: digitsOnly });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError('');
    if (form.contact_number && form.contact_number.length !== 10) {
      setFormError('Contact number must be exactly 10 digits');
      return;
    }
    try {
      await client.post('/drivers', form);
      setForm({ name: '', license_number: '', license_expiry_date: '', contact_number: '' });
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
          <input placeholder="Name" value={form.name} onChange={update('name')} required />
          <input placeholder="License number" value={form.license_number} onChange={update('license_number')} required />
          <input type="date" value={form.license_expiry_date} onChange={update('license_expiry_date')} required />
          <input placeholder="Contact number (10 digits)" value={form.contact_number} onChange={updatePhone}
                 inputMode="numeric" pattern="\d{10}" maxLength={10} />
          <button className="primary" type="submit">Add Driver</button>
        </form>
      )}
      {formError && <p className="err">{formError}</p>}

      <table>
        <thead>
          <tr><th>Name</th><th>License</th><th>Expiry</th><th>Safety Score</th><th>Status</th></tr>
        </thead>
        <tbody>
          {drivers.map((d) => {
            const expired = new Date(d.license_expiry_date) < new Date();
            return (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.license_number}</td>
                <td>{d.license_expiry_date}{expired ? ' ⚠️' : ''}</td>
                <td>{d.safety_score}</td>
                <td><StatusBadge status={d.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
