import React, { useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Attendance from "./pages/Attendance.jsx";
import {
  Badge,
  Empty,
  Icon,
  Logo,
  Modal,
  PageHead,
  Stat,
  Table,
} from "./pages/shared.jsx";
import {
  attendanceStatus,
  dayKey,
  duration,
  id,
  isWorkday,
  keys,
  leaveRemaining,
  list,
  money,
  prettyDate,
  read,
  setList,
  workdays,
  workingDaysInMonth,
  write,
} from "./utils/store.js";

const weekdays = [
  ["Sun", 0],
  ["Mon", 1],
  ["Tue", 2],
  ["Wed", 3],
  ["Thu", 4],
  ["Fri", 5],
  ["Sat", 6],
];

const enc = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

async function passwordHash(
  password,
  salt = crypto.getRandomValues(new Uint8Array(16)),
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  return `${enc(salt)}.${enc(bits)}`;
}

async function passwordMatches(password, stored) {
  if (!stored?.includes(".")) return false;
  const [s, h] = stored.split(".");
  const salt = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  return (await passwordHash(password, salt)).split(".")[1] === h;
}

const emailOk = (s) => /^\S+@\S+\.\S+$/.test(s);
const dateToday = () => dayKey();
const dayName = (d) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "long" });

function useData() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const f = () => refresh((x) => x + 1);
    window.addEventListener("hcm-change", f);
    return () => window.removeEventListener("hcm-change", f);
  }, []);
  return {
    company: read(keys.company, null),
    users: list("users"),
    attendance: list("attendance"),
    leaves: list("leaves"),
    announcements: list("announcements"),
    session: read(keys.session, null),
  };
}

function Guard({ role, children }) {
  const { company, session, users } = useData();
  if (!company) return <Navigate to="/setup" replace />;
  if (!session || !users.some((u) => u.id === session.id))
    return <Navigate to="/login" replace />;
  if (role && session.role !== role)
    return (
      <Navigate to={session.role === "admin" ? "/admin" : "/home"} replace />
    );
  return children;
}

