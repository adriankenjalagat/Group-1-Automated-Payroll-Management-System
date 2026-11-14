# MSU-Naawan Automated Payroll Management System (Group 1)

A full-stack automated payroll management platform designed for Mindanao State University at Naawan (MSU-Naawan). Features role-based access control, appointment and salary tracking, attendance verification, submission workflows, digital voucher approvals, and automated payslip generation.

---

## 🏗️ Architecture Overview

The project is structured into two main applications:

- **Frontend (`/frontend`)**:
  - **Framework**: React 19 + TypeScript
  - **Bundler & Dev Server**: Vite 8
  - **Styling**: Tailwind CSS 4
  - **Port**: `http://localhost:5173` (or `5174` if 5173 is in use)
  - **Routing/Portals**: Role-based portals for Employees, Supervisors, HR Office, Accounting, Signatories, Budget Office, Chancellor, Cashier, and System Administrators.

- **Backend (`/backend`)**:
  - **Framework**: Node.js + Express 5 + TypeScript
  - **Dev Runner**: `tsx watch`
  - **Port**: `http://localhost:3000`
  - **Database Client**: `pg` (PostgreSQL)
  - **Architecture**: Modular pattern (`auth`, `users`, `employees`, `payroll`, `attendance`, `attachments`, `approvals`, `disbursement`, `payslips`, `audit`)
  - **Resilience**: Features built-in fallback mock datasets, allowing full local development and testing even if PostgreSQL is not running.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on Windows:

1. **Node.js**: Version 18 or higher (v20+ or v24+ recommended).
   - Check with: `node -v`
2. **npm**: Version 9 or higher.
   - Check with: `npm -v`
3. **PostgreSQL** *(Optional for basic development; required for persistent database storage)*:
   - Version 14+ or pgAdmin 4.
   - Default port: `5432`

---

## 🚀 Quick Start Guide (Windows)

### Step 1: Clone and Navigate to the Repository

```powershell
cd c:\Users\navil\Downloads\Group-1-Automated-Payroll-Management-System
```

---

### Step 2: Configure Environment Variables

#### Backend Environment
In `backend/.env` (created from `backend/.env.example`):
```env
# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Auth / Token Secret
JWT_SECRET=msu_naawan_payroll_secret_2026

# PostgreSQL Connection (Matches your pgAdmin setup)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Automated-Payroll-Management-System
DB_USER=postgres
DB_PASSWORD=postgres
DB_MAX_POOL=10

# File Storage Settings
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
```

#### Frontend Environment
In `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

---

### Step 3: Install Dependencies

Open your terminal or PowerShell and run:

```powershell
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

---

### Step 4: Database Setup (Optional)

> **Note**: The backend is designed with a resilient fallback system. If PostgreSQL is not connected or configured yet, the backend will safely use mock in-memory data so the frontend can function immediately without crashing.

To set up the full PostgreSQL database:
1. Open pgAdmin or `psql`.
2. Create a new database named:
   ```sql
   CREATE DATABASE "Automated-Payroll-Management-System";
   ```
3. Execute the schema script located at:
   `backend/src/config/schema.sql`
4. Update `DB_USER` and `DB_PASSWORD` in `backend/.env` to match your local PostgreSQL credentials.

---

### Step 5: Start the Applications

Run the backend and frontend in two separate terminals.

