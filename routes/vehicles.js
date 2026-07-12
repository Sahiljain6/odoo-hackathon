const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.post('/', requireRole('fleet_manager'), (req, res) => {
  const { registration_number, name, type, max_load_capacity, acquisition_cost, region } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO vehicles (registration_number, name, type, max_load_capacity, acquisition_cost, region)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(registration_number, name, type, max_load_capacity, acquisition_cost, region || null);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Registration number already exists' });
    res.status(500).json({ error: e.message });
  }
});

// list, with optional ?dispatchable=true to filter what a Driver sees when creating a trip
router.get('/', (req, res) => {
  if (req.query.dispatchable === 'true') {
    return res.json(db.prepare(`SELECT * FROM vehicles WHERE status = 'Available'`).all());
  }
  const { type, status, region } = req.query;
  let q = 'SELECT * FROM vehicles WHERE 1=1';
  const params = [];
  if (type) { q += ' AND type = ?'; params.push(type); }
  if (status) { q += ' AND status = ?'; params.push(status); }
  if (region) { q += ' AND region = ?'; params.push(region); }
  res.json(db.prepare(q).all(...params));
});

router.patch('/:id', requireRole('fleet_manager'), (req, res) => {
  const fields = ['name', 'type', 'max_load_capacity', 'odometer', 'status', 'region'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ updated: true });
});

module.exports = router;
