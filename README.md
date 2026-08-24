# Society Maintenance Tracker

A full-stack end-to-end platform for apartment societies to raise, track, and manage maintenance complaints with photo attachments, SLA-driven overdue tracking, an audit history trail, society notices, and email notifications.

---

## Live Hosted Application and Endpoints

- Live Application (Frontend UI): https://society-maintenance-tracker-ebon.vercel.app
- Live Backend API: https://society-tracker-api-jrlq.onrender.com
- Health Check: https://society-tracker-api-jrlq.onrender.com/health
- Database: Managed PostgreSQL on Neon.tech

---

## Deliverables Summary

1. Complete Source Code: Fully structured source code without temporary files or dependencies committed.
2. README: Comprehensive setup guide, .env.example, detailed API documentation, and PostgreSQL database schema.
3. Hosted Application: Live web application deployed on Vercel + Render + Neon.
4. System Design Write-up: Contained in system-design-writeup.md (covers complaint history model, query-time overdue detection, photo handling, and async notification flow with audit retries under 800 words).

---

## Tech Stack

- Frontend: React 18, Vite, React Router v6, Axios, Vanilla CSS
- Backend: Node.js (ES Modules), Express.js, PostgreSQL (pg connection pool with SSL), JWT Authentication, Multer (multipart photo uploads), Nodemailer
- Database: PostgreSQL with custom ENUMs, triggers, indexes, and an append-only audit trail
- Deployment: Vercel (Frontend SPA), Render (Backend API Web Service), Neon (Cloud PostgreSQL)

---

## Project Structure

```
society-maintenance-tracker/
|-- README.md
|-- system-design-writeup.md
|-- schema.sql
|-- backend/
|   |-- .env.example
|   |-- package.json
|   |-- schema.sql
|   |-- src/
|       |-- app.js
|       |-- server.js
|       |-- config/
|       |   |-- db.js
|       |-- controllers/
|       |   |-- authController.js
|       |   |-- complaintController.js
|       |   |-- dashboardController.js
|       |   |-- noticeController.js
|       |-- middleware/
|       |   |-- auth.js
|       |   |-- upload.js
|       |-- routes/
|       |   |-- authRoutes.js
|       |   |-- complaintRoutes.js
|       |   |-- dashboardRoutes.js
|       |   |-- noticeRoutes.js
|       |-- utils/
|       |   |-- mailer.js
|       |   |-- notificationService.js
|       |-- uploads/
\-- frontend/
    |-- index.html
    |-- package.json
    |-- vite.config.js
    |-- vercel.json
    |-- .env.example
    |-- src/
        |-- App.jsx
        |-- main.jsx
        |-- index.css
        |-- api/
        |   |-- client.js
        |-- components/
        |   |-- NavBar.jsx
        |   |-- ProtectedRoute.jsx
        |-- context/
        |   |-- AuthContext.jsx
        |-- pages/
            |-- AdminDashboard.jsx
            |-- ComplaintDetail.jsx
            |-- Login.jsx
            |-- NewComplaint.jsx
            |-- NoticeBoard.jsx
            |-- Register.jsx
            |-- ResidentDashboard.jsx
```

---

## Key Features and Workflow

### 1. Role-Based Access Control (RBAC)
- Residents: Register, log in, create maintenance complaints with category and photo attachments, view own tickets, and inspect the chronological resolution history.
- Admins: View all complaints, filter by status/category/date, update status and priority with notes, post notices (with important broadcasts), view high-level dashboard metrics, and trigger email retries.

### 2. Event-Sourced Complaint History
- Every change (creation, status transition, priority alteration, admin notes) is appended to complaint_history inside an atomic database transaction.
- complaints.current_status serves as an in-sync denormalized cache for fast querying, while complaint_history provides an immutable audit log.

### 3. Dynamic SLA Overdue Tracking
- Overdue status is computed at query time using categories.sla_days and NOW() - created_at > (sla_days || ' days')::interval.
- Overdue complaints automatically float to the top of the admin dashboard (ORDER BY is_overdue DESC, created_at ASC) without stale cached flags.

