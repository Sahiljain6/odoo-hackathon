-- TransitOps schema (SQLite)

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('fleet_manager','driver','safety_officer','financial_analyst')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  max_load_capacity REAL NOT NULL,
  odometer REAL DEFAULT 0,
  acquisition_cost REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Available'
    CHECK(status IN ('Available','On Trip','In Shop','Retired')),
  region TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  license_category TEXT,
  license_expiry_date TEXT NOT NULL, -- ISO date
  contact_number TEXT,
  safety_score REAL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'Available'
    CHECK(status IN ('Available','On Trip','Off Duty','Suspended')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  destination TEXT NOT NULL,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  driver_id INTEGER NOT NULL REFERENCES drivers(id),
  cargo_weight REAL NOT NULL,
  planned_distance REAL NOT NULL,
  final_odometer REAL,
  fuel_consumed REAL,
  status TEXT NOT NULL DEFAULT 'Draft'
    CHECK(status IN ('Draft','Dispatched','Completed','Cancelled')),
  revenue REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  dispatched_at TEXT,
  completed_at TEXT
);

CREATE TABLE maintenance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  description TEXT NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Closed')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT
);

CREATE TABLE fuel_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  trip_id INTEGER REFERENCES trips(id),
  liters REAL NOT NULL,
  cost REAL NOT NULL,
  log_date TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  type TEXT NOT NULL, -- toll, misc, etc. maintenance/fuel tracked separately
  amount REAL NOT NULL,
  log_date TEXT DEFAULT CURRENT_TIMESTAMP
);
