import React, { useState } from "react";
import { Badge, Empty, Icon, PageHead, Table } from "../components/shared.jsx";
import {
  attendanceStatus,
  dayKey,
  duration,
  id,
  isWorkday,
  prettyDate,
  setList,
} from "../utils/store.js";

export default function Attendance({ data }) {
  const { session, users, attendance, company, leaves } = data;
  const admin = session.role === "admin";
  const me = users.find((user) => user.id === session.id);
  const [date, setDate] = useState(admin ? dayKey() : "");
  const [person, setPerson] = useState("all");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const today = dayKey();

  const checkIn = () => {
    const existing = attendance.find(
      (row) => row.userId === me.id && row.date === today,
    );
    if (!isWorkday(today, company))
      return alert("Today is not a configured working day.");
    if (existing) return alert("You have already checked in today.");
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
  };

  const checkOut = () => {
    const existing = attendance.find(
      (row) => row.userId === me.id && row.date === today,
    );
    if (!existing) return alert("Please check in before checking out.");
    if (existing.checkOut) return alert("You have already checked out today.");
    const at = new Date().toISOString();
    if (at < existing.checkIn)
      return alert("Check-out time cannot be before your check-in time.");
    setList(
      "attendance",
      attendance.map((row) =>
        row.id === existing.id
          ? {
              ...row,
              checkOut: at,
              hours: duration(row.checkIn, at),
              status: attendanceStatus(row.checkIn, at, company),
            }
          : row,
      ),
    );
  };

  const activeEmployees = users.filter(
    (user) => user.role === "employee" && user.status === "active",
  );
  const visible = (
    admin ? attendance : attendance.filter((row) => row.userId === me.id)
  )
    .filter(
      (row) =>
        (!date || row.date === date) &&
        (person === "all" || row.userId === person) &&
        (department === "all" ||
          users.find((user) => user.id === row.userId)?.department ===
            department) &&
        (status === "all" || row.status === status),
    )
    .map((row) => ({
      ...row,
      user: users.find((user) => user.id === row.userId),
    }));

  // For a selected working day, show active employees without a record as absent.
  const approvedToday = leaves.filter(
    (leave) =>
      leave.status === "approved" && leave.start <= date && leave.end >= date,
  );
  const absentRows =
    admin &&
    date &&
    isWorkday(date, company) &&
    (status === "all" || status === "Absent")
      ? activeEmployees
          .filter(
            (user) =>
              (person === "all" || user.id === person) &&
              (department === "all" || user.department === department) &&
              !attendance.some(
                (row) => row.userId === user.id && row.date === date,
              ) &&
              !approvedToday.some((leave) => leave.userId === user.id),
          )
          .map((user) => ({
            id: `absent-${user.id}`,
            date,
            user,
            status: "Absent",
          }))
      : [];
  const rows = [...visible, ...absentRows].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  const myTodayRecord = !admin
    ? attendance.find((row) => row.userId === me.id && row.date === today)
    : null;

  return (
    <>
      <PageHead
        eyebrow="TIME & ATTENDANCE"
        title={admin ? "Attendance logs" : "My attendance record"}
        description={
          admin
            ? "Review daily employee check-ins, late arrivals, absences, and total hours."
            : "Track your daily check-in times, work hours, and monthly attendance history."
        }
        action={
          !admin && (
            <div className="punch-actions">
              <button
                className="button primary"
                onClick={checkIn}
                disabled={Boolean(myTodayRecord)}
              >
                <Icon name="clock" size={15} /> Check in
              </button>
              <button
                className="button outline"
                onClick={checkOut}
                disabled={!myTodayRecord || Boolean(myTodayRecord.checkOut)}
              >
                Check out
              </button>
            </div>
          )
        }
      />
      {!admin && (
        <div className="notice">
          <b>Attendance Policy:</b>
          <span>
            Workdays follow your company schedule. Check-in after{" "}
            {company.officeStart || "09:00"} (plus {company.grace || 15} min
            grace) is classified as Late. Total logged time under 5.0 hours is
            counted as a Half day.
          </span>
        </div>
      )}
      <section className="panel">
        <div className="filters">
          <label className="field inline-field">
            <span>Filter date:</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          {date && (
            <button
              className="button small outline"
              onClick={() => setDate("")}
            >
              Clear date
            </button>
          )}
          {admin && (
            <>
              <select
                value={person}
                onChange={(event) => setPerson(event.target.value)}
              >
                <option value="all">All employees</option>
                {activeEmployees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              >
                <option value="all">All departments</option>
                {[
                  ...new Set(
                    activeEmployees
                      .map((user) => user.department)
                      .filter(Boolean),
                  ),
                ].map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </>
          )}
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            {["Present", "Late", "Half day", "In progress", "Absent"].map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ),
            )}
          </select>
          <span className="count">
            {rows.length} record{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        {rows.length ? (
          <Table
            headers={
              admin
                ? [
                    "Date",
                    "Employee",
                    "Department",
                    "Check in",
                    "Check out",
                    "Hours",
                    "Status",
                  ]
                : [
                    "Date",
                    "Day of week",
                    "Check in",
                    "Check out",
                    "Hours",
                    "Status",
                  ]
            }
            rows={rows.map((row) =>
              admin
                ? [
                    prettyDate(row.date),
                    row.user?.name || "Former employee",
                    row.user?.department || "—",
                    row.checkIn
                      ? new Date(row.checkIn).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—",
                    row.checkOut
                      ? new Date(row.checkOut).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—",
                    row.hours ? `${row.hours.toFixed(1)} h` : "—",
                    <Badge key={row.id}>{row.status}</Badge>,
                  ]
                : [
                    prettyDate(row.date),
                    new Date(`${row.date}T12:00:00`).toLocaleDateString(
                      undefined,
                      { weekday: "long" },
                    ),
                    row.checkIn
                      ? new Date(row.checkIn).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—",
                    row.checkOut
                      ? new Date(row.checkOut).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—",
                    row.hours ? `${row.hours.toFixed(1)} h` : "—",
                    <Badge key={row.id}>{row.status}</Badge>,
                  ],
            )}
          />
        ) : (
          <Empty
            title="No attendance records found"
            text={
              admin
                ? "No employee check-ins or scheduled absences match the current filters."
                : "You have no recorded check-ins matching this filter. Check in on your next scheduled workday."
            }
          />
        )}
      </section>
    </>
  );
}
