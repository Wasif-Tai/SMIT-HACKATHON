import React, { useState } from "react";
import { Field, PageHead } from "../components/shared.jsx";
import { passwordHash, passwordMatches } from "../utils/auth.js";
import { weekdays } from "../utils/constants.js";
import { keys, write } from "../utils/store.js";

export default function CompanySettings({ data }) {
  const { company, users, session } = data;
  const [form, setForm] = useState({ ...company });
  const [msg, setMsg] = useState("");
  const [pw, setPw] = useState({ old: "", next: "" });
  const [pwmsg, setPwmsg] = useState("");

  const save = (e) => {
    e.preventDefault();
    write(keys.company, {
      ...form,
      grace: Number(form.grace),
      leaveQuota: Number(form.leaveQuota),
    });
    setMsg("Company settings saved successfully.");
  };

  const password = async (e) => {
    e.preventDefault();
    const u = users.find((x) => x.id === session.id);
    if (!(await passwordMatches(pw.old, u.passwordHash)))
      return setPwmsg("Current password is incorrect.");
    if (pw.next.length < 8)
      return setPwmsg("New password must contain at least 8 characters.");
    const hash = await passwordHash(pw.next);
    write(
      keys.users,
      users.map((x) => (x.id === u.id ? { ...x, passwordHash: hash } : x)),
    );
    setPw({ old: "", next: "" });
    setPwmsg("Administrator password updated successfully.");
  };

  return (
    <>
      <PageHead
        title="Company Settings"
        description="Configure organization working hours, grace periods, leave policies, and admin credentials."
      />
      <div className="settings-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Attendance & Leave Policies</h2>
              <p>
                Rules that govern working day counts, late thresholds, and leave
                limits.
              </p>
            </div>
          </div>
          <form className="form-grid" onSubmit={save}>
            <Field
              label="Company name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Field
              label="Official office start time"
              type="time"
              value={form.officeStart}
              onChange={(e) =>
                setForm({ ...form, officeStart: e.target.value })
              }
            />
            <Field
              label="Late arrival grace period (minutes)"
              type="number"
              min="0"
              value={form.grace}
              onChange={(e) => setForm({ ...form, grace: e.target.value })}
            />
            <Field
              label="Yearly leave quota per employee (days)"
              type="number"
              min="0"
              value={form.leaveQuota}
              onChange={(e) => setForm({ ...form, leaveQuota: e.target.value })}
            />
            <fieldset className="days span2">
              <legend>Weekly workdays</legend>
              {weekdays.map(([d, n]) => (
                <label key={n}>
                  <input
                    type="checkbox"
                    checked={(form.workingDays || []).includes(n)}
                    onChange={() =>
                      setForm({
                        ...form,
                        workingDays: form.workingDays.includes(n)
                          ? form.workingDays.filter((x) => x !== n)
                          : [...form.workingDays, n],
                      })
                    }
                  />
                  {d}
                </label>
              ))}
            </fieldset>
            {msg && <p className="success span2">{msg}</p>}
            <button type="submit" className="button primary span2">
              Save configuration
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Administrator Credentials</h2>
              <p>Update your admin sign-in password.</p>
            </div>
          </div>
          <form className="stack" onSubmit={password}>
            <Field
              label="Current admin password"
              type="password"
              placeholder="Enter current password"
              value={pw.old}
              onChange={(e) => setPw({ ...pw, old: e.target.value })}
              required
            />
            <Field
              label="New admin password"
              type="password"
              minLength="8"
              placeholder="Enter new password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
              required
              hint="Minimum 8 characters"
            />
            {pwmsg && (
              <p className={pwmsg.includes("updated") ? "success" : "error"}>
                {pwmsg}
              </p>
            )}
            <button type="submit" className="button primary">
              Update password
            </button>
          </form>
          <div className="security-note">
            <b>Demonstration Note</b>
            <p>Data is preserved in browser local storage.</p>
          </div>
        </section>
      </div>
    </>
  );
}
