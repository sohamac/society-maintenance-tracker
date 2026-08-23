# Society Maintenance Tracker

A platform for apartment societies to track maintenance complaints end-to-end: residents raise
complaints with photos, admins manage them through a status/priority workflow with overdue
detection, and everyone stays informed via a notice board and email notifications.

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL (`pg`), JWT auth, Multer (photo upload), Nodemailer
- **Frontend**: React (Vite), React Router, Axios
- **Database**: PostgreSQL

## Project Structure

```
society-maintenance-tracker/
├── backend/
│   ├── schema.sql              # Database schema (run this first)
│   ├── .env.example
│   └── src/
│       ├── config/db.js        # PG connection pool
│       ├── middleware/         # auth (JWT) + upload (multer)
│       ├── controllers/        # business logic
│       ├── routes/             # Express routers
│       ├── utils/mailer.js     # email sending
│       └── app.js / server.js
└── frontend/
    ├── .env.example (not needed — uses Vite proxy to backend)
    └── src/
        ├── pages/               # route-level screens
        ├── components/          # NavBar, ProtectedRoute
        ├── context/AuthContext.jsx
        └── api/client.js        # axios instance with JWT interceptor
```

## Setup Guide

### 1. Database

Create a PostgreSQL database and run the schema:

```bash
createdb maintenance_tracker
psql maintenance_tracker -f backend/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env       # fill in DATABASE_URL, JWT_SECRET, SMTP credentials
npm install
npm run dev                # starts on http://localhost:5000
```

For email, any free-tier SMTP works for local testing — a Gmail account with an
[App Password](https://support.google.com/accounts/answer/185833), or a service like Mailtrap.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # starts on http://localhost:5173, proxies /api to :5000
```

### 4. First admin account

Open registration only creates residents. Promote a user to admin directly in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

## API Documentation

All endpoints except `/auth/*` and `GET /health` require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password, apartment_no }` | Creates a resident |
| POST | `/api/auth/login` | `{ email, password }` | Returns `{ user, token }` |

### Complaints
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| POST | `/api/complaints` | resident | multipart/form-data: `category_id, description, priority, photo` |
| GET | `/api/complaints/mine` | resident | Own complaints |
| GET | `/api/complaints/:id/history` | resident (own) / admin | Full status/priority history |
| GET | `/api/complaints` | admin | Query params: `status, category_id, date_from, date_to`. Returns `is_overdue` computed per row, sorted overdue-first |
| PATCH | `/api/complaints/:id` | admin | `{ status, priority, note }` — logs to history, emails resident on status change |

### Notices
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/api/notices` | any authenticated user | Important notices pinned to top |
| POST | `/api/notices` | admin | `{ title, content, is_important }` — emails all residents if important |

### Dashboard
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/api/dashboard` | admin | `{ byStatus, byCategory, overdueCount }` |

## Database Schema

See `backend/schema.sql` for the full schema and `system-design-writeup.md` for the reasoning
behind the complaint history model, overdue detection, photo handling, and notification flow.

Key design points:
- **`complaint_history`** is an append-only audit trail (source of truth); `complaints.current_status`
  is a denormalized cache kept in sync in the same DB transaction.
- **Overdue** is computed at query time from `categories.sla_days`, not stored, so it's always accurate.
- **Photos** are stored on local disk in this scaffold (`backend/src/uploads`, served at `/uploads/*`)
  for simplicity; swap `middleware/upload.js` for a signed-URL flow to S3/Cloudinary for production,
  per the system design write-up.
- **Emails** are sent asynchronously via Nodemailer and never block the API response.

## What's Implemented vs. What's Left

Implemented: auth (register/login/JWT), complaint creation with photo upload, full history
logging, admin filtering + overdue sorting, status/priority updates with email notification,
notice board with important-notice fan-out email, admin dashboard stats.

Left as follow-up work: pagination on complaint/notice lists, refresh tokens, a proper email
queue/retry using `notification_log` (table is in the schema but not yet wired up), and
deployment configuration (Dockerfile / hosting-specific env setup for Vercel/Render/Railway).

## Deployment Notes

- Backend: any Node host (Render, Railway) — set the `.env` vars, point `DATABASE_URL` at a
  managed Postgres instance, and ensure the `uploads/` directory persists or is swapped for
  object storage before going to production (local disk storage doesn't survive redeploys on
  most PaaS platforms).
- Frontend: Vercel/Netlify — set the API base URL via a build-time env var instead of relying on
  the Vite dev proxy once backend and frontend are on different domains.
