# TransitOps — Architecture & Build Approach

## 1. Architecture

```
┌─────────────────────┐        JWT Bearer         ┌──────────────────────────┐
│   Frontend (React    │ ───────────────────────▶ │   Express API (Node)      │
│   or plain HTML/JS)  │ ◀─────────────────────── │   /api/auth, /vehicles,   │
│                       │        JSON               │   /drivers, /trips,       │
└─────────────────────┘                            │   /maintenance, /reports  │
                                                     └────────────┬──────────────┘
                                                                  │
                                                     ┌────────────▼──────────────┐
                                                     │  SQLite (better-sqlite3)   │
                                                     │  single file, zero setup   │
                                                     └────────────────────────────┘
```

**One backend service, one DB file.** No microservices, no message queue —
none of that buys you anything in 8 hours. All the "smart" behavior
(status transitions, validation) is enforced **server-side in the route
handlers**, inside SQL transactions, so the state machine can never end up
inconsistent even if the frontend sends bad requests.

## 2. Why these choices

| Decision | Reasoning |
|---|---|
| **SQLite via better-sqlite3** | Zero config, synchronous API (no async/await ceremony), single file — no Postgres install/connection string debugging eating hackathon time. Swap to Postgres later only if you need concurrent writers. |
| **JWT + role in payload** | RBAC without a sessions table. Role check = one `requireRole(...)` middleware line per route. |
| **Business rules in backend, not frontend** | Frontend validation is UX sugar; the *graded* requirement is that invalid states are impossible. Enforce once, in one place, in a DB transaction. |
| **Status transitions as explicit endpoints** (`/dispatch`, `/complete`, `/cancel`, `/close`) rather than a generic `PATCH /trips/:id` | Each endpoint encodes exactly one legal transition + its side effects (vehicle/driver status flip). Makes the state machine obvious to demo and impossible to bypass. |
| **CSV export via manual string join** | No library needed for a flat export — one less dependency, one less thing to break. |

## 3. Core state machine (the part that gets graded hardest)

```
Trip:      Draft ──dispatch──▶ Dispatched ──complete──▶ Completed
             │                     │
             └──cancel──▶ Cancelled ◀──cancel──┘

Vehicle:   Available ⇄ On Trip (via trip dispatch/complete/cancel)
           Available ⇄ In Shop (via maintenance create/close)
           Retired   (terminal, never re-enters pool)

Driver:    Available ⇄ On Trip (via trip dispatch/complete/cancel)
           Off Duty / Suspended (manual, blocks dispatch)
```

Every transition above is one route in `routes/trips.js` or
`routes/maintenance.js`, wrapped in a `db.transaction()` so the trip status
and the vehicle/driver status update atomically — that's what stops the
"vehicle stuck On Trip forever" class of bug during a live demo.

## 4. File map (what's in this scaffold)

```
transitops/
├── server.js              # entrypoint, mounts all routes
├── db/
│   ├── schema.sql          # all 7 entities + status CHECK constraints
│   └── index.js             # opens sqlite file, runs schema on boot
├── middleware/
│   └── auth.js              # JWT verify + requireRole(...)
└── routes/
    ├── auth.js               # register/login
    ├── vehicles.js           # CRUD + ?dispatchable=true filter
    ├── drivers.js            # CRUD + license-expiry compliance endpoint
    ├── trips.js               # create/dispatch/complete/cancel — THE core logic
    ├── maintenance.js         # create (→In Shop) / close (→Available)
    └── reports.js              # dashboard KPIs, per-vehicle ROI/efficiency, CSV export
```

## 5. Run it

```bash
cd transitops
npm install
npm start          # http://localhost:4000
```

Quick smoke test (mirrors the spec's example workflow):
```bash
# 1. register + login as fleet_manager, grab token
curl -X POST localhost:4000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Cid","email":"fm@x.com","password":"pass123","role":"fleet_manager"}'
curl -X POST localhost:4000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"fm@x.com","password":"pass123"}'
# copy token from response into $TOKEN

# 2. register vehicle
curl -X POST localhost:4000/api/vehicles -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"registration_number":"Van-05","name":"Van 05","type":"Van","max_load_capacity":500,"acquisition_cost":800000}'

# 3. register driver
curl -X POST localhost:4000/api/drivers -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Alex","license_number":"L123","license_expiry_date":"2027-01-01"}'

# 4. create + dispatch + complete a trip, then check dashboard
curl -X POST localhost:4000/api/trips -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"source":"Mumbai","destination":"Pune","vehicle_id":1,"driver_id":1,"cargo_weight":450,"planned_distance":150}'
curl -X PATCH localhost:4000/api/trips/1/dispatch -H "Authorization: Bearer $TOKEN"
curl -X PATCH localhost:4000/api/trips/1/complete -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"final_odometer":150,"fuel_consumed":12,"revenue":5000}'
curl localhost:4000/api/reports/dashboard -H "Authorization: Bearer $TOKEN"
```

## 6. 8-hour execution plan

| Time | Task |
|---|---|
| **0:00–0:30** | Repo setup, `npm install`, confirm server boots, schema applies. Split: one person backend, one person frontend from minute 1 (don't wait for backend to "finish"). |
| **0:30–2:30** | Auth + Vehicles + Drivers CRUD (this scaffold already has it — extend as needed) |
| **2:30–4:30** | Trips (create/dispatch/complete/cancel) — **highest point value**, get this rock solid and demo-able before touching anything else |
| **4:30–5:30** | Maintenance workflow + fuel/expense logging |
| **5:30–6:30** | Dashboard KPIs + reports (fuel efficiency, ROI, CSV export) |
| **6:30–7:30** | Frontend polish, wire real API calls, RBAC-based UI hiding |
| **7:30–8:00** | Buffer — bugs will eat this. Do NOT start bonus features (dark mode, email reminders) before this buffer is confirmed empty. |

**Bonus features are last, in this order of effort-to-points ratio:**
1. Charts (quick with Chart.js on top of `/reports/dashboard`)
2. Search/filter/sort (mostly already stubbed via query params in `vehicles.js`/`drivers.js`)
3. PDF export, dark mode, email reminders — only if the buffer survives

## 7. What to say in the demo (judges love hearing this)
Walk through the exact example workflow from the spec (Van-05 / Alex) live —
create vehicle → create driver → create trip with 450kg → dispatch → show
vehicle/driver flip to "On Trip" → complete → show both flip back → open
maintenance → show vehicle disappears from `?dispatchable=true` → close
maintenance → show it reappears. That single walkthrough proves every
mandatory business rule in under 2 minutes.
