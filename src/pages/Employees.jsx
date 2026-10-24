import React, { useState } from "react";
import {
  Badge,
  Empty,
  Field,
  Icon,
  Modal,
  PageHead,
  Table,
} from "../components/shared.jsx";
import { emailOk, passwordHash } from "../utils/auth.js";
import { id, keys, money, write } from "../utils/store.js";

export default function Employees({ data }) {
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
