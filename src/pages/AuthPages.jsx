import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Field } from "../components/shared.jsx";
import { emailOk, passwordHash, passwordMatches } from "../utils/auth.js";
import { weekdays } from "../utils/constants.js";
import { id, keys, list, read, write } from "../utils/store.js";

export function Setup() {
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    company: "",
    name: "",
    email: "",
    password: "",
    officeStart: "09:00",
    grace: "15",
    quota: "20",
    workingDays: [1, 2, 3, 4, 5],
  });

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.company || !form.name || !form.email || !form.password)
      return setError("Complete all required fields.");
    if (!emailOk(form.email)) return setError("Enter a valid email address.");
    if (form.password.length < 8)
      return setError("Password must contain at least 8 characters.");
    if (
      Number(form.grace) < 0 ||
      Number(form.quota) < 0 ||
      !form.workingDays.length
    )
      return setError(
        "Use non-negative numbers and choose at least one working day.",
      );

    write(keys.company, {
      name: form.company,
      officeStart: form.officeStart,
      grace: Number(form.grace),
      leaveQuota: Number(form.quota),
      workingDays: form.workingDays,
    });

    write(keys.users, [
      {
        id: id("admin"),
        employeeId: "ADMIN-001",
        name: form.name,
        email: form.email.toLowerCase(),
        passwordHash: await passwordHash(form.password),
        role: "admin",
        department: "Administration",
        title: "Administrator",
        salary: 0,
        status: "active",
      },
    ]);

    ["attendance", "leaves", "announcements"].forEach((k) =>
      write(keys[k], []),
    );
    nav("/login");
  };

  return (
    <AuthPage
      title="Create company workspace"
      subtitle="Configure initial working schedule and administrator credentials."
    >
      <form onSubmit={submit} className="form-grid">
        <Field
          label="Company name"
          name="company"
          placeholder="e.g. Acme Corporation"
          value={form.company}
          onChange={change}
          required
        />
        <Field
          label="Administrator full name"
          name="name"
          placeholder="e.g. Sarah Jenkins"
          value={form.name}
          onChange={change}
          required
        />
        <Field
          label="Admin email"
          name="email"
          type="email"
          placeholder="admin@company.com"
          value={form.email}
          onChange={change}
          required
        />
        <Field
          label="Admin password"
          name="password"
          type="password"
          value={form.password}
          onChange={change}
          hint="Minimum 8 characters"
          required
        />
        <Field
          label="Office start time"
          name="officeStart"
          type="time"
          value={form.officeStart}
          onChange={change}
        />
        <Field
          label="Late grace period (minutes)"
          name="grace"
          type="number"
          min="0"
          value={form.grace}
          onChange={change}
        />
        <Field
          label="Yearly leave quota (days)"
          name="quota"
          type="number"
          min="0"
          value={form.quota}
          onChange={change}
        />
        <fieldset className="days span2">
          <legend>Weekly working days</legend>
          {weekdays.map(([d, n]) => (
            <label key={n}>
              <input
                type="checkbox"
                checked={form.workingDays.includes(n)}
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
        {error && <p className="error span2">{error}</p>}
        <button type="submit" className="button primary span2">
          Save and proceed to login
        </button>
      </form>
    </AuthPage>
  );
}

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const users = list("users");

  const submit = async (e) => {
    e.preventDefault();
    const user = users.find(
      (x) =>
        x.email.toLowerCase() === email.toLowerCase() &&
        x.status !== "inactive",
    );
    if (user && (await passwordMatches(password, user.passwordHash))) {
      write(keys.session, { id: user.id, role: user.role });
      nav(user.role === "admin" ? "/admin" : "/home");
    } else setError("Email or password is incorrect, or account is inactive.");
  };

  const company = read(keys.company, { name: "HCM Lite" });

  return (
    <AuthPage
      title="Sign in to your account"
      subtitle={`Access the ${company.name || "company"} management portal.`}
    >
      <form onSubmit={submit} className="stack">
        <Field
          label="Email address"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="button primary">
          Sign in
        </button>
      </form>
    </AuthPage>
  );
}

function AuthPage({ title, subtitle, children }) {
  return (
    <main className="auth">
      <div className="auth-brand">
        <div>
          <b>HCM Lite</b>
          <small>People Operations</small>
        </div>
      </div>
      <section className="auth-card">
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <div className="auth-foot">Local browser demonstration environment</div>
      </section>
    </main>
  );
}
