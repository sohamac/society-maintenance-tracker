import { pool } from "../config/db.js";
import { importantNoticeEmail } from "../utils/mailer.js";
import { notify } from "../utils/notificationService.js";

// List notices with pagination
export async function getNotices(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  try {
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM notices ORDER BY is_important DESC, created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM notices`),
    ]);

    const total = Number(count.rows[0].count);
    res.json({
      data: rows.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notices" });
  }
}

// Create a new notice
export async function createNotice(req, res) {
  const { title, content, is_important } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "title and content are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO notices (admin_id, title, content, is_important)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, title, content, !!is_important]
    );
    const notice = result.rows[0];

    // Fan-out email if marked important
    if (notice.is_important) {
      const residents = await pool.query(
        "SELECT id, email FROM users WHERE role = 'resident' AND is_active = TRUE"
      );
      const { subject, text } = importantNoticeEmail(notice);
      residents.rows.forEach((r) =>
        notify({ userId: r.id, type: "important_notice", relatedId: notice.id, to: r.email, subject, text })
      );
    }

    res.status(201).json(notice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create notice" });
  }
}