### 4. Resilient Notification System
- Status transitions and important notices record rows in notification_log.
- Deliveries are attempted asynchronously without blocking API responses.
- Failed deliveries can be retried automatically or on-demand by admins via POST /api/dashboard/retry-notifications.

---

## API Documentation

All endpoints (except /api/auth/* and GET /health) require Authorization: Bearer <token>.

### Authentication
| Method | Endpoint | Access | Request Body | Description |
|---|---|---|---|---|
| POST | /api/auth/register | Public | { "name", "email", "password", "apartment_no" } | Registers a resident user |
| POST | /api/auth/login | Public | { "email", "password" } | Logs in and returns user object + JWT token |

### Complaints
| Method | Endpoint | Role | Query / Body | Description |
|---|---|---|---|---|
| POST | /api/complaints | Resident | multipart/form-data: category_id, description, priority, photo | Creates a complaint and initial history event |
| GET | /api/complaints/mine | Resident | ?page=1&limit=10 | Returns paginated list of resident's own complaints |
| GET | /api/complaints/:id/history | Resident (owner) / Admin | id parameter | Returns complaint details and chronological history timeline |
| GET | /api/complaints | Admin | ?status=&category_id=&date_from=&date_to=&page=1&limit=20 | Returns filtered, paginated complaints sorted overdue-first |
| PATCH | /api/complaints/:id | Admin | { "status", "priority", "note" } | Updates complaint, records history, and triggers async email |

### Notices
| Method | Endpoint | Role | Query / Body | Description |
|---|---|---|---|---|
| GET | /api/notices | Authenticated | ?page=1&limit=10 | Returns notices with important notices pinned first |
| POST | /api/notices | Admin | { "title", "content", "is_important" } | Creates a notice; fans out emails if marked important |

### Dashboard and Maintenance
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | /api/dashboard | Admin | Returns counts by status, by category, and total overdue count |
| POST | /api/dashboard/retry-notifications | Admin | Retries failed emails in notification_log (< 3 attempts) |
| GET | /health | Public | Health check endpoint (returns {"status":"ok"}) |

---

## Database Schema and Structure

```sql
-- Enums
CREATE TYPE user_role AS ENUM ('resident', 'admin');
CREATE TYPE complaint_status AS ENUM ('Open', 'In Progress', 'Resolved');
CREATE TYPE complaint_priority AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE history_field AS ENUM ('status', 'priority', 'note_added', 'created');
CREATE TYPE notification_type AS ENUM ('status_change', 'important_notice');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

-- Core Tables
- users (id, name, email, password_hash, role, apartment_no, is_active, created_at)
- categories (id, name, sla_days)
- complaints (id, resident_id, category_id, description, photo_url, photo_key, current_status, priority, created_at, updated_at, resolved_at)
- complaint_history (id, complaint_id, actor_id, actor_role, field_changed, old_value, new_value, note, created_at)
- notices (id, admin_id, title, content, is_important, created_at)
- notification_log (id, user_id, type, related_id, status, attempts, last_error, created_at, sent_at)
```

---

## Local Setup Guide

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running locally

### 2. Database Initialization
```bash
createdb maintenance_tracker
psql maintenance_tracker -f backend/schema.sql
```

### 3. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 5. Creating Your First Admin
Register a resident account via the UI, then promote the account in PostgreSQL:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
```

---

## Cloud Deployment Guide

1. Database (Neon.tech):
   - Create a free PostgreSQL project on Neon.
   - Run backend/schema.sql inside Neon SQL Editor.
   - Copy the Connection String with sslmode=require.

2. Backend (Render.com):
   - Create a Web Service pointing to backend/.
   - Set Build Command: npm install, Start Command: npm start.
   - Add Environment Variables (DATABASE_URL, JWT_SECRET, SMTP_*, NODE_ENV=production).

3. Frontend (Vercel.com):
   - Import Git repository pointing to frontend/.
   - Add Environment Variable VITE_API_URL set to your Render backend URL.
   - Deploy.
