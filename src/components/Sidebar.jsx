import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "./shared.jsx";

export default function Sidebar({
  navs,
  pathname,
  admin,
  me,
  company,
  logout,
}) {
  return (
    <aside className="sidebar">
      {/* Single company brand header: no duplicate pill, company shown once */}
      <div className="sidebar-header">
        <Link className="brand" to={admin ? "/admin" : "/home"}>
          <div className="brand-text">
            <b>HCM Lite</b>
            <span className="brand-company" title={company?.name || "Company"}>
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
              className={`nav-item ${pathname === path ? "active" : ""}`}
            >
              <span className="nav-icon">
                <Icon name={iconName} size={16} />
              </span>
              <span>{label}</span>
            </Link>
          ))}
          <Link
            to="/account"
            className={`nav-item ${pathname === "/account" ? "active" : ""}`}
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
            .map((namePart) => namePart[0])
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
  );
}
