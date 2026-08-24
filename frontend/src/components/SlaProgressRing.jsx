import { useEffect, useState } from "react";

export default function SlaProgressRing({ createdAt, resolvedAt, slaDays, status, size = 32, strokeWidth = 3 }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status === "Resolved") return;
    const interval = setInterval(() => setNow(Date.now()), 60000); // update every minute
    return () => clearInterval(interval);
  }, [status]);

  const start = new Date(createdAt).getTime();
  const end = status === "Resolved" && resolvedAt ? new Date(resolvedAt).getTime() : now;
  const elapsed = Math.max(0, end - start);
  const totalMs = (slaDays || 3) * 24 * 60 * 60 * 1000;
  
  const rawPercent = (elapsed / totalMs) * 100;
  const percent = Math.min(rawPercent, 100);
  const isOverdue = rawPercent > 100 && status !== "Resolved";
  
  let ringStatus = "good";
  if (isOverdue) ringStatus = "overdue";
  else if (percent > 75) ringStatus = "warning";
  else if (status === "Resolved") ringStatus = "good";

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  const msLeft = totalMs - elapsed;
  let text = "";
  if (status === "Resolved") {
    text = "Resolved";
  } else if (isOverdue) {
    const hoursOverdue = Math.floor(Math.abs(msLeft) / (1000 * 60 * 60));
    const daysOverdue = Math.floor(hoursOverdue / 24);
    if (daysOverdue > 0) text = `${daysOverdue}d overdue`;
    else text = `${hoursOverdue}h overdue`;
  } else {
    const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
    const daysLeft = Math.floor(hoursLeft / 24);
    if (daysLeft > 0) text = `${daysLeft}d left`;
    else text = `${hoursLeft}h left`;
  }

  return (
    <div className="sla-ring-container" title={`SLA: ${slaDays} days`}>
      <svg width={size} height={size} className="sla-ring-svg">
        <circle
          className="sla-ring-bg"
          cx={size / 2} cy={size / 2} r={radius}
        />
        <circle
          className={`sla-ring-progress sla-status-${ringStatus}`}
          cx={size / 2} cy={size / 2} r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={status === "Resolved" ? 0 : offset}
        />
      </svg>
      <span className={`sla-text sla-status-${ringStatus}`}>{text}</span>
    </div>
  );
}
