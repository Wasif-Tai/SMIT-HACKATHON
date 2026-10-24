import React, { useState } from "react";
import { Field, PageHead } from "../components/shared.jsx";
import { passwordHash, passwordMatches } from "../utils/auth.js";
import { keys, write } from "../utils/store.js";

export default function MyAccount({ data }) {
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
