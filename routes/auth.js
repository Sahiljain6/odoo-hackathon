const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { SECRET } = require('../middleware/auth');

router.post('/register', (req, res) => {
  const { name, email, password, role } = req.body;
  const validRoles = ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const hash = bcrypt.hashSync(password, 8);
  try {
    const result = db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`)
      .run(name, email, hash, role);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, SECRET, { expiresIn: '12h' });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

module.exports = router;