function App() {
  const data = useData();
  const navigate = useNavigate();
  const logout = () => {
    write(keys.session, null);
    navigate("/login");
  };

  return (
    <Routes>
      <Route
        path="/setup"
        element={data.company ? <Navigate to="/login" replace /> : <Setup />}
      />
      <Route
        path="/login"
        element={
          !data.company ? (
            <Navigate to="/setup" replace />
          ) : data.session ? (
            <Navigate
              to={data.session.role === "admin" ? "/admin" : "/home"}
              replace
            />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="*"
        element={
          <Guard>
            <Shell data={data} logout={logout}>
              <Routes>
                <Route
                  path="/admin"
                  element={
                    <Guard role="admin">
                      <Dashboard data={data} />
                    </Guard>
                  }
                />
                <Route
                  path="/home"
                  element={
                    <Guard role="employee">
                      <Dashboard data={data} />
                    </Guard>
                  }
                />
                <Route
                  path="/employees"
                  element={
                    <Guard role="admin">
                      <Employees data={data} />
                    </Guard>
                  }
                />
                <Route
                  path="/attendance"
                  element={<Attendance data={data} />}
                />
                <Route path="/leaves" element={<Leaves data={data} />} />
                <Route path="/payroll" element={<Payroll data={data} />} />
                <Route
                  path="/announcements"
                  element={<Announcements data={data} />}
                />
                <Route
                  path="/settings"
                  element={
                    <Guard role="admin">
                      <Settings data={data} />
                    </Guard>
                  }
                />
                <Route path="/account" element={<Account data={data} />} />
                <Route
                  path="*"
                  element={
                    <Navigate
                      to={data.session?.role === "admin" ? "/admin" : "/home"}
                      replace
                    />
                  }
                />
              </Routes>
            </Shell>
          </Guard>
        }
      />
    </Routes>
  );
}

function Setup() {
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

function Login() {
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
        <Logo size={28} />
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

function Field({ label, hint, error, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
      {hint && <small>{hint}</small>}
      {error && <small className="error">{error}</small>}
    </label>
  );
}

function Shell({ data, children, logout }) {
  const { session, users, company } = data;
  const me = users.find((u) => u.id === session?.id) || {};
  const admin = session?.role === "admin";

  const navs = admin
    ? [
        ["Dashboard", "/admin", "overview"],
        ["Employees", "/employees", "employees"],
        ["Attendance", "/attendance", "attendance"],
        ["Leave requests", "/leaves", "leaves"],
        ["Payslips", "/payroll", "payroll"],
        ["Announcements", "/announcements", "announcements"],
        ["Company settings", "/settings", "settings"],
      ]
    : [
        ["Dashboard", "/home", "overview"],
        ["Attendance", "/attendance", "attendance"],
        ["My leave", "/leaves", "leaves"],
        ["My payslip", "/payroll", "payroll"],
        ["Announcements", "/announcements", "announcements"],
      ];

  const loc = useLocation();
  const currentSection =
    navs.find((n) => n[1] === loc.pathname)?.[0] ||
    (loc.pathname === "/account" ? "My account" : "Dashboard");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        {/* Single company brand header: no duplicate pill, company shown once */}
        <div className="sidebar-header">
          <Link className="brand" to={admin ? "/admin" : "/home"}>
            <Logo size={28} />
            <div className="brand-text">
              <b>HCM Lite</b>
              <span
                className="brand-company"
                title={company?.name || "Company"}
              >
                {company?.name || "Company Portal"}
              </span>
            </div>
          </Link>
        </div>

        <div className="sidebar-nav-wrap">
          <div className="nav-label">Menu</div>
          <nav>
            {navs.map(([label, path, iconName]) => (
              <Link
                key={path}
                to={path}
                className={`nav-item ${loc.pathname === path ? "active" : ""}`}
              >
                <span className="nav-icon">
                  <Icon name={iconName} size={16} />
                </span>
                <span>{label}</span>
              </Link>
            ))}
            <Link
              to="/account"
              className={`nav-item ${loc.pathname === "/account" ? "active" : ""}`}
            >
              <span className="nav-icon">
                <Icon name="account" size={16} />
              </span>
              <span>My account</span>
            </Link>
          </nav>
        </div>

        <div className="side-bottom">
          <div className="avatar">
            {(me.name || "U")
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="user-mini">
            <b>{me.name}</b>
            <small>{admin ? "Administrator" : me.title || "Employee"}</small>
          </div>
          <button
            className="icon-btn"
            title="Log out"
            onClick={logout}
            aria-label="Log out"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          {/* Breadcrumb matching Saylani Portal reference (Home > Section), no company duplication */}
          <div className="crumb">
            <span>Home</span>
            <span>/</span>
            <b>{currentSection}</b>
          </div>
          <div className="top-actions">
            <span className="today">
              {new Date().toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <div
              className="avatar small-avatar"
              title={`${me.name} (${admin ? "Admin" : me.title || "Employee"})`}
            >
              {(me.name || "U")[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
      <Helper data={data} />
    </div>
  );
}

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

function Dashboard({ data }) {
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

function Employees({ data }) {
  const { users } = data;
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All departments");
  const [editing, setEditing] = useState(null);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const initial = {
    name: "",
    email: "",
    employeeId: "",
    department: "",
    title: "",
    salary: "",
    password: "",
    status: "active",
  };

  const [form, setForm] = useState(initial);
  const employees = users.filter((u) => u.role === "employee");
  const departments = [
    "All departments",
    ...new Set(employees.map((e) => e.department).filter(Boolean)),
  ];

  const filtered = employees.filter(
    (u) =>
      `${u.name} ${u.email} ${u.employeeId}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (dept === "All departments" || u.department === dept),
  );

  const open = (u) => {
    setEditing(u?.id || null);
    setForm(u ? { ...u, password: "" } : initial);
    setError("");
    setShow(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (
      !form.name ||
      !form.email ||
      !form.employeeId ||
      !form.department ||
      !form.title ||
      !form.salary ||
      (!editing && !form.password)
    )
      return setError("Complete all required fields.");
    if (!emailOk(form.email)) return setError("Enter a valid email address.");
    if (Number(form.salary) <= 0)
      return setError("Monthly salary must be greater than zero.");
    if (
      employees.some(
        (u) =>
          u.email.toLowerCase() === form.email.toLowerCase() &&
          u.id !== editing,
      )
    )
      return setError("This email is already registered to another employee.");
    if (
      employees.some(
        (u) =>
          u.employeeId.toLowerCase() === form.employeeId.toLowerCase() &&
          u.id !== editing,
      )
    )
      return setError("Employee ID must be unique across the organization.");

    let next;
    if (editing) {
      const old = users.find((u) => u.id === editing);
      const hash = form.password
        ? await passwordHash(form.password)
        : old.passwordHash;
      next = users.map((u) =>
        u.id === editing
          ? { ...u, ...form, salary: Number(form.salary), passwordHash: hash }
          : u,
      );
    } else {
      next = [
        ...users,
        {
          ...form,
          id: id("emp"),
          role: "employee",
          salary: Number(form.salary),
          passwordHash: await passwordHash(form.password),
        },
      ];
    }
    write(keys.users, next);
    setShow(false);
  };

  const remove = (u) => {
    if (
      confirm(
        `Are you sure you want to delete employee "${u.name}" (${u.employeeId})? This action cannot be undone.`,
      )
    )
      write(
        keys.users,
        users.filter((x) => x.id !== u.id),
      );
  };

  return (
    <>
      <PageHead
        title="Employee Directory"
        description={`${employees.length} employee account${employees.length === 1 ? "" : "s"} currently registered.`}
        action={
          <button className="button primary" onClick={() => open()}>
            <Icon name="plus" size={15} /> Add employee
          </button>
        }
      />
      <section className="panel">
        <div className="filters">
          <div className="search">
            <Icon name="search" size={16} />
            <input
              placeholder="Search by name, employee ID, or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select value={dept} onChange={(e) => setDept(e.target.value)}>
            {departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <span className="count">
            {filtered.length} of {employees.length} employee
            {employees.length === 1 ? "" : "s"}
          </span>
        </div>
        {filtered.length ? (
          <Table
            headers={[
              "Employee",
              "Employee ID",
              "Department",
              "Job title",
              "Salary",
              "Status",
              "Actions",
            ]}
            rows={filtered.map((u) => [
              <div className="person-cell" key={u.id}>
                <div className="avatar tiny-avatar">
                  {u.name[0]?.toUpperCase()}
                </div>
                <div>
                  <b>{u.name}</b>
                  <small>{u.email}</small>
                </div>
              </div>,
              u.employeeId,
              u.department,
              u.title,
              money(u.salary),
              <Badge key={u.id}>{u.status}</Badge>,
              <div className="row-actions" key={u.id}>
                <button
                  className="button small outline"
                  onClick={() => open(u)}
                >
                  Edit
                </button>
                <button
                  className="button small danger-outline"
                  onClick={() => remove(u)}
                >
                  Delete
                </button>
              </div>,
            ])}
          />
        ) : (
          <Empty
            title="No employees found"
            text={
              employees.length
                ? "No employee records matched your search query or department filter."
                : "Your company has no employee records yet. Add your first employee to get started."
            }
            action={
              !employees.length && (
                <button className="button small primary" onClick={() => open()}>
                  Add first employee
                </button>
              )
            }
          />
        )}
      </section>

      {show && (
        <Modal
          title={editing ? "Edit employee profile" : "Add new employee"}
          close={() => setShow(false)}
        >
          <form className="form-grid" onSubmit={submit}>
            <Field
              label="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Field
              label="Email address"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Field
              label="Employee ID"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              required
            />
            <Field
              label="Department"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              required
            />
            <Field
              label="Job title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Field
              label="Monthly salary (PKR)"
              type="number"
              min="1"
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })}
              required
            />
            <Field
              label={
                editing
                  ? "New password (leave blank to retain current)"
                  : "Temporary password"
              }
              type="password"
              minLength="8"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editing}
              hint="Minimum 8 characters"
            />
            <label className="field">
              <span>Employment status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            {error && <p className="error span2">{error}</p>}
            <div className="modal-actions span2">
              <button
                type="button"
                className="button outline"
                onClick={() => setShow(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                {editing ? "Save changes" : "Add employee"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Leaves({ data }) {
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

function Payroll({ data }) {
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
              <Logo size={32} />
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

function Announcements({ data }) {
  const { session, users, announcements } = data;
  const admin = session.role === "admin";
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", message: "" });

  const sorted = announcements
    .slice()
    .sort((a, b) => b.created.localeCompare(a.created));

  const open = (a) => {
    setEditing(a?.id || null);
    setForm(
      a ? { title: a.title, message: a.message } : { title: "", message: "" },
    );
    setShow(true);
  };

  const save = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    if (editing)
      setList(
        "announcements",
        announcements.map((a) => (a.id === editing ? { ...a, ...form } : a)),
      );
    else
      setList("announcements", [
        ...announcements,
        {
          ...form,
          id: id("announcement"),
          created: new Date().toISOString(),
          author:
            users.find((u) => u.id === session.id)?.name || "Administrator",
        },
      ]);
    setShow(false);
  };

  const remove = (a) =>
    confirm(`Delete announcement "${a.title}"?`) &&
    setList(
      "announcements",
      announcements.filter((x) => x.id !== a.id),
    );

  return (
    <>
      <PageHead
        title="Company Announcements"
        description="Official notices and updates shared with all staff members."
        action={
          admin && (
            <button className="button primary" onClick={() => open()}>
              <Icon name="plus" size={15} /> New announcement
            </button>
          )
        }
      />

      {sorted.length ? (
        <div className="announcement-grid">
          {sorted.map((a) => (
            <article className="panel announcement-card" key={a.id}>
              <div className="announcement-meta">
                <span className="muted">{prettyDate(a.created)}</span>
                {admin && (
                  <div className="row-actions">
                    <button
                      className="button small outline"
                      onClick={() => open(a)}
                    >
                      Edit
                    </button>
                    <button
                      className="button small danger-outline"
                      onClick={() => remove(a)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <h2>{a.title}</h2>
              <p>{a.message}</p>
              <div className="author-line">
                <div className="avatar tiny-avatar">
                  {(a.author || "A")[0]?.toUpperCase()}
                </div>
                <span>
                  Posted by <b>{a.author}</b>
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="No announcements published"
            text={
              admin
                ? "Create an announcement to share updates with the team."
                : "No company announcements have been posted yet."
            }
            action={
              admin && (
                <button className="button small primary" onClick={() => open()}>
                  Post an announcement
                </button>
              )
            }
          />
        </section>
      )}

      {show && (
        <Modal
          title={editing ? "Edit announcement" : "Create new announcement"}
          close={() => setShow(false)}
        >
          <form className="stack" onSubmit={save}>
            <Field
              label="Announcement title"
              placeholder="e.g. Upcoming Office Holiday Schedule"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <label className="field">
              <span>Message body</span>
              <textarea
                rows="6"
                placeholder="Type your announcement content here..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="button outline"
                onClick={() => setShow(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                {editing ? "Save changes" : "Publish announcement"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Account({ data }) {
  const { users, session } = data;
  const [pw, setPw] = useState({ old: "", next: "" });
  const [message, setMessage] = useState("");

  const change = async (e) => {
    e.preventDefault();
    const user = users.find((u) => u.id === session.id);
    if (!(await passwordMatches(pw.old, user.passwordHash)))
      return setMessage("Current password is incorrect.");
    if (pw.next.length < 8)
      return setMessage("New password must contain at least 8 characters.");
    const hash = await passwordHash(pw.next);
    write(
      keys.users,
      users.map((u) => (u.id === user.id ? { ...u, passwordHash: hash } : u)),
    );
    setPw({ old: "", next: "" });
    setMessage("Password successfully updated.");
  };

  return (
    <>
      <PageHead
        title="Account Security"
        description="Update your credentials and manage local access."
      />
      <section className="panel" style={{ maxWidth: 520 }}>
        <form className="stack" onSubmit={change}>
          <Field
            label="Current password"
            type="password"
            placeholder="Enter current password"
            value={pw.old}
            onChange={(e) => setPw({ ...pw, old: e.target.value })}
            required
          />
          <Field
            label="New password"
            type="password"
            minLength="8"
            placeholder="Enter new password"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
            required
            hint="Minimum 8 characters"
          />
          {message && (
            <p className={message.includes("updated") ? "success" : "error"}>
              {message}
            </p>
          )}
          <button type="submit" className="button primary">
            Update password
          </button>
        </form>
        <div className="security-note">
          <b>Security Notice</b>
          <p>
            Passwords are encrypted using PBKDF2 with SHA-256 and stored in your
            local browser storage.
          </p>
        </div>
      </section>
    </>
  );
}

function Settings({ data }) {
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

function Helper({ data }) {
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
        const done = mine.filter(
          (a) => a.date.startsWith(month) && a.status !== "In progress",
        ).length;
        return `Based on recorded workdays so far this month, ${Math.max(0, new Date().getDate() - done)} day(s) have no attendance record. Note: Future scheduled workdays and non-working days are not treated as absences.`;
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

export default App;
