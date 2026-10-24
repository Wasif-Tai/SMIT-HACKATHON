import React, { useState } from "react";
import { Empty, Icon, PageHead, Table } from "../components/shared.jsx";
import { dateToday } from "../utils/date.js";
import { money, workingDaysInMonth } from "../utils/store.js";

export default function Payslips({ data }) {
  const { session, users, attendance, company } = data;
  const admin = session.role === "admin";
  const [person, setPerson] = useState(admin ? "all" : session.id);
  const [month, setMonth] = useState(dateToday().slice(0, 7));
  const [errYear, errMonth] = month.split("-").map(Number);
  const target = admin ? person : session.id;
  const employee = users.find((u) => u.id === target);
  const [year, m] = [errYear, errMonth - 1];
  const days = workingDaysInMonth(year, m, company);

  const records = attendance.filter(
    (a) => a.userId === target && a.date.startsWith(month),
  );
  const present = records.filter((a) =>
    ["Present", "Late"].includes(a.status),
  ).length;
  const half = records.filter((a) => a.status === "Half day").length;
  const absent = Math.max(
    0,
    days -
      present -
      half -
      records.filter((a) => a.status === "In progress").length,
  );

  const daily = Number(employee?.salary || 0) / (days || 1);
  const deduction = daily * (absent + 0.5 * half);
  const net = Math.max(0, Number(employee?.salary || 0) - deduction);

  return (
    <>
      <PageHead
        title={admin ? "Monthly Payslips" : "My Monthly Payslip"}
        description="Salary summary derived from configured working days, absences, and half-day records."
        action={
          <button
            className="button primary"
            onClick={() => window.print()}
            disabled={!employee}
          >
            <Icon name="printer" size={15} /> Print payslip
          </button>
        }
      />
      <section className="panel">
        <div className="filters print-hide">
          {admin && (
            <select value={person} onChange={(e) => setPerson(e.target.value)}>
              <option value="all">Select an employee</option>
              {users
                .filter((u) => u.role === "employee")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.employeeId} ({u.department})
                  </option>
                ))}
            </select>
          )}
          <label className="field inline-field">
            <span>Pay period month:</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
        </div>

        {employee ? (
          <div className="payslip">
            <div className="slip-head">
              <div>
                <h2>{company.name}</h2>
                <p className="muted">Official Salary Statement</p>
              </div>
              <div className="slip-period">
                <small>Pay period</small>
                <b>
                  {new Date(year, m).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </b>
              </div>
            </div>

            <div className="slip-person">
              <div>
                <small>Employee details</small>
                <b>{employee.name}</b>
                <span>
                  ID: {employee.employeeId} · Dept: {employee.department}
                </span>
              </div>
              <div>
                <small>Designation & Schedule</small>
                <b>{employee.title}</b>
                <span>Configured working days in period: {days} days</span>
              </div>
            </div>

            <div className="salary-cards">
              <div>
                <small>Monthly base pay</small>
                <b>{money(employee.salary)}</b>
              </div>
              <div>
                <small>Attendance deductions</small>
                <b className="deduct">− {money(deduction)}</b>
              </div>
              <div className="net-card">
                <small>Net payable amount</small>
                <b>{money(net)}</b>
              </div>
            </div>

            <div className="slip-table">
              <h3>Monthly attendance breakdown</h3>
              <Table
                headers={[
                  "Working days",
                  "Present days",
                  "Absent days",
                  "Half days",
                  "Incomplete days",
                ]}
                rows={[
                  [
                    days,
                    present,
                    absent,
                    half,
                    records.filter((a) => a.status === "In progress").length,
                  ],
                ]}
              />
            </div>

            <div className="slip-total">
              <span>Deduction formula:</span>
              <b>
                {money(daily)}/day × ({absent} absent + 0.5 × {half} half day
                {half === 1 ? "" : "s"}) = {money(deduction)}
              </b>
            </div>

            <p className="slip-note">
              Note: Attendance deductions are calculated based on configured
              organization workdays. Unrecorded working days count as absent
              until check-in is logged. Non-working days are excluded from
              deduction calculations.
            </p>
          </div>
        ) : (
          <Empty
            title="No employee selected"
            text="Please choose an employee from the dropdown above to view their salary statement and attendance breakdown."
          />
        )}
      </section>
    </>
  );
}
