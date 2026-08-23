import { pool } from "../config/db.js";
import { retryFailedNotifications } from "../utils/notificationService.js";

export async function getDashboard(req, res) {
  try {
    const byStatus = await pool.query(
      `SELECT current_status AS status, COUNT(*) FROM complaints GROUP BY current_status`
    );
    const byCategory = await pool.query(
      `SELECT cat.name AS category, COUNT(*) FROM complaints c
       JOIN categories cat ON cat.id = c.category_id
       GROUP BY cat.name`
    );
    const overdue = await pool.query(
      `SELECT COUNT(*) FROM complaints c
       JOIN categories cat ON cat.id = c.category_id
       WHERE c.current_status <> 'Resolved'
         AND NOW() - c.created_at > (cat.sla_days || ' days')::interval`
    );

    res.json({
      byStatus: byStatus.rows,
      byCategory: byCategory.rows,
      overdueCount: Number(overdue.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
}

// Manually trigger a retry pass over failed notifications (attempts < 3).
// In production this would also run on a schedule (e.g. hourly cron) rather
// than relying solely on an admin clicking a button.
export async function retryNotifications(req, res) {
  try {
    const result = await retryFailedNotifications();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retry notifications" });
  }
}
