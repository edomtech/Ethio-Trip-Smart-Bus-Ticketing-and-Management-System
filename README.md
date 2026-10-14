# Ethio Trip — Smart Bus Ticketing & Management System

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-5.0%2B-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)

---

## Project Overview

Ethio Trip is a modern, full-stack multi-operator bus ticketing and transport management platform built for Ethiopian intercity travel.
It allows passengers to search routes, select bus seats in real time, complete digital payments, and download cryptographic QR tickets.
Transport operators and conductors get isolated tenant portals to manage bus fleets, schedule departures, review manifests, and scan passenger tickets.
The entire platform provides end-to-end multi-tenant security, multilingual accessibility, automated seat reservation holds, and responsive mobile interfaces.

---

## Technologies Used

### Frontend Architecture
- **Framework & Build**: React 19, React Router 7, Vite 8
- **Styling & Design**: Tailwind CSS v4 (using `@tailwindcss/vite` plugin and modern `@theme` design tokens)
- **State & Context**: React Context API (`AuthContext`, `ThemeContext`, `NotificationContext`)
- **Internationalization (i18n)**: Multi-language support (English, Amharic, Afaan Oromoo)
- **Data Visualization**: Chart.js and `react-chartjs-2`
- **QR & Documents**: `qrcode.react`, native HTML5 camera QR scanner, and `jspdf` for travel pass downloads
- **Icons & UI Notifications**: `react-icons`, `react-toastify`

### Backend Architecture
- **Runtime & API**: Node.js (v18+) and Express 4
- **Database & Modeling**: MongoDB with Mongoose 8 ODM
- **Authentication & Security**: JSON Web Tokens (JWT), `bcryptjs`, Google OAuth (`google-auth-library`), `helmet`, `express-rate-limit`, `express-mongo-sanitize`, and strict CORS policies
- **Payment Processing**: Chapa API integration with raw HMAC-SHA256 webhook signature validation
- **Email & Communications**: Nodemailer SMTP relay with hashed OTP verification
- **Media & Cloud**: Cloudinary CDN for fleet imagery and receipt verification
- **Artificial Intelligence**: Google Gemini API (`@google/genai`) for the integrated smart travel assistant

---

## Project Setup & Installation

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **MongoDB**: `v5.0` or higher (running locally or a cloud MongoDB Atlas instance)

---

### 1. Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create your local environment file from the template:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with your local database connection and configuration parameters:
   - `PORT`: Server port (default: `5000`)
   - `NODE_ENV`: Application environment (`development` or `production`)
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random cryptographic secret string
   - `FRONTEND_URL`: Allowed frontend origin URL (e.g. `http://localhost:5173`)
   - `CHAPA_SECRET_KEY` & `CHAPA_WEBHOOK_SECRET`: Your payment gateway credentials
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Your SMTP mail credentials for OTP delivery

5. Seed the database with initial routes, operators, and sample configurations:
   ```bash
   npm run seed
   ```

6. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:5000`. You can test service health at `http://localhost:5000/health`.

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Create your local environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Set your frontend environment variables in `.env`:
   - `VITE_API_URL`: Backend API base URL (e.g. `http://localhost:5000/api`)
   - `VITE_GOOGLE_CLIENT_ID`: (Optional) Your Google OAuth client ID

5. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The application client will be accessible at `http://localhost:5173`.

---

## Project Structure

```text
smart-bus-ticketing-system/
├── backend/
│   ├── config/              # Database connection and payment settings
│   ├── constants/           # Platform roles, statuses, and branding
│   ├── controllers/         # API route orchestrators
│   ├── middleware/          # JWT authentication, role guards, and error handler
│   ├── models/              # Mongoose database schemas
│   ├── routes/              # Express API endpoints
│   ├── services/            # Business logic and multi-tenant security
│   ├── .env.example         # Backend environment variable template
│   ├── package.json         # Backend dependencies & scripts
│   ├── seed.js              # Database seed script
│   └── server.js            # Express server entry point
│
├── frontend/
│   ├── public/              # Static public assets, images, and logos
│   ├── src/
│   │   ├── components/      # Reusable UI components & modals
│   │   ├── contexts/        # Auth, Theme, and Notification state providers
│   │   ├── i18n/            # Translations (English, Amharic, Oromo)
│   │   ├── layouts/         # Page and dashboard layouts
│   │   ├── pages/           # Public pages and role-specific dashboards
│   │   ├── routes/          # Application routes and role-based route guards
│   │   ├── utils/           # Axios API client, storage helpers, validators
│   │   ├── App.jsx          # Root application component
│   │   ├── index.css        # Tailwind CSS v4 entry & theme definition
│   │   └── main.jsx         # React application DOM entry point
│   ├── .env.example         # Frontend environment variable template
│   ├── package.json         # Frontend dependencies & scripts
│   └── vite.config.js       # Vite build configuration with Tailwind v4 plugin
│
└── README.md                # Project documentation
```

---

## License

This project is licensed under the [MIT License](LICENSE).