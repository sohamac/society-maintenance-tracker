import { pool } from "../config/db.js";
import { statusChangeEmail } from "../utils/mailer.js";
import { notify } from "../utils/notificationService.js";

// Resident: create a new complaint. Photo (if any) is already on disk via multer;
// req.file.path is used to build a servable URL.
export async function createComplaint(req, res) {
  const { category_id, description, priority } = req.body;
  if (!category_id || !description) {
    return res.status(400).json({ error: "category_id and description are required" });
  }
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const complaintResult = await client.query(
      `INSERT INTO complaints (resident_id, category_id, description, photo_url, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, category_id, description, photoUrl, priority || "Low"]
    );
    const complaint = complaintResult.rows[0];

    await client.query(
      `INSERT INTO complaint_history (complaint_id, actor_id, actor_role, field_changed, old_value, new_value)
       VALUES ($1, $2, $3, 'created', NULL, 'Open')`,
      [complaint.id, req.user.id, req.user.role]
    );

    await client.query("COMMIT");
    res.status(201).json(complaint);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to create complaint" });
  } finally {
    client.release();
  }
}

// Resident: list own complaints (paginated)
export async function getMyComplaints(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT c.*, cat.name AS category_name
         FROM complaints c JOIN categories cat ON cat.id = c.category_id
         WHERE c.resident_id = $1
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM complaints WHERE resident_id = $1`, [req.user.id]),
    ]);

    const total = Number(count.rows[0].count);
    res.json({
      data: rows.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
}

// Resident or Admin: full history of one complaint (with access check)
export async function getComplaintHistory(req, res) {
  const { id } = req.params;
  try {
    const complaint = await pool.query("SELECT * FROM complaints WHERE id = $1", [id]);
    if (!complaint.rows.length) return res.status(404).json({ error: "Complaint not found" });

    if (req.user.role === "resident" && complaint.rows[0].resident_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const history = await pool.query(
      `SELECT h.*, u.name AS actor_name
       FROM complaint_history h JOIN users u ON u.id = h.actor_id
       WHERE h.complaint_id = $1
       ORDER BY h.created_at ASC`,
      [id]
    );
    res.json({ complaint: complaint.rows[0], history: history.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
}

// Admin: list all complaints, with filters + computed overdue flag (paginated)
export async function getAllComplaints(req, res) {
  const { status, category_id, date_from, date_to } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const conditions = [];
  const values = [];
  let i = 1;

  if (status) { conditions.push(`c.current_status = $${i++}`); values.push(status); }
  if (category_id) { conditions.push(`c.category_id = $${i++}`); values.push(category_id); }
  if (date_from) { conditions.push(`c.created_at >= $${i++}`); values.push(date_from); }
  if (date_to) { conditions.push(`c.created_at <= $${i++}`); values.push(date_to); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    // Pagination is applied AFTER the overdue-first sort, so page 1 always
    // surfaces the most urgent complaints regardless of page size.
    const rowsResult = await pool.query(
      `SELECT c.*, cat.name AS category_name, cat.sla_days, u.name AS resident_name,
              (c.current_status <> 'Resolved'
               AND NOW() - c.created_at > (cat.sla_days || ' days')::interval) AS is_overdue
       FROM complaints c
       JOIN categories cat ON cat.id = c.category_id
       JOIN users u ON u.id = c.resident_id
       ${where}
       ORDER BY is_overdue DESC, c.created_at ASC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM complaints c ${where}`,
      values
    );

    const total = Number(countResult.rows[0].count);
    res.json({
      data: rowsResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
}

// Admin: update status and/or priority; always logs to history; emails resident on status change
export async function updateComplaint(req, res) {
  const { id } = req.params;
  const { status, priority, note } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query("SELECT * FROM complaints WHERE id = $1 FOR UPDATE", [id]);
    if (!current.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Complaint not found" });
    }
    const before = current.rows[0];

    const updated = await client.query(
      `UPDATE complaints
       SET current_status = COALESCE($1, current_status),
           priority = COALESCE($2, priority),
           resolved_at = ${status === "Resolved" ? "NOW()" : "resolved_at"}
       WHERE id = $3
       RETURNING *`,
      [status || null, priority || null, id]
    );
    const after = updated.rows[0];

    if (status && status !== before.current_status) {
      await client.query(
        `INSERT INTO complaint_history (complaint_id, actor_id, actor_role, field_changed, old_value, new_value, note)
         VALUES ($1, $2, $3, 'status', $4, $5, $6)`,
        [id, req.user.id, req.user.role, before.current_status, status, note || null]
      );
    }
    if (priority && priority !== before.priority) {
      await client.query(
        `INSERT INTO complaint_history (complaint_id, actor_id, actor_role, field_changed, old_value, new_value, note)
         VALUES ($1, $2, $3, 'priority', $4, $5, $6)`,
        [id, req.user.id, req.user.role, before.priority, priority, note || null]
      );
    }

    await client.query("COMMIT");

    // Notify resident on status change (async, never blocks the response)
    if (status && status !== before.current_status) {
      const residentResult = await pool.query("SELECT email FROM users WHERE id = $1", [before.resident_id]);
      const email = residentResult.rows[0]?.email;
      if (email) {
        const { subject, text } = statusChangeEmail(after, before.current_status, status, note);
        // Logged to notification_log (status/attempts tracked) and retryable if it fails.
        // Not awaited on the response path — fire-and-forget so a slow SMTP call never
        // delays the API response.
        notify({ userId: before.resident_id, type: "status_change", relatedId: id, to: email, subject, text });
      }
    }

    res.json(after);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to update complaint" });
  } finally {
    client.release();
  }
}
