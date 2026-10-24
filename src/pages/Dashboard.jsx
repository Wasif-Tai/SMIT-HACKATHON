import React from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Empty,
  Icon,
  PageHead,
  Stat,
  Table,
} from "../components/shared.jsx";
import { dateToday, dayName } from "../utils/date.js";
import {
  attendanceStatus,
  duration,
  id,
  isWorkday,
  leaveRemaining,
  money,
  prettyDate,
  setList,
} from "../utils/store.js";

function LeaveMini({ item, users }) {
  const u = users.find((x) => x.id === item.userId);
  return (
    <div className="leave-mini">
      <div className="avatar tiny-avatar">
        {(u?.name || "U")[0]?.toUpperCase()}
      </div>
      <div className="leave-min-copy">
        <b>
          {u?.name || "Employee"} · {item.type}
        </b>
        <small>
          {prettyDate(item.start)} – {prettyDate(item.end)} · {item.days}{" "}
          working day(s)
        </small>
      </div>
      <Badge>{item.status}</Badge>
    </div>
  );
}

export default function Dashboard({ data }) {
  const { session, users, attendance, leaves, announcements, company } = data;
  const admin = session.role === "admin";
  const me = users.find((u) => u.id === session.id) || {};
  const today = dateToday();
  const todays = attendance.filter((a) => a.date === today);

  const approvedToday = leaves.filter(
    (l) => l.status === "approved" && l.start <= today && l.end >= today,
  );
  const pending = leaves.filter((l) => l.status === "pending");
  const active = users.filter(
    (u) => u.role === "employee" && u.status === "active",
  );
  const own = attendance.filter((a) => a.userId === me.id);
  const thisMonth = own.filter((a) => a.date.slice(0, 7) === today.slice(0, 7));
  const myToday = own.find((a) => a.date === today);

  const absentToday = isWorkday(today, company)
    ? active.filter(
        (u) =>
          !todays.some((a) => a.userId === u.id) &&
          !approvedToday.some((l) => l.userId === u.id),
      ).length
    : 0;

  const presentCount = todays.filter((a) =>
    ["Present", "Late", "In progress"].includes(a.status),
  ).length;

  const lateCount = todays.filter((a) => a.status === "Late").length;

  const announce = announcements
    .slice()
    .sort((a, b) => b.created.localeCompare(a.created))
    .slice(0, 3);

  const doPunch = (kind) => {
    if (!isWorkday(today, company))
      return alert("Today is not a configured working day.");
    const current = attendance.find(
      (a) => a.userId === me.id && a.date === today,
    );
    if (kind === "in") {
      if (current) return alert("You have already checked in today.");
      const at = new Date().toISOString();
      setList("attendance", [
        ...attendance,
        {
          id: id("att"),
          userId: me.id,
          date: today,
          checkIn: at,
          checkOut: null,
          status: attendanceStatus(at, null, company),
        },
      ]);
    } else {
      if (!current) return alert("Please check in before checking out.");
      if (current.checkOut) return alert("You have already checked out today.");
      const out = new Date().toISOString();
      const updated = attendance.map((a) =>
        a.id === current.id
          ? {
              ...a,
              checkOut: out,
              hours: duration(a.checkIn, out),
              status: attendanceStatus(a.checkIn, out, company),
            }
          : a,
      );
      setList("attendance", updated);
    }
  };

  return (
    <>
      <PageHead
        title={
          admin
            ? `Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${me.name?.split(" ")[0] || "Admin"}`
            : `Welcome back, ${me.name?.split(" ")[0] || "there"}`
        }
        description={
          admin
            ? "Workforce attendance, pending leave approvals, and organization activity."
            : "Review your daily attendance, remaining leaves, and monthly compensation."
        }
        action={
          !admin && (
            <div className="punch-actions">
              <button
                className="button primary"
                onClick={() => doPunch("in")}
                disabled={Boolean(myToday)}
              >
                <Icon name="clock" size={15} /> Check in
              </button>
              <button
                className="button outline"
                onClick={() => doPunch("out")}
                disabled={!myToday || Boolean(myToday.checkOut)}
              >
                Check out
              </button>
            </div>
          )
        }
      />

      {admin ? (
        <>
          {/* Top metric cards matching Saylani Portal style */}
          <div className="stats-grid">
            <Stat
              label="Active Employees"
              value={active.length}
              icon={<Icon name="employees" size={18} />}
            />
            <Stat
              label="Present Today"
              value={presentCount}
              sub={`${lateCount} late arrival${lateCount === 1 ? "" : "s"}`}
              icon={<Icon name="check" size={18} />}
              accent="green"
            />
            <Stat
              label="Absent Today"
              value={absentToday}
              sub="Scheduled workdays"
              icon={<Icon name="x" size={16} />}
              accent="orange"
            />
            <Stat
              label="Pending Leaves"
              value={pending.length}
              sub={`${approvedToday.length} on leave today`}
              icon={<Icon name="leaves" size={18} />}
              accent="purple"
            />
          </div>

          <div className="dashboard-grid">
            <section className="panel wide">
              <div className="panel-head">
                <div>
                  <h2>Today's Attendance Status</h2>
                  <p>
                    {prettyDate(today)} · {dayName(today)}
                  </p>
                </div>
                <Link className="text-link" to="/attendance">
                  View full logs →
                </Link>
              </div>
              {todays.length ? (
                <Table
                  headers={[
                    "Employee",
                    "Department",
                    "Check in",
                    "Check out",
                    "Status",
                  ]}
                  rows={todays.map((a) => {
                    const u = users.find((x) => x.id === a.userId);
                    return [
                      u?.name || "Former employee",
                      u?.department || "—",
                      a.checkIn
                        ? new Date(a.checkIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—",
                      a.checkOut
                        ? new Date(a.checkOut).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—",
                      <Badge key={a.id}>{a.status}</Badge>,
                    ];
                  })}
                />
              ) : (
                <Empty
                  title="No attendance records"
                  text={
                    isWorkday(today, company)
                      ? "Records will appear here after employees check in."
                      : "Today is not a configured working day."
                  }
                  action={
                    <Link to="/attendance" className="button small outline">
                      View attendance rules
                    </Link>
                  }
                />
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Pending Leave Approvals</h2>
                  <p>Requests requiring action</p>
                </div>
                <Link to="/leaves" className="text-link">
                  Manage →
                </Link>
              </div>
              {pending.length ? (
                pending
                  .slice(0, 4)
                  .map((l) => <LeaveMini key={l.id} item={l} users={users} />)
              ) : (
                <Empty
                  title="No pending requests"
                  text="All employee leave applications have been reviewed."
                />
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Department Breakdown</h2>
                  <p>Active staff by department</p>
                </div>
              </div>
              {active.length ? (
                Array.from(
                  new Set(active.map((u) => u.department || "Unassigned")),
                ).map((dept) => {
                  const n = active.filter(
                    (u) => (u.department || "Unassigned") === dept,
                  ).length;
                  return (
                    <div className="dept-row" key={dept}>
                      <div>
                        <span>{dept}</span>
                        <b>
                          {n} member{n === 1 ? "" : "s"} (
                          {Math.round((100 * n) / active.length)}%)
                        </b>
                      </div>
                      <div className="bar">
                        <i
                          style={{
                            width: `${Math.round((100 * n) / active.length)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <Empty
                  title="No department data"
                  text="Department statistics will populate as employees are added."
                  action={
                    <Link to="/employees" className="button small outline">
                      Add employee
                    </Link>
                  }
                />
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Company Announcements</h2>
                  <p>Recent notices</p>
                </div>
                <Link to="/announcements" className="text-link">
                  View all →
                </Link>
              </div>
              {announce.length ? (
                announce.map((a) => (
                  <div className="announce-mini" key={a.id}>
                    <b>{a.title}</b>
                    <small>{prettyDate(a.created)}</small>
                    <p>{a.message}</p>
                  </div>
                ))
              ) : (
                <Empty
                  title="No announcements published"
                  text="Post an announcement to share updates with the team."
                  action={
                    <Link to="/announcements" className="button small outline">
                      Post announcement
                    </Link>
                  }
                />
              )}
            </section>
          </div>
        </>
      ) : (
        <>
          <div className="stats-grid">
            <Stat
              label="Today's Attendance"
              value={myToday ? myToday.status : "Not checked in"}
              sub={
                myToday?.checkIn
                  ? `Logged at ${new Date(myToday.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : `Office start: ${company?.officeStart || "09:00"}`
              }
              icon={<Icon name="attendance" size={18} />}
              accent={
                myToday?.status === "Present"
                  ? "green"
                  : myToday?.status === "Late"
                    ? "orange"
                    : "default"
              }
            />
            <Stat
              label="Present This Month"
              value={`${thisMonth.filter((a) => ["Present", "Late"].includes(a.status)).length} days`}
              sub={`${thisMonth.filter((a) => a.status === "Late").length} late check-in(s)`}
              icon={<Icon name="check" size={18} />}
              accent="green"
            />
            <Stat
              label="Remaining Leaves"
              value={`${leaveRemaining(me.id, company)} days`}
              sub={`${company.leaveQuota || 0} days yearly quota`}
              icon={<Icon name="leaves" size={18} />}
              accent="purple"
            />
            <Stat
              label="Monthly Base Salary"
              value={money(me.salary)}
              sub="Before attendance adjustments"
              icon={<Icon name="payroll" size={18} />}
            />
          </div>

          <div className="dashboard-grid">
            <section className="panel wide">
              <div className="panel-head">
                <div>
                  <h2>Monthly Attendance History</h2>
                  <p>
                    Recent logs for{" "}
                    {new Date().toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Link to="/attendance" className="text-link">
                  Complete logs →
                </Link>
              </div>
              {thisMonth.length ? (
                <Table
                  headers={["Date", "Check in", "Check out", "Hours", "Status"]}
                  rows={thisMonth
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 7)
                    .map((a) => [
                      prettyDate(a.date),
                      a.checkIn
                        ? new Date(a.checkIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—",
                      a.checkOut
                        ? new Date(a.checkOut).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—",
                      a.hours ? `${a.hours.toFixed(1)} h` : "—",
                      <Badge key={a.id}>{a.status}</Badge>,
                    ])}
                />
              ) : (
                <Empty
                  title="No attendance records"
                  text="Your check-in history for this month will appear here."
                />
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Recent Leave Requests</h2>
                  <p>Your submitted requests</p>
                </div>
                <Link to="/leaves" className="text-link">
                  Apply for leave →
                </Link>
              </div>
              {leaves.some((l) => l.userId === me.id) ? (
                leaves
                  .filter((l) => l.userId === me.id)
                  .slice(-3)
                  .reverse()
                  .map((l) => <LeaveMini key={l.id} item={l} users={users} />)
              ) : (
                <Empty
                  title="No leave requests"
                  text="Your submitted leave applications will appear here."
                  action={
                    <Link to="/leaves" className="button small outline">
                      Apply for leave
                    </Link>
                  }
                />
              )}
            </section>

            <section className="panel full">
              <div className="panel-head">
                <div>
                  <h2>Company Announcements</h2>
                  <p>Notices from administration</p>
                </div>
                <Link to="/announcements" className="text-link">
                  All announcements →
                </Link>
              </div>
              {announce.length ? (
                announce.map((a) => (
                  <div className="announce-mini" key={a.id}>
                    <b>{a.title}</b>
                    <small>
                      {prettyDate(a.created)} · By {a.author}
                    </small>
                    <p>{a.message}</p>
                  </div>
                ))
              ) : (
                <Empty
                  title="No announcements"
                  text="Company announcements will appear here when posted."
                />
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
