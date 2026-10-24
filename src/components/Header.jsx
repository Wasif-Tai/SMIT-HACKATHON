import React from "react";

export default function Header({ currentSection, me, admin }) {
  return (
    <header className="topbar">
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
  );
}
