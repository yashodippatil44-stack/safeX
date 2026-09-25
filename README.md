# 🛡️ SafeX (VisionX) – Smart Tourist Safety Monitoring & Incident Response System

> **Smart India Hackathon 2025 | Problem Statement ID: SIH25002**  
> *Theme:* Travel & Tourism | *Category:* Software | *Team:* VisionX

SafeX is an integrated, real-time safety network connecting tourists in vulnerable and remote travel corridors with police authorities, emergency healthcare providers, and local emergency responders.

---

## 🌟 Key Capabilities Implemented

### Phase 1: Identity & Authentication Core
- **Role-Based Access Control (RBAC)**: Distinct permissions for `TOURIST`, `POLICE`, and `ADMIN`.
- **Blockchain-Hashed Digital Tourist ID**: Generates verifiable digital identities (e.g., `VX-TRV-0001`) with cryptographic verification hashes.
- **Secure Authentication**: JWT token management and salted password hashing.

### Phase 2: GPS Telemetry, Dynamic Tracking & Geo-Fencing
- **Adaptive Battery-Saving Tracking Engine**:
  - `300s (5 min)`: In Safe Tourist Zones
  - `120s (2 min)`: In Caution Zones
  - `30s`: In High-Risk Danger Zones or Active Emergencies
- **Geofence Engine**: Haversine radial distance containment checks against Safe, Caution, Danger, and Restricted zones.
- **Automatic Breach Detection & Alerts**: Generates breach notifications and safety status updates (`SAFE`, `CAUTION`, `HIGH_RISK`, `CRITICAL`).
- **Police Live Radar Map**: Real-time Leaflet GIS mapping displaying all tourists, zone boundaries, and alerts.

### Phase 3: SOS Emergency Response, Incident Desk & Nearby Services
- **One-Tap SOS Trigger**: Confirmation guard + Emergency Type categorization (`MEDICAL`, `POLICE`, `ACCIDENT`, `LOST`, `HARASSMENT`, `OTHER`).
- **Emergency Case Lifecycle State Machine**:
  $$\text{NEW} \longrightarrow \text{ACKNOWLEDGED} \longrightarrow \text{RESPONDER\_ASSIGNED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{RESOLVED}$$
- **Duplicate SOS Prevention**: Prevents accidental redundant cases while maintaining active state for open emergencies.
- **Police Emergency Command Center**: Live queue, status counters, responder assignment, and real-time map markers (`🚨`).
- **Incident Reporting Desk**: Allows tourists to log non-emergency incidents (theft, fraud, hazards) with auto-captured coordinates.
- **Nearest Emergency Services**: Real-time Haversine distance calculation to local Police Stations, Hospitals, and Verified Hotels.

---

## 📂 Project Architecture

```
visionx/
├── backend/                  # Node.js + Express REST API
│   ├── src/
│   │   ├── config/          # DB abstraction, emergency constants, geofences
│   │   ├── controllers/     # Auth, location, geofence, emergency, incident, services
│   │   ├── middleware/      # JWT auth guard, RBAC role guard
│   │   ├── routes/          # Express route definitions
│   │   └── utils/           # Haversine distance, hash generator, seed data
│   └── test/                # Automated test suites (Phases 1, 2, 3 + Haversine)
├── police-dashboard/         # React + Vite Police Command Center
│   ├── src/
│   │   ├── components/      # Leaflet Live Radar Map, Navigation Header
│   │   ├── pages/           # Emergency Desk, Incident Desk, Live Monitor, Geo-Fences
│   │   └── services/        # Axios API client
├── mobile/                   # Flutter Mobile Tourist App
│   ├── lib/
│   │   ├── models/          # Tourist profile & safety data models
│   │   ├── screens/         # Home (SOS + Status), Map Radar, Incident Report, Login
│   │   └── services/        # API service, adaptive location background tracking
└── package.json              # Monorepo scripts
```

---

## 🚀 How to Run the Project

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- [Flutter SDK](https://flutter.dev/) (v3.24 or newer)
- Git

---

### Step 1: Start the Backend Server

```bash
cd backend
npm install
npm run dev
```

* Backend runs at: `http://localhost:5000`
* Health check: `http://localhost:5000/api/health`

---

### Step 2: Start the Police Command Dashboard

In a new terminal:

```bash
cd police-dashboard
npm install
npm run dev
```

* Dashboard opens at: `http://localhost:5173`

---

### Step 3: Run the Flutter Mobile App

In a third terminal:

```bash
cd mobile
flutter pub get
```

#### Run on Web (Chrome):
```bash
flutter run -d chrome
```

#### Run on Windows Desktop:
```bash
flutter run -d windows
```

#### Run on Android / iOS:
```bash
flutter run
```

> **Note for Android Emulators**: If running on an Android emulator, the app automatically connects to `http://10.0.2.2:5000/api`. For web or desktop, set the API host in `lib/services/api_service.dart` or use default.

---

## 🧪 Running Automated Tests

To execute all 4 backend test suites (Phase 1 Auth + Geofence Math + Phase 2 Location/Breach + Phase 3 Emergency/SOS/Incidents):

```bash
cd backend
npm test
```

All 37 test assertions will execute and report passing status.

---

## 🔑 Demo Login Credentials

### 👮 Police Officer
* **Email:** `vikram.joshi@police.meghalaya.gov.in`
* **Password:** `cop123`
* **Role:** `POLICE` (Central Police Station)

### 🎒 Tourist 1 (Primary Demo)
* **Email:** `yashodip@visionx.gov`
* **Password:** `tourist123`
* **Digital ID:** `VX-TRV-0001`
* **Role:** `TOURIST`

### 🎒 Tourist 2
* **Email:** `arun.patel@gmail.com`
* **Password:** `tourist123`
* **Digital ID:** `VX-TRV-0002`
* **Role:** `TOURIST`

---

## 🛠️ Tech Stack & Libraries

- **Backend**: Node.js, Express, JSON Store, jsonwebtoken, bcryptjs, cors, dotenv
- **Police Dashboard**: React 18, Vite, Leaflet, React-Leaflet, Lucide Icons, Vanilla CSS
- **Mobile**: Flutter, Dart, Geolocator, Google Fonts, Http, QR Flutter
- **Security**: JWT Authentication, RBAC, Haversine Coordinate Validation, Input Sanitization

---

## 📄 License

Developed for Smart India Hackathon 2025 (SIH25002) by Team VisionX. MIT License.
