import React, { useState } from "react";
import { Empty, Field, Icon, Modal, PageHead } from "../components/shared.jsx";
import { id, prettyDate, setList } from "../utils/store.js";

export default function Announcements({ data }) {
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
