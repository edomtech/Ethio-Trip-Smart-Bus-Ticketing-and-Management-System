# EthioBus — Smart Bus Ticketing System

EthioBus is a full-stack, enterprise-grade web application built to modernize inter-city bus ticketing across Ethiopia. The platform provides a seamless experience for passengers to search routes, select seats, complete payments, and download QR e-tickets, while equipping agents and administrators with real-time operational tools.

---

## 🌟 Key Features

* **Passenger Portal**: Search bus schedules, view interactive seat maps, reserve seats, pay online, and generate/download QR-coded PDF tickets.
* **Agent Portal**: Verify passenger tickets by ticket number or QR code, view daily dispatch schedules, and issue/print boarding passes.
* **Admin Dashboard**: Comprehensive management of fleet buses, routes, timetables, system users, agents, revenue reports, and customer support tickets.
* **Dark / Light Mode**: Built-in responsive UI supporting dynamic theme switching.

---

## 🏗️ Architecture & Technology Stack

```
smart-bus-ticketing-system/
├── frontend/    # React 19 + Vite UI SPA
└── backend/     # Node.js + Express REST API + MongoDB
```

### Frontend Stack
- **Framework**: React 19 + Vite
- **Routing**: React Router DOM (v6+)
- **HTTP Client**: Axios with JWT Interceptors
- **UI Components**: Lucide React icons, Tailwind-inspired Vanilla CSS Design Tokens
- **Utilities**: QRCode.react, jsPDF, React Toastify, Chart.js

### Backend Stack
- **Runtime & Server**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM) with optional in-memory fallback
- **Authentication**: JSON Web Tokens (JWT) + bcryptjs password hashing
- **Middleware**: CORS, Morgan HTTP logging, centralized error handling

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB** (Local instance running at `mongodb://127.0.0.1:27017` or MongoDB Atlas)

---

### 2. Environment Setup

#### Backend Configuration ([backend/.env](file:///c:/Users/DBU%20User/Desktop/smart-bus-ticketing-system/backend/.env)):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ethiobus
JWT_SECRET=ethiobus_super_secret_jwt_key_2026
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

#### Frontend Configuration ([frontend/.env](file:///c:/Users/DBU%20User/Desktop/smart-bus-ticketing-system/frontend/.env)):
```env
VITE_API_URL=http://localhost:5000/api
```

---

### 3. Installation & Database Seeding

#### Step 1: Install Dependencies
From the root project directory:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

#### Step 2: Seed MongoDB Database
In the `backend` folder, run the database seeder to populate sample users, buses, routes, and schedules:

```bash
cd backend
npm run seed
```

---

### 4. Running the Application

You can start both servers simultaneously from the root directory:

```bash
npm run dev
```

Or start them individually:

* **Start Backend**: `npm run start:backend` (runs on `http://localhost:5000`)
* **Start Frontend**: `npm run start:frontend` (runs on `http://localhost:5173`)

---

## 🔑 Default Test Accounts

After running `npm run seed`, you can log in using any of the following accounts:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Passenger** | `passenger@example.com` | `password123` | Book tickets, select seats, view history |
| **Agent** | `agent@ethiobus.com` | `password123` | Verify tickets, print boarding passes |
| **Admin** | `admin@ethiobus.com` | `password123` | Manage buses, routes, schedules, users & reports |

---

## 📡 API Overview

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register passenger account | Public |
| `POST` | `/api/auth/login` | User login (all roles) | Public |
| `GET` | `/api/auth/me` | Fetch authenticated profile | Any authenticated user |
| `GET` | `/api/schedules/search` | Search schedules (from, to, date) | Public |
| `GET` | `/api/schedules/:id/seats` | Get real-time seat availability map | Public |
| `POST` | `/api/bookings` | Create bus booking | Passenger |
| `GET` | `/api/bookings/my` | View passenger booking history | Passenger |
| `GET` | `/api/tickets/verify/:no` | Verify ticket validity | Agent / Admin |
| `GET` | `/api/reports/overview` | Dashboard analytics | Admin |

---

## 📄 License

This project is licensed under the MIT License.
