const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// CREATE maintenance record -> vehicle goes In Shop, kicked out of dispatch pool
router.post('/', requireRole('fleet_manager'), (req, res) => {
  const { vehicle_id, description, cost } = req.body;
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  if (vehicle.status === 'On Trip') {
    return res.status(400).json({ error: 'Cannot open maintenance while vehicle is on an active trip' });
  }

  const tx = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO maintenance_logs (vehicle_id, description, cost, status) VALUES (?, ?, ?, 'Active')
    `).run(vehicle_id, description, cost || 0);
    db.prepare(`UPDATE vehicles SET status='In Shop' WHERE id=?`).run(vehicle_id);
    return result.lastInsertRowid;
  });
  const id = tx();

  res.status(201).json({ id, vehicle_status: 'In Shop' });
});

// CLOSE maintenance -> vehicle back to Available (unless Retired)
router.patch('/:id/close', requireRole('fleet_manager'), (req, res) => {
  const log = db.prepare('SELECT * FROM maintenance_logs WHERE id = ?').get(req.params.id);
  if (!log) return res.status(404).json({ error: 'Maintenance log not found' });
  if (log.status === 'Closed') return res.status(400).json({ error: 'Already closed' });

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(log.vehicle_id);

  const tx = db.transaction(() => {
    db.prepare(`UPDATE maintenance_logs SET status='Closed', closed_at=CURRENT_TIMESTAMP WHERE id=?`).run(log.id);
    if (vehicle.status !== 'Retired') {
      db.prepare(`UPDATE vehicles SET status='Available' WHERE id=?`).run(vehicle.id);
    }
  });
  tx();

  res.json({ id: log.id, status: 'Closed' });
});

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM maintenance_logs ORDER BY created_at DESC').all());
});

module.exports = router;
