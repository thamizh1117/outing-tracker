# Architecture & Technical Documentation

## Overview
**Project Alpha** is a full-stack Smart Hostel Outing Management System designed to handle real-time student location monitoring, outing approvals, and emergency alerts.

## Key Subsystems

### 1. Frontend (`frontend/`)
- Built with React 19, React Router v7, and Vite.
- Communicates with backend endpoints via `apiFetch` helper in `frontend/src/api.js`.
- Automatically sends GPS location updates via `PATCH /api/location/:outingId` while an outing is ongoing.

### 2. Backend (`backend/`)
- Built with Express and Mongoose (MongoDB).
- `server.js` serves API routes under `/api/*` and falls back to serving static frontend production builds.
- Background worker `jobs/outingWatcher.js` periodically checks for overdue returns and missing GPS signals.
