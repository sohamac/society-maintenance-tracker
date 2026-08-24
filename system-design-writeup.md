# System Design Write-up - Society Maintenance Tracker

## 1. Complaint History Model

Every complaint is a single row in a complaints table (id, resident_id, category, description, photo_url, current_status, priority, created_at). Status is never overwritten in place. Instead, every change (creation, status transition, priority change, admin note) is appended as a new row in a separate complaint_history table:

```
complaint_history(id, complaint_id, actor_id, actor_role, field_changed,
                  old_value, new_value, note, created_at)
```

This event-sourced approach means the current state (complaints.current_status) is a denormalized cache updated on every write, while complaint_history is the source of truth for the audit trail. Benefits:

- Full traceability: who changed what, when, and why (via note), including priority edits - not just status.
- Cheap reads: the resident's "track my complaint" view reads current_status directly; the detailed timeline is a single indexed query on complaint_id ordered by created_at.
- Extensibility: adding a new trackable field (e.g., assigned technician) later only means a new field_changed value, not a schema migration.

A database transaction wraps every status update: the complaints row and the corresponding complaint_history row are written atomically, so the cached current state can never drift from the audit log.

## 2. Overdue Detection

Overdueness is computed, not stored, to avoid stale flags. Each complaint category (or a global default) has a configurable SLA in days, held in a small settings table (e.g., {category: "Plumbing", sla_days: 3}). At read time, the admin dashboard query flags a complaint as overdue when:

```
status != 'Resolved' AND (NOW() - created_at) > sla_days
```

This is implemented as a SQL CASE / computed column in the listing query rather than a background job, so the flag is always accurate even if a job has not run yet. A lightweight scheduled job (cron, every hour) does run separately, but only for the side effect of triggering an "overdue" internal notification badge for admins - the source of truth for "is this overdue" remains the live computation. Overdue complaints are sorted to the top of the admin view via ORDER BY is_overdue DESC, created_at ASC.

## 3. Photo Handling

Residents can attach one optional photo per complaint. The flow:

1. Client-side: file is validated for type (jpg/png) and size (<=5MB) before upload, with a preview shown.
2. Upload: the frontend uploads directly to object storage (e.g., Cloudinary or S3-compatible bucket via a signed URL issued by the backend), rather than routing the binary through the API server. This keeps the backend stateless and avoids large request payloads.
3. Persistence: only the returned URL (and storage key) is saved to complaints.photo_url. If upload fails, complaint creation is blocked with a clear error rather than saving a broken reference.
4. Serving: photos are served directly from the CDN URL to both resident and admin views - no proxying through the backend.

This keeps storage concerns decoupled from the core API and scales without burdening the app server with file I/O.

## 4. Notification Flow

Two triggers fire emails, both handled asynchronously so they never block the API response:

- Status change: after the complaints + complaint_history transaction commits, an event (complaint.status_changed) is pushed to a lightweight in-process/queue-based job (e.g., BullMQ, or a simple setImmediate/worker for a small-scale app). The worker looks up the resident's email and sends a templated message via a free-tier provider (e.g., Nodemailer + Gmail SMTP, or SendGrid free tier) summarizing the old -> new status and any note.
- Important notice posted: when an admin creates a notice with is_important = true, a fan-out job queries all active residents and enqueues one email per recipient, batched to respect provider rate limits.

Decoupling email sending from the request/response cycle (via a queue or background worker) ensures that a slow or failing email provider never delays a status update or blocks the UI. Failed sends are logged with retry (up to 3 attempts, exponential backoff) and surfaced in an admin-only "notification log" for debugging, but never re-block user-facing actions.
