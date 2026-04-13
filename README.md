# IQ Dashboard Platform

Multi-client dashboard platform for Collective IQ.

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (multi-schema)
- **Auth:** JWT + bcrypt

## Quick Start

### 1. Backend
```bash
cd backend
cp .env.example .env      # fill in your values
npm install
npm run dev               # runs on http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev               # runs on http://localhost:5173
```

### 3. Database
Run SQL scripts in order:
```bash
psql -h 10.0.1.37 -p 5433 -U iquser -d iqdb -f sql/01_create_system_tables.sql
psql -h 10.0.1.37 -p 5433 -U iquser -d iqdb -f sql/02_seed_roles.sql
psql -h 10.0.1.37 -p 5433 -U iquser -d iqdb -f sql/03_seed_clients.sql
psql -h 10.0.1.37 -p 5433 -U iquser -d iqdb -f sql/04_seed_users.sql
psql -h 10.0.1.37 -p 5433 -U iquser -d iqdb -f sql/05_seed_user_access.sql
```

## Project Structure
See Phase 1 Architecture document for full folder structure details.
