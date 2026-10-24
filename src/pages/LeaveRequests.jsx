import React, { useState } from "react";
import {
  Badge,
  Empty,
  Field,
  Icon,
  PageHead,
  Stat,
} from "../components/shared.jsx";
import { dateToday } from "../utils/date.js";
import {
  id,
  isWorkday,
  leaveRemaining,
  prettyDate,
  setList,
  workdays,
} from "../utils/store.js";

export default function LeaveRequests({ data }) {
  const { session, users, leaves, company } = data;
  const admin = session.role === "admin";
  const me = users.find((u) => u.id === session.id);

  const [form, setForm] = useState({
    type: "Annual leave",
    start: "",
    end: "",
    reason: "",
  });
  const [filter, setFilter] = useState("all");
  const [comment, setComment] = useState({});
  const [error, setError] = useState("");

  const mine = admin ? leaves : leaves.filter((l) => l.userId === me.id);
  const requests = mine
    .filter((l) => filter === "all" || l.status === filter)
    .slice()
    .sort((a, b) => b.created.localeCompare(a.created));

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.start || !form.end || !form.reason.trim())
      return setError("Select valid dates and provide a reason.");
    if (form.start > form.end)
      return setError("Start date cannot be after the end date.");
    if (!isWorkday(form.start, company) || !isWorkday(form.end, company))
      return setError("Start and end dates must fall on configured workdays.");
    if (
      mine.some(
        (l) =>
          l.userId === me.id &&
          ["pending", "approved"].includes(l.status) &&
          form.start <= l.end &&
          form.end >= l.start,
      )
    )
      return setError(
        "The selected period overlaps an existing pending or approved request.",
      );
    const days = workdays(form.start, form.end, company);
    if (!days) return setError("The selected period contains no working days.");

    setList("leaves", [
      ...leaves,
      {
        ...form,
        id: id("leave"),
        userId: me.id,
        days,
        status: "pending",
        created: new Date().toISOString(),
        comment: "",
      },
    ]);
    setForm({ type: "Annual leave", start: "", end: "", reason: "" });
  };

  const decide = (l, status) => {
    if (
      status === "approved" &&
      leaveRemaining(l.userId, company, Number(l.start.slice(0, 4))) < l.days
    )
      return alert(
        "Approval rejected: request exceeds the employee's yearly leave quota.",
      );
    setList(
      "leaves",
      leaves.map((x) =>
        x.id === l.id
          ? {
              ...x,
              status,
              comment: comment[l.id] || "",
              decidedAt: new Date().toISOString(),
            }
          : x,
      ),
    );
  };

  return (
    <>
      <PageHead
        title={admin ? "Leave Requests" : "My Leave Requests"}
        description={
          admin
            ? "Review staff leave requests and monitor yearly quotas."
            : "Submit leave requests and track your remaining balance."
        }
      />

      {!admin && (
        <>
          <div className="stats-grid compact-stats">
            <Stat
              label="Remaining Quota"
              value={`${leaveRemaining(me.id, company)} days`}
              sub={`${company.leaveQuota || 0} days yearly entitlement`}
              icon={<Icon name="leaves" size={18} />}
              accent="purple"
            />
            <Stat
              label="Pending Requests"
              value={mine.filter((l) => l.status === "pending").length}
              sub="Awaiting admin approval"
              icon={<Icon name="attendance" size={18} />}
            />
          </div>

          <section className="panel apply-panel">
            <div className="panel-head">
              <div>
                <h2>Apply for Leave</h2>
                <p>
                  Only configured workdays deduct from your quota; non-workdays
                  are excluded.
                </p>
              </div>
            </div>
            <form className="form-grid" onSubmit={submit}>
              <label className="field">
                <span>Leave category</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {[
                    "Annual leave",
                    "Sick leave",
                    "Personal leave",
                    "Other",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <Field
                label="Start date"
                type="date"
                min={dateToday()}
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                required
              />
              <Field
                label="End date"
                type="date"
                min={form.start || dateToday()}
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
                required
              />
              <Field
                label="Reason / Details"
                placeholder="Reason for requesting time off..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                required
              />
              {error && <p className="error span2">{error}</p>}
              <button type="submit" className="button primary span2">
                Submit leave application
              </button>
            </form>
          </section>
        </>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{admin ? "All Leave Applications" : "Application History"}</h2>
            <p>
              {requests.length} total request{requests.length === 1 ? "" : "s"}
            </p>
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {["pending", "approved", "rejected"].map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {requests.length ? (
          <div className="request-list">
            {requests.map((l) => {
              const u = users.find((x) => x.id === l.userId);
              return (
                <article className="request-card" key={l.id}>
                  <div className="request-top">
                    <div>
                      <b>
                        {admin ? u?.name || "Former employee" : "Your request"}{" "}
                        · {l.type}
                      </b>
                      <small>
                        {prettyDate(l.start)} – {prettyDate(l.end)} · {l.days}{" "}
                        working day(s)
                      </small>
                    </div>
                    <Badge>{l.status}</Badge>
                  </div>
                  <p>{l.reason}</p>
                  {l.comment && (
                    <div className="decision-note">
                      <b>Admin response:</b>
                      <span>{l.comment}</span>
                    </div>
                  )}
                  {admin && l.status === "pending" && (
                    <div className="decision">
                      <input
                        placeholder="Add decision note (optional)..."
                        value={comment[l.id] || ""}
                        onChange={(e) =>
                          setComment({ ...comment, [l.id]: e.target.value })
                        }
                      />
                      <button
                        className="button small primary"
                        onClick={() => decide(l, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="button small danger-outline"
                        onClick={() => decide(l, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <Empty
            title="No leave requests"
            text={
              admin
                ? "No leave applications match the selected status filter."
                : "You have not submitted any leave applications yet."
            }
          />
        )}
      </section>
    </>
  );
}
