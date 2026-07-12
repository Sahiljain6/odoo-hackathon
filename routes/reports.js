const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/dashboard', (req, res) => {
  const totalVehicles = db.prepare(`SELECT COUNT(*) c FROM vehicles WHERE status != 'Retired'`).get().c;
  const available = db.prepare(`SELECT COUNT(*) c FROM vehicles WHERE status = 'Available'`).get().c;
  const inShop = db.prepare(`SELECT COUNT(*) c FROM vehicles WHERE status = 'In Shop'`).get().c;
  const activeTrips = db.prepare(`SELECT COUNT(*) c FROM trips WHERE status = 'Dispatched'`).get().c;
  const pendingTrips = db.prepare(`SELECT COUNT(*) c FROM trips WHERE status = 'Draft'`).get().c;
  const driversOnDuty = db.prepare(`SELECT COUNT(*) c FROM drivers WHERE status = 'On Trip'`).get().c;

  const utilization = totalVehicles ? Math.round((activeTrips / totalVehicles) * 100) : 0;

  res.json({
    active_vehicles: totalVehicles - inShop,
    available_vehicles: available,
    vehicles_in_maintenance: inShop,
    active_trips: activeTrips,
    pending_trips: pendingTrips,
    drivers_on_duty: driversOnDuty,
    fleet_utilization_pct: utilization
  });
});

// per-vehicle report: fuel efficiency, operational cost, ROI
router.get('/vehicle/:id', (req, res) => {
  const vehicleId = req.params.id;
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const totalFuelLiters = db.prepare(`SELECT COALESCE(SUM(liters),0) s FROM fuel_logs WHERE vehicle_id=?`).get(vehicleId).s;
  const totalFuelCost = db.prepare(`SELECT COALESCE(SUM(cost),0) s FROM fuel_logs WHERE vehicle_id=?`).get(vehicleId).s;
  const totalMaintCost = db.prepare(`SELECT COALESCE(SUM(cost),0) s FROM maintenance_logs WHERE vehicle_id=?`).get(vehicleId).s;
  const totalExpenses = db.prepare(`SELECT COALESCE(SUM(amount),0) s FROM expenses WHERE vehicle_id=?`).get(vehicleId).s;
  const totalDistance = db.prepare(`
    SELECT COALESCE(SUM(planned_distance),0) s FROM trips WHERE vehicle_id=? AND status='Completed'
  `).get(vehicleId).s;
  const totalRevenue = db.prepare(`
    SELECT COALESCE(SUM(revenue),0) s FROM trips WHERE vehicle_id=? AND status='Completed'
  `).get(vehicleId).s;

  const fuelEfficiency = totalFuelLiters ? +(totalDistance / totalFuelLiters).toFixed(2) : null;
  const operationalCost = totalFuelCost + totalMaintCost + totalExpenses;
  const roi = vehicle.acquisition_cost
    ? +(((totalRevenue - (totalMaintCost + totalFuelCost)) / vehicle.acquisition_cost)).toFixed(4)
    : null;

  res.json({
    vehicle: vehicle.registration_number,
    fuel_efficiency_km_per_l: fuelEfficiency,
    operational_cost: operationalCost,
    total_revenue: totalRevenue,
    roi
  });
});

// CSV export of trips (mandatory) - quick & dirty, no library needed
router.get('/export/trips.csv', (req, res) => {
  const trips = db.prepare('SELECT * FROM trips').all();
  const header = Object.keys(trips[0] || { id: '', status: '' }).join(',');
  const rows = trips.map(t => Object.values(t).map(v => `"${v ?? ''}"`).join(','));
  const csv = [header, ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=trips.csv');
  res.send(csv);
});

module.exports = router;
