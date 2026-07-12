import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function Trips() {
  const { data: trips, loading, error, refetch } = useFetch('/trips');
  const { data: vehicles, refetch: refetchVehicles } = useFetch('/vehicles');
  const { data: drivers, refetch: refetchDrivers } = useFetch('/drivers');

  // eligibility computed client-side from the FULL list, so a driver/vehicle
  // is always visible in the dropdown — ineligible ones are shown disabled
  // with a reason, instead of silently disappearing
  const isVehicleEligible = (v) => v.status === 'Available';
  const isDriverEligible = (d) => d.status === 'Available' && new Date(d.license_expiry_date) >= new Date(new Date().toDateString());

  const vehicleReason = (v) => (v.status !== 'Available' ? ` — ${v.status}` : '');
  const driverReason = (d) => {
    if (d.status !== 'Available') return ` — ${d.status}`;
    if (new Date(d.license_expiry_date) < new Date(new Date().toDateString())) return ' — license expired';
    return '';
  };

  const [form, setForm] = useState({ source: '', destination: '', vehicle_id: '', driver_id: '', cargo_weight: '', planned_distance: '' });
  const [formError, setFormError] = useState('');

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await client.post('/trips', {
        ...form,
        vehicle_id: +form.vehicle_id,
        driver_id: +form.driver_id,
        cargo_weight: +form.cargo_weight,
        planned_distance: +form.planned_distance
      });
      setForm({ source: '', destination: '', vehicle_id: '', driver_id: '', cargo_weight: '', planned_distance: '' });
      refetch();
      refetchVehicles();
      refetchDrivers();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const runAction = async (id, action) => {
    try {
      await client.patch(`/trips/${id}/${action}`);
      refetch();
      refetchVehicles();
      refetchDrivers();
    } catch (err) {
      alert(err.message);
    }
  };

  const completeTrip = async (id) => {
    const final_odometer = window.prompt('Final odometer (km):');
    if (final_odometer === null) return;
    const fuel_consumed = window.prompt('Fuel consumed (liters):');
    const fuel_cost = window.prompt('Fuel cost:');
    const revenue = window.prompt('Trip revenue:');
    try {
      await client.patch(`/trips/${id}/complete`, {
        final_odometer: +final_odometer, fuel_consumed: +fuel_consumed, fuel_cost: +fuel_cost, revenue: +revenue
      });
      refetch();
      refetchVehicles();
      refetchDrivers();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p style={{ color: 'var(--muted)' }}>Loading…</p>;
  if (error) return <p className="err">{error}</p>;

  return (
    <div className="card">
      <form className="inline-form" onSubmit={handleCreate}>
        <input placeholder="Source" value={form.source} onChange={update('source')} required />
        <input placeholder="Destination" value={form.destination} onChange={update('destination')} required />
        <select value={form.vehicle_id} onChange={update('vehicle_id')} required>
          <option value="" disabled>Vehicle</option>
          {(vehicles || []).map((v) => (
            <option key={v.id} value={v.id} disabled={!isVehicleEligible(v)}>
              {v.registration_number} (max {v.max_load_capacity}kg){vehicleReason(v)}
            </option>
          ))}
        </select>
        <select value={form.driver_id} onChange={update('driver_id')} required>
          <option value="" disabled>Driver</option>
          {(drivers || []).map((d) => (
            <option key={d.id} value={d.id} disabled={!isDriverEligible(d)}>
              {d.name}{driverReason(d)}
            </option>
          ))}
        </select>
        <input placeholder="Cargo weight (kg)" type="number" value={form.cargo_weight} onChange={update('cargo_weight')} required />
        <input placeholder="Planned distance (km)" type="number" value={form.planned_distance} onChange={update('planned_distance')} required />
        <button className="primary" type="submit">Create Trip (Draft)</button>
      </form>
      {formError && <p className="err">{formError}</p>}

      <table>
        <thead>
          <tr><th>Route</th><th>Cargo</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {trips.map((t) => (
            <tr key={t.id}>
              <td>{t.source} → {t.destination}</td>
              <td>{t.cargo_weight}kg</td>
              <td><StatusBadge status={t.status} /></td>
              <td>
                {t.status === 'Draft' && (
                  <>
                    <button className="sm" onClick={() => runAction(t.id, 'dispatch')}>Dispatch</button>
                    <button className="sm danger" onClick={() => runAction(t.id, 'cancel')}>Cancel</button>
                  </>
                )}
                {t.status === 'Dispatched' && (
                  <>
                    <button className="sm" onClick={() => completeTrip(t.id)}>Complete</button>
                    <button className="sm danger" onClick={() => runAction(t.id, 'cancel')}>Cancel</button>
                  </>
                )}
                {!['Draft', 'Dispatched'].includes(t.status) && '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
