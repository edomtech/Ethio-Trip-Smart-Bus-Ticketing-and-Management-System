# Ethio Trip — Smart Bus Ticketing System

## Project Overview
Ethio Trip is a centralized Ethiopian bus ticketing and management platform. It enables multiple bus companies (e.g., Selam Bus, Sky Bus) to manage their fleets, routes, schedules, and ticket verifications while allowing passengers to search schedules, book one-way or round trips, select seats, make payments via Chapa, view boarded/not-boarded status, and download digital E-Tickets with QR codes.

## Technologies Used
- Frontend: 
React, 
Vite, 
React Router, 
Axios, 
React Icons, 
QRCode.react, 
jsPDF, Chart.js, 
React Toastify
-Backend: 
Node.js, 
Express.js, 
JWT Authentication, 
RESTful APIs
- **Database**: MongoDB with Mongoose ODM
- **Payment Gateway**: Chapa API Integration (with refund processing)

## Setup & Running
Run the project using two separate terminals:

### Terminal 1: Backend
```bash
cd backend
npm install
npm run seed     # Seeds demo companies, users, buses, routes, and schedules
npm run dev      # Starts backend API on http://localhost:5000
```

### Terminal 2: Frontend

cd frontend
npm install
npm run dev      



