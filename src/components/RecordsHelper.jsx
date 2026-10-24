import React, { useState } from "react";
import { Icon } from "./shared.jsx";
import { dateToday } from "../utils/date.js";
import { isWorkday, leaveRemaining, workdays } from "../utils/store.js";

export default function RecordsHelper({ data }) {
  const { session, users, attendance, leaves, company } = data;
  const me = users.find((u) => u.id === session?.id);
  const admin = session?.role === "admin";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  const answer = (question) => {
    const q = question.toLowerCase();
    const today = dateToday();
    if (admin) {
      if (q.includes("employee"))
        return `There are ${users.filter((u) => u.role === "employee" && u.status === "active").length} active employee account(s) registered.`;
      if (q.includes("pending") || q.includes("request"))
        return `There are ${leaves.filter((l) => l.status === "pending").length} pending leave request(s) awaiting approval.`;
      if (q.includes("leave")) {
        const on = leaves
          .filter(
            (l) =>
              l.status === "approved" && l.start <= today && l.end >= today,
          )
          .map((l) => users.find((u) => u.id === l.userId)?.name)
          .filter(Boolean);
        return on.length
          ? `Employees on approved leave today: ${on.join(", ")}.`
          : "No employees are scheduled on approved leave today.";
      }
      if (q.includes("late")) {
        const late = attendance
          .filter((a) => a.date === today && a.status === "Late")
          .map((a) => users.find((u) => u.id === a.userId)?.name)
          .filter(Boolean);
        return late.length
          ? `Late check-ins logged today: ${late.join(", ")}.`
          : "No late check-ins have been recorded today.";
      }
    } else {
      const mine = attendance.filter((a) => a.userId === me?.id);
      if (q.includes("leave"))
        return `You currently have ${leaveRemaining(me.id, company)} day(s) of annual leave remaining in your quota.`;
      if (q.includes("late"))
        return mine.some((a) => a.date === today && a.status === "Late")
          ? "Yes, your check-in today is marked as Late."
          : "No, you do not have a late check-in recorded today.";
      if (q.includes("hour") || q.includes("week")) {
        const start = new Date();
        start.setDate(start.getDate() - start.getDay() + 1);
        const hours = mine
          .filter((a) => new Date(`${a.date}T12:00:00`) >= start)
          .reduce((s, a) => s + (a.hours || 0), 0);
        return `You have recorded a total of ${hours.toFixed(1)} working hours this week.`;
      }
      if (q.includes("absent")) {
        const month = today.slice(0, 7);
        const scheduledDays = workdays(`${month}-01`, today, company);
        const recordedDays = new Set(
          mine
            .filter(
              (a) =>
                a.date.startsWith(month) &&
                a.date <= today &&
                isWorkday(a.date, company),
            )
            .map((a) => a.date),
        ).size;
        const absentDays = Math.max(0, scheduledDays - recordedDays);
        return `Based on your configured schedule through today, ${absentDays} workday(s) this month have no attendance record. Future workdays and non-working days are excluded.`;
      }
    }
    return "I can answer questions about attendance, leave balances, active employees, and recorded hours based on your saved company data. Select one of the suggested prompts below or ask directly.";
  };

  const send = (q = text) => {
    if (!q.trim()) return;
    setMessages((m) => [
      ...m,
      { who: "you", text: q },
      { who: "bot", text: answer(q) },
    ]);
    setText("");
  };

  const suggestions = admin
    ? [
        "How many employees do we have?",
        "Who is on leave today?",
        "Who was late today?",
        "How many pending requests?",
      ]
    : [
        "How many leaves do I have left?",
        "Was I late today?",
        "How many hours did I work this week?",
        "How many days was I absent this month?",
      ];

  return (
    <>
      <button
        className={`chat-launch ${open ? "hide-launch" : ""}`}
        onClick={() => setOpen(true)}
        aria-label="Open company records helper"
      >
        <Icon name="helper" size={15} />
        <span>Records Helper</span>
      </button>

      {open && (
        <section className="chat-panel" aria-label="Company records helper">
          <div className="chat-head">
            <div>
              <b>Company Records Helper</b>
              <small>Answers from saved data</small>
            </div>
            <button
              className="icon-btn"
              onClick={() => setOpen(false)}
              aria-label="Close helper"
            >
              <Icon name="x" size={15} />
            </button>
          </div>
          <div className="chat-messages">
            {!messages.length && (
              <div className="helper-intro">
                <b>Query Company Records</b>
                <p>
                  Ask questions regarding attendance, leave balances, work
                  hours, or employee counts.
                </p>
                <div className="suggestions">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.who}`}>
                {m.text}
              </div>
            ))}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              placeholder="Ask about company records..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" aria-label="Submit question">
              <Icon name="send" size={14} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
