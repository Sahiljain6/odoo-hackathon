const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.post('/', requireRole('fleet_manager', 'safety_officer'), (req, res) => {
  const { name, license_number, license_category, license_expiry_date, contact_number } = req.body;

  if (contact_number && !/^\d{10}$/.test(contact_number)) {
    return res.status(400).json({ error: 'Contact number must be exactly 10 digits' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, license_number, license_category, license_expiry_date, contact_number);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'License number already exists' });
    res.status(500).json({ error: e.message });
  }
});

router.get('/', (req, res) => {
  if (req.query.dispatchable === 'true') {
    return res.json(db.prepare(`
      SELECT * FROM drivers WHERE status = 'Available' AND license_expiry_date >= date('now')
    `).all());
  }
  res.json(db.prepare('SELECT * FROM drivers').all());
});

// Safety Officer view: expiring/expired licenses
router.get('/compliance/expiring', requireRole('safety_officer', 'fleet_manager'), (req, res) => {
  const days = parseInt(req.query.days || '30');
  res.json(db.prepare(`
    SELECT * FROM drivers WHERE license_expiry_date <= date('now', '+' || ? || ' days')
  `).all(days));
});

router.patch('/:id', requireRole('fleet_manager', 'safety_officer'), (req, res) => {
  if (req.body.contact_number && !/^\d{10}$/.test(req.body.contact_number)) {
    return res.status(400).json({ error: 'Contact number must be exactly 10 digits' });
  }
  const fields = ['name', 'license_category', 'license_expiry_date', 'contact_number', 'safety_score', 'status'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE drivers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ updated: true });
});

module.exports = router;