#### Terminal 1: Backend Server
```powershell
cd backend
npm run dev
```
- The backend will start on **`http://localhost:3000`**.
- Verify health: Open [http://localhost:3000/api/health](http://localhost:3000/api/health) in your browser.

#### Terminal 2: Frontend Client
```powershell
cd frontend
npm run dev
```
- Vite will launch the application on **`http://localhost:5173`** (or `http://localhost:5174`).
- Open the URL shown in your browser.

---

## 👥 Demo Accounts & Credentials

You can sign in using any of the following pre-configured demonstration accounts.

| Role | Username / Identifier | Password | Access / Portal |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `rbautista` | `Payroll#2026` *(or `rbautista`)* | User management, roles, audit logs |
| **System Administrator** | `eyrolclayford.junio` | `Payroll#2026` *(or `eyrolclayford.junio`)* | System administration & settings |
| **HR Office** | `avillanueva` | `Payroll#2026` *(or `avillanueva`)* | Employee records, salary appointments |
| **Employee (Faculty)** | `angelqueen.catian` | `AN1021176an` *(or `Payroll#2026`)* | Submissions, attendance, payslips |
| **Employee (Staff)** | `msantos` | `Payroll#2026` *(or `msantos`)* | Employee portal & submissions |
| **Immediate Supervisor** | `arivera` | `Payroll#2026` *(or `arivera`)* | Pending verification & endorsements |
| **Accounting** | `jdelacruz` | `Payroll#2026` *(or `jdelacruz`)* | Payroll computation & validation |
| **Accountant** | `accountant.demo` | `Payroll#2026` *(or `accountant.demo`)* | Disbursement Voucher (DV) review |
| **Cost Center Signatory** | `etorres` | `Payroll#2026` *(or `etorres`)* | Department payroll sign-off |
| **Budget Office** | `mlim` | `Payroll#2026` *(or `mlim`)* | Fund allocation & certification |
| **Office of the Chancellor**| `tnavarro` | `Payroll#2026` *(or `tnavarro`)* | Final approval for disbursement |
| **Cashier** | `caquino` | `Payroll#2026` *(or `caquino`)* | Check/ADA release & disbursement |

> **Master Demo Password**: If in doubt, `Payroll#2026` works across demo accounts.

---

## 🛠️ Verification & Troubleshooting

### 1. "Unable to connect to the payroll API server"
- **Cause**: The frontend cannot reach `http://localhost:3000/api`.
- **Solution**: Ensure the backend is running (`cd backend && npm run dev`). Check that `frontend/.env` contains `VITE_API_URL=http://localhost:3000/api`.

### 2. "Port 5173 is in use, trying another one..."
- **Cause**: On Windows, Hyper-V or existing processes might reserve port 5173.
- **Solution**: Vite will automatically select `5174`. The backend CORS policy is dynamically configured to allow any local frontend port.

### 3. PostgreSQL Connection Warning (`[DB] Notice: Could not connect...`)
- **Cause**: PostgreSQL service is stopped or credentials in `backend/.env` do not match.
- **Solution**: The backend automatically falls back to built-in data. If you want PostgreSQL enabled, start the PostgreSQL service and check `DB_PASSWORD` in `backend/.env`.

### 4. Production Build Test
To verify production builds for both apps:
```powershell
# Backend build
cd backend
npm run build

# Frontend build
cd frontend
npm run build
```

---

## 📁 Repository Structure

```text
Group-1-Automated-Payroll-Management-System/
├── backend/
│   ├── src/
│   │   ├── config/          # Database connection, schema.sql, storage
│   │   ├── middleware/      # JWT auth and role-based guards
│   │   ├── modules/         # Modular feature domain services & controllers
│   │   │   ├── approvals/
│   │   │   ├── attachments/
│   │   │   ├── attendance/
│   │   │   ├── audit/
│   │   │   ├── auth/
│   │   │   ├── disbursement/
│   │   │   ├── employees/
│   │   │   ├── payroll/
│   │   │   ├── payslips/
│   │   │   └── users/
│   │   ├── app.ts           # Express setup, CORS, router mounts
│   │   └── server.ts        # Server entry point & DB bootstrap
│   ├── .env                 # Local backend environment
│   ├── .env.example         # Template backend environment
│   └── package.json
├── frontend/
│   ├── public/              # Assets, logo, icons
│   ├── src/
│   │   ├── api/             # Typed API clients for backend integration
│   │   ├── auth/            # Authentication flows, role switching, mock users
│   │   ├── components/      # UI components
│   │   ├── portal/          # Role portals (HR, Accounting, Supervisor, etc.)
│   │   ├── admin/           # Admin dashboard & user management
│   │   ├── App.tsx          # Root component
│   │   └── main.tsx         # React entry point
│   ├── .env                 # Frontend environment (VITE_API_URL)
│   └── package.json
└── README.md                # Setup documentation
```

