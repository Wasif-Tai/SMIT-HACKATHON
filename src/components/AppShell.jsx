import React from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import RecordsHelper from "./RecordsHelper.jsx";

export default function AppShell({ data, children, logout }) {
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
      <Sidebar
        navs={navs}
        pathname={loc.pathname}
        admin={admin}
        me={me}
        company={company}
        logout={logout}
      />

      <main className="main-area">
        <Header currentSection={currentSection} me={me} admin={admin} />
        <div className="page-content">{children}</div>
      </main>
      <RecordsHelper data={data} />
    </div>
  );
}
