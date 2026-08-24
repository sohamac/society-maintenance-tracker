-- ============================================================
-- Society Maintenance Tracker - Database Schema (PostgreSQL)
-- ============================================================

-- ---------- ENUM TYPES ----------
CREATE TYPE user_role AS ENUM ('resident', 'admin');
CREATE TYPE complaint_status AS ENUM ('Open', 'In Progress', 'Resolved');
CREATE TYPE complaint_priority AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE history_field AS ENUM ('status', 'priority', 'note_added', 'created');

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(120)  NOT NULL,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    role            user_role     NOT NULL DEFAULT 'resident',
    apartment_no    VARCHAR(20),                 -- e.g. "B-402"; null for admins
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- CATEGORIES  (kept as a table, not enum, so admins can add new ones)
-- ============================================================
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(80) NOT NULL UNIQUE,     -- e.g. Plumbing, Electrical, Security
    sla_days    INTEGER     NOT NULL DEFAULT 3    -- overdue threshold for this category
);

-- ============================================================
-- COMPLAINTS  (current state - denormalized cache of latest status)
-- ============================================================
CREATE TABLE complaints (
    id              SERIAL PRIMARY KEY,
    resident_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     INTEGER NOT NULL REFERENCES categories(id),
    description     TEXT    NOT NULL,
    photo_url       TEXT,                         -- nullable, object storage URL
    photo_key       TEXT,                          -- storage key, for deletion/reference
    current_status  complaint_status   NOT NULL DEFAULT 'Open',
    priority        complaint_priority NOT NULL DEFAULT 'Low',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ                    -- set when status -> Resolved
);

CREATE INDEX idx_complaints_resident ON complaints(resident_id);
CREATE INDEX idx_complaints_status   ON complaints(current_status);
CREATE INDEX idx_complaints_category ON complaints(category_id);
CREATE INDEX idx_complaints_created  ON complaints(created_at);

-- Overdue is computed at query time, e.g.:
-- SELECT c.*, cat.sla_days,
--        (c.current_status <> 'Resolved'
--         AND NOW() - c.created_at > (cat.sla_days || ' days')::interval) AS is_overdue
-- FROM complaints c JOIN categories cat ON cat.id = c.category_id
-- ORDER BY is_overdue DESC, c.created_at ASC;

-- ============================================================
-- COMPLAINT HISTORY  (append-only audit trail - source of truth)
-- ============================================================
CREATE TABLE complaint_history (
    id              SERIAL PRIMARY KEY,
    complaint_id    INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    actor_id        INTEGER NOT NULL REFERENCES users(id),
    actor_role      user_role NOT NULL,
    field_changed   history_field NOT NULL,
    old_value       VARCHAR(50),
    new_value       VARCHAR(50),
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_complaint ON complaint_history(complaint_id, created_at);

-- ============================================================
-- NOTICES  (notice board)
-- ============================================================
CREATE TABLE notices (
    id              SERIAL PRIMARY KEY,
    admin_id        INTEGER NOT NULL REFERENCES users(id),
    title           VARCHAR(200) NOT NULL,
    content         TEXT NOT NULL,
    is_important    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notices_important ON notices(is_important, created_at DESC);

-- ============================================================
-- NOTIFICATION LOG  (email delivery tracking / retry bookkeeping)
-- ============================================================
CREATE TYPE notification_type AS ENUM ('status_change', 'important_notice');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE notification_log (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    related_id      INTEGER,                 -- complaint_id or notice_id depending on type
    status          notification_status NOT NULL DEFAULT 'pending',
    attempts        INTEGER NOT NULL DEFAULT 0,
    last_error      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at         TIMESTAMPTZ
);

CREATE INDEX idx_notification_status ON notification_log(status);

-- ============================================================
-- TRIGGER: keep complaints.updated_at fresh on any row update
-- ============================================================
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_complaints_updated_at
BEFORE UPDATE ON complaints
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- SEED DATA (example categories)
-- ============================================================
INSERT INTO categories (name, sla_days) VALUES
    ('Plumbing', 3),
    ('Electrical', 2),
    ('Security', 1),
    ('Housekeeping', 5),
    ('Other', 4);
