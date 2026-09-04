# Project Alpha — Smart Hostel Outing Management System

A real-time location monitoring and management system for student hostel outings. Built with React + Vite on the frontend and Node.js + Express + MongoDB on the backend.

---

## Project Structure

```text
Project Alpha/
│
├── frontend/             # React + Vite client application
│   ├── src/              # React components & UI logic
│   ├── public/           # Static assets
│   ├── package.json      # Client dependencies & scripts
│   ├── vite.config.js    # Vite configuration
│   └── .env              # Frontend environment variables
│
├── backend/              # Node.js + Express API server
│   ├── routes/           # Express API endpoints
│   ├── models/           # Mongoose schemas (Student, Warden, Outing, Alert, Location)
│   ├── jobs/             # Overdue check & safety background jobs
│   ├── middleware/       # JWT auth & authorization middleware
│   ├── server.js         # Server entrypoint
│   ├── package.json      # Server dependencies & scripts
│   └── .env              # Backend environment variables & secrets
│
├── docs/                 # Documentation & architectural guides
├── README.md             # Project documentation
└── .gitignore            # Workspace gitignore
```

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB instance (Atlas or local instance)

### 1. Setup Backend
```bash
cd backend
npm install
```

Configure `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/hostel-outing
JWT_SECRET=your_secret_jwt_key
```

Run Backend Server:
```bash
npm run dev
```

### 2. Setup Frontend
```bash
cd frontend
npm install
```

Configure `frontend/.env`:
```env
VITE_API_BASE=http://localhost:5000
```

Run Frontend Development Server:
```bash
npm run dev
```

---

## Features
- **Student Portal**: Register, login, submit outing requests, view outing history, check out (depart), check in (return), and trigger Emergency SOS.
- **Warden Portal**: Register, login, approve/reject pending requests, view live student location updates, acknowledge & resolve emergency alerts.
- **Live GPS Tracking & Overdue Monitoring**: Periodic GPS updates and automated background checks for overdue returns or lost signals.
