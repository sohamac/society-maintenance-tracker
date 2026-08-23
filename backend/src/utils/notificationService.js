import { pool } from "../config/db.js";
import { sendMail } from "./mailer.js";

const MAX_ATTEMPTS = 3;

// Wraps sendMail with a notification_log row: creates a 'pending' row, attempts
// delivery immediately, and updates the row to 'sent' or 'failed'. This means
// every email attempt is auditable and failed ones can be retried later without
// re-deriving the subject/body from the original complaint/notice.
export async function notify({ userId, type, relatedId, to, subject, text, html }) {
  const logResult = await pool.query(
    `INSERT INTO notification_log (user_id, type, related_id, status, attempts)
     VALUES ($1, $2, $3, 'pending', 0)
     RETURNING id`,
    [userId, type, relatedId]
  );
  const logId = logResult.rows[0].id;

  await attemptDelivery(logId, { to, subject, text, html });
}

async function attemptDelivery(logId, { to, subject, text, html }) {
  const result = await sendMail({ to, subject, text, html });

  if (result.ok) {
    await pool.query(
      `UPDATE notification_log SET status = 'sent', attempts = attempts + 1, sent_at = NOW() WHERE id = $1`,
      [logId]
    );
  } else {
    await pool.query(
      `UPDATE notification_log
       SET status = 'failed', attempts = attempts + 1, last_error = $2
       WHERE id = $1`,
      [logId, result.error]
    );
  }
}

// Re-attempts every failed notification under MAX_ATTEMPTS, re-fetching the
// recipient's current email (in case it changed) and reconstructing the message
// from the related complaint/notice. Intended to be called by a scheduled job
// (e.g. hourly cron) or manually via the admin retry endpoint.
export async function retryFailedNotifications() {
  const failed = await pool.query(
    `SELECT nl.*, u.email
     FROM notification_log nl
     JOIN users u ON u.id = nl.user_id
     WHERE nl.status = 'failed' AND nl.attempts < $1
     ORDER BY nl.created_at ASC`,
    [MAX_ATTEMPTS]
  );

  let retried = 0;
  for (const row of failed.rows) {
    const message = await rebuildMessage(row);
    if (!message) continue; // related complaint/notice was deleted; skip
    await attemptDelivery(row.id, { to: row.email, ...message });
    retried++;
  }
  return { retried, candidates: failed.rows.length };
}

async function rebuildMessage(logRow) {
  if (logRow.type === "status_change") {
    const c = await pool.query(
      `SELECT c.*, h.old_value, h.new_value, h.note
       FROM complaints c
       LEFT JOIN complaint_history h
         ON h.complaint_id = c.id AND h.field_changed = 'status'
       WHERE c.id = $1
       ORDER BY h.created_at DESC LIMIT 1`,
      [logRow.related_id]
    );
    if (!c.rows.length) return null;
    const complaint = c.rows[0];
    return {
      subject: `Complaint #${complaint.id} status updated: ${complaint.current_status}`,
      text: `Your complaint has moved to ${complaint.current_status}.${
        complaint.note ? ` Note: ${complaint.note}` : ""
      }`,
    };
  }
  if (logRow.type === "important_notice") {
    const n = await pool.query(`SELECT * FROM notices WHERE id = $1`, [logRow.related_id]);
    if (!n.rows.length) return null;
    return { subject: `Important notice: ${n.rows[0].title}`, text: n.rows[0].content };
  }
  return null;
}
