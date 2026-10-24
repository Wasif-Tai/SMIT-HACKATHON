import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import Attendance from "./pages/Attendance.jsx";
import { Login, Setup } from "./pages/AuthPages.jsx";
import Announcements from "./pages/Announcements.jsx";
import CompanySettings from "./pages/CompanySettings.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Employees from "./pages/Employees.jsx";
import LeaveRequests from "./pages/LeaveRequests.jsx";
import MyAccount from "./pages/MyAccount.jsx";
import Payslips from "./pages/Payslips.jsx";
import { keys, list, read, write } from "./utils/store.js";

function useData() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const refreshData = () => refresh((value) => value + 1);
    window.addEventListener("hcm-change", refreshData);
    return () => window.removeEventListener("hcm-change", refreshData);
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
  if (!session || !users.some((user) => user.id === session.id))
    return <Navigate to="/login" replace />;
  if (role && session.role !== role)
    return (
      <Navigate to={session.role === "admin" ? "/admin" : "/home"} replace />
    );
  return children;
}

export default function App() {
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
            <AppShell data={data} logout={logout}>
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
                <Route path="/attendance" element={<Attendance data={data} />} />
                <Route path="/leaves" element={<LeaveRequests data={data} />} />
                <Route path="/payroll" element={<Payslips data={data} />} />
                <Route
                  path="/announcements"
                  element={<Announcements data={data} />}
                />
                <Route
                  path="/settings"
                  element={
                    <Guard role="admin">
                      <CompanySettings data={data} />
                    </Guard>
                  }
                />
                <Route path="/account" element={<MyAccount data={data} />} />
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
            </AppShell>
          </Guard>
        }
      />
    </Routes>
  );
}
