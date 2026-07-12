const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// CREATE trip (Draft)
router.post('/', requireRole('driver', 'fleet_manager'), (req, res) => {
  const { source, destination, vehicle_id, driver_id, cargo_weight, planned_distance } = req.body;

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driver_id);

  if (!vehicle || !driver) return res.status(404).json({ error: 'Vehicle or driver not found' });

  // Rule: retired/in-shop vehicles never selectable
  if (['Retired', 'In Shop'].includes(vehicle.status)) {
    return res.status(400).json({ error: `Vehicle is ${vehicle.status} and cannot be dispatched` });
  }
  // Rule: vehicle already on a trip
  if (vehicle.status === 'On Trip') {
    return res.status(400).json({ error: 'Vehicle already assigned to an active trip' });
  }
  // Rule: expired license or suspended driver
  if (driver.status === 'Suspended') {
    return res.status(400).json({ error: 'Driver is suspended' });
  }
  if (new Date(driver.license_expiry_date) < new Date()) {
    return res.status(400).json({ error: 'Driver license expired' });
  }
  if (driver.status === 'On Trip') {
    return res.status(400).json({ error: 'Driver already assigned to an active trip' });
  }
  // Rule: cargo weight vs capacity
  if (cargo_weight > vehicle.max_load_capacity) {
    return res.status(400).json({
      error: `Cargo weight ${cargo_weight}kg exceeds vehicle capacity ${vehicle.max_load_capacity}kg`
    });
  }

  const result = db.prepare(`
    INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Draft')
  `).run(source, destination, vehicle_id, driver_id, cargo_weight, planned_distance);

  res.status(201).json({ id: result.lastInsertRowid, status: 'Draft' });
});

// DISPATCH trip: Draft -> Dispatched, vehicle+driver -> On Trip
router.patch('/:id/dispatch', requireRole('driver', 'fleet_manager'), (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'Draft') return res.status(400).json({ error: `Cannot dispatch a trip in status ${trip.status}` });

  const tx = db.transaction(() => {
    db.prepare(`UPDATE trips SET status='Dispatched', dispatched_at=CURRENT_TIMESTAMP WHERE id=?`).run(trip.id);
    db.prepare(`UPDATE vehicles SET status='On Trip' WHERE id=?`).run(trip.vehicle_id);
    db.prepare(`UPDATE drivers SET status='On Trip' WHERE id=?`).run(trip.driver_id);
  });
  tx();

  res.json({ id: trip.id, status: 'Dispatched' });
});

// COMPLETE trip: Dispatched -> Completed, vehicle+driver -> Available
router.patch('/:id/complete', requireRole('driver', 'fleet_manager'), (req, res) => {
  const { final_odometer, fuel_consumed, revenue } = req.body;
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'Dispatched') return res.status(400).json({ error: `Cannot complete a trip in status ${trip.status}` });

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE trips SET status='Completed', final_odometer=?, fuel_consumed=?, revenue=?, completed_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(final_odometer, fuel_consumed, revenue || 0, trip.id);

    db.prepare(`UPDATE vehicles SET status='Available', odometer=? WHERE id=?`)
      .run(final_odometer || 0, trip.vehicle_id);
    db.prepare(`UPDATE drivers SET status='Available' WHERE id=?`).run(trip.driver_id);

    if (fuel_consumed) {
      db.prepare(`INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost) VALUES (?, ?, ?, ?)`)
        .run(trip.vehicle_id, trip.id, fuel_consumed, req.body.fuel_cost || 0);
    }
  });
  tx();

  res.json({ id: trip.id, status: 'Completed' });
});

// CANCEL trip: Dispatched -> Cancelled, vehicle+driver -> Available
router.patch('/:id/cancel', requireRole('driver', 'fleet_manager'), (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (!['Draft', 'Dispatched'].includes(trip.status)) {
    return res.status(400).json({ error: `Cannot cancel a trip in status ${trip.status}` });
  }

  const tx = db.transaction(() => {
    db.prepare(`UPDATE trips SET status='Cancelled' WHERE id=?`).run(trip.id);
    if (trip.status === 'Dispatched') {
      db.prepare(`UPDATE vehicles SET status='Available' WHERE id=?`).run(trip.vehicle_id);
      db.prepare(`UPDATE drivers SET status='Available' WHERE id=?`).run(trip.driver_id);
    }
  });
  tx();

  res.json({ id: trip.id, status: 'Cancelled' });
});

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM trips ORDER BY created_at DESC').all());
});

module.exports = router;
