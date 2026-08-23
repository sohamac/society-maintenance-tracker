import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Fire-and-forget style sender used by controllers. Never throws to the caller;
// logs failures so a broken mail provider never blocks a status update or notice post.
export async function sendMail({ to, subject, text, html }) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    });
    return { ok: true };
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err.message);
    return { ok: false, error: err.message };
  }
}

export function statusChangeEmail(complaint, oldStatus, newStatus, note) {
  return {
    subject: `Complaint #${complaint.id} status updated: ${newStatus}`,
    text: `Your complaint "${complaint.description.slice(0, 60)}" has moved from ${oldStatus} to ${newStatus}.${
      note ? ` Note: ${note}` : ""
    }`,
  };
}

export function importantNoticeEmail(notice) {
  return {
    subject: `Important notice: ${notice.title}`,
    text: notice.content,
  };
}
