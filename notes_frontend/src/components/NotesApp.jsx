import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// These environment variables can be set in Astro config/Netlify/etc
const SUPABASE_URL =
  import.meta.env.PUBLIC_SUPABASE_URL ||
  (typeof window !== "undefined" && window.PUBLIC_SUPABASE_URL) ||
  'https://mzxyorlnbfdkneiezgjz.supabase.co';
const SUPABASE_KEY =
  import.meta.env.PUBLIC_SUPABASE_KEY ||
  (typeof window !== "undefined" && window.PUBLIC_SUPABASE_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16eHlvcmxuYmZka25laWV6Z2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNDUxMDksImV4cCI6MjA2NzYyMTEwOX0.URYpbwtC2u5ORBlUzpWPNspXMWq_cLBOKWMOgGbilyQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const NOTES_TABLE = 'notes';

function toShortDate(dtString) {
  if (!dtString) return '';
  return new Date(dtString).toLocaleDateString([], { year: '2-digit', month: 'short', day: '2-digit' });
}
function toReadable(dtString) {
  if (!dtString) return '';
  const d = new Date(dtString);
  return d.toLocaleString([], { year: '2-digit', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function NotesApp() {
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch all notes
  async function fetchNotes() {
    const { data, error } = await supabase
      .from(NOTES_TABLE)
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  }
  async function createNote(payload) {
    const { data, error } = await supabase
      .from(NOTES_TABLE)
      .insert([{ title: payload.title, content: payload.content }])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
  async function updateNote(id, payload) {
    const { data, error } = await supabase
      .from(NOTES_TABLE)
      .update({ title: payload.title, content: payload.content })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
  async function deleteNote(id) {
    const { error } = await supabase
      .from(NOTES_TABLE)
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // Initial load
  useEffect(() => {
    fetchNotes()
      .then((data) => {
        setNotes(data);
        setSelectedNoteId(data[0]?.id || null);
      })
      .catch(() => {
        setErrorMsg("Could not load notes.");
      });
  }, []);

  // UI handlers
  function onSelect(noteId) {
    setSelectedNoteId(noteId);
    setIsEditing(false);
    setErrorMsg(null);
  }
  function onNewNote() {
    setIsEditing(true);
    setSelectedNoteId(null);
    setErrorMsg(null);
  }
  function onEdit() {
    setIsEditing(true);
    setErrorMsg(null);
  }
  function onCancel() {
    setIsEditing(false);
    setErrorMsg(null);
  }
  async function onSave({ title, content }) {
    try {
      if (!selectedNoteId) {
        const created = await createNote({ title, content });
        const all = await fetchNotes();
        setNotes(all);
        setSelectedNoteId(created.id);
        setIsEditing(false);
        setErrorMsg(null);
      } else {
        await updateNote(selectedNoteId, { title, content });
        const all = await fetchNotes();
        setNotes(all);
        setIsEditing(false);
        setErrorMsg(null);
      }
    } catch {
      setErrorMsg("Failed to save note.");
    }
  }
  async function onDeleteClicked() {
    if (!selectedNoteId) return;
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteNote(selectedNoteId);
      const all = await fetchNotes();
      setNotes(all);
      setSelectedNoteId(all[0]?.id || null);
      setIsEditing(false);
      setErrorMsg(null);
    } catch {
      setErrorMsg("Could not delete note.");
    }
  }

  const currentNote = notes.find((n) => n.id === selectedNoteId) || null;

  // --- Sidebar ---
  let sidebar = (
    <aside className="sidebar">
      <header>
        <h2>Notes</h2>
        <button className="new-note-btn" title="Create New Note" id="sidebar-new-note" onClick={onNewNote}>+</button>
      </header>
      <nav>
        {notes.length === 0 ? (
          <div className="empty">No notes</div>
        ) : (
          <ul>
            {notes.map((note) => (
              <li className={`list-item${note.id === selectedNoteId ? " selected" : ""}`} data-note-id={note.id} onClick={() => onSelect(note.id)} key={note.id}>
                <span className="note-title">{note.title || "Untitled"}</span>
                <span className="note-date">{toShortDate(note.updated_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
  // --- Editor or Detail ---
  let detail = "";
  if (!currentNote && !isEditing) {
    detail = <div className="empty-detail">No note selected.</div>;
  } else if (isEditing) {
    let editTitle = currentNote ? currentNote.title : "";
    let editContent = currentNote ? currentNote.content : "";
    detail = (
      <form className="edit-form" id="edit-note-form" onSubmit={async (e) => {
        e.preventDefault();
        const title = e.target.elements['edit-title'].value;
        const content = e.target.elements['edit-content'].value;
        await onSave({ title, content });
      }}>
        <input className="note-title-input" id="edit-title" name="edit-title" defaultValue={editTitle} placeholder="Title" autoFocus />
        <textarea className="note-content-input" id="edit-content" name="edit-content" placeholder="Start writing your note..." rows={16} defaultValue={editContent}></textarea>
        <div className="actions">
          <button className="save-btn" type="submit">{currentNote && currentNote.id ? "Save" : "Create"}</button>
          <button className="cancel-btn" type="button" id="cancel-edit-btn" onClick={onCancel}>Cancel</button>
          {(currentNote && currentNote.id) ? <button className="delete-btn" type="button" id="delete-btn" onClick={onDeleteClicked}>Delete</button> : ""}
        </div>
        {errorMsg ? <div className="error-msg">{errorMsg}</div> : ""}
      </form>
    );
  } else {
    detail = (
      <article className="note-detail">
        <h2>{currentNote.title || "Untitled note"}</h2>
        <div className="note-meta">{currentNote.updated_at ? `Last updated: ${toReadable(currentNote.updated_at)}` : ""}</div>
        <pre className="note-content">{currentNote.content || ""}</pre>
        <div className="actions">
          <button className="edit-btn" id="edit-btn" onClick={onEdit}>Edit</button>
          <button className="delete-btn" type="button" id="delete-btn" onClick={onDeleteClicked}>Delete</button>
        </div>
        {errorMsg ? <div className="error-msg">{errorMsg}</div> : ""}
      </article>
    );
  }

  return (
    <div className="notes-app">
      {sidebar}
      <main className="editor-main">{detail}</main>
      <style>{`
        .notes-app {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          background: var(--bg-color, #f9fafb);
        }
        .sidebar {
          background: #fff;
          border-right: 1px solid var(--border-color);
          min-width: 240px;
          width: 250px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 0;
          position: relative;
        }
        .sidebar header {
          padding: 1rem 1rem 0.5rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sidebar h2 {
          font-size: 1.2rem;
          margin: 0;
          color: var(--primary, #3B82F6);
        }
        .new-note-btn {
          background: var(--secondary, #10B981);
          color: #fff;
          border: none;
          border-radius: 0.25rem;
          width: 2rem;
          height: 2rem;
          font-size: 1.5rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .new-note-btn:hover {
          background: var(--accent, #F59E42);
        }
        .sidebar nav {
          flex: 1 1 auto;
          overflow-y: auto;
          margin-top: 1rem;
        }
        .sidebar ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .list-item {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          background: transparent;
          transition: background 0.2s;
        }
        .list-item.selected,
        .list-item:hover {
          background: var(--primary, #3B82F6);
          color: #fff;
        }
        .note-title {
          flex: 1;
          font-weight: 500;
        }
        .note-date {
          color: var(--text-secondary);
          font-size: 0.9em;
          margin-left: 1rem;
        }
        .empty {
          padding: 2rem 1rem;
          color: var(--text-secondary);
          text-align: center;
        }
        .editor-main {
          flex: 1;
          padding: 2.5rem 3rem;
          min-width: 0;
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f9fafb;
        }
        .empty-detail {
          color: var(--text-secondary);
          margin: auto;
          font-size: 1.2rem;
          text-align: center;
        }
        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          max-width: 700px;
          margin: 0 auto;
        }
        .note-title-input {
          font-size: 1.5rem;
          font-weight: 600;
          border: 1px solid var(--border-color);
          padding: 0.75rem;
          border-radius: 0.25rem;
        }
        .note-content-input {
          font-size: 1.05rem;
          min-height: 260px;
          border: 1px solid var(--border-color);
          border-radius: 0.25rem;
          padding: 0.8rem;
          font-family: inherit;
          resize: vertical;
        }
        .note-detail {
          text-align: left;
          max-width: 700px;
          margin: 0 auto;
        }
        .note-detail h2 {
          font-size: 2rem;
          margin-bottom: 0.2em;
          color: var(--primary, #3B82F6);
        }
        .note-meta {
          font-size: 0.92em;
          color: var(--text-secondary);
          margin-bottom: 1em;
        }
        .note-content {
          white-space: pre-wrap;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 0.25rem;
          padding: 1.2rem;
          min-height: 200px;
          font-size: 1.09rem;
        }
        .actions {
          margin-top: 1.2rem;
          display: flex;
          gap: 1rem;
        }
        .save-btn, .edit-btn {
          background: var(--primary, #3B82F6);
          color: #fff;
          border: none;
          border-radius: 0.22rem;
          padding: 0.6rem 1.6rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .cancel-btn {
          background: var(--secondary, #10B981);
          color: #fff;
          border: none;
          border-radius: 0.22rem;
          padding: 0.6rem 1.6rem;
          font-weight: 600;
          cursor: pointer;
        }
        .delete-btn {
          background: var(--accent, #F59E42);
          color: #fff;
          border: none;
          border-radius: 0.22rem;
          padding: 0.6rem 1.3rem;
          font-weight: 600;
          cursor: pointer;
        }
        .save-btn[disabled], .cancel-btn[disabled], .delete-btn[disabled] { opacity: 0.8; cursor: default; }
        .edit-btn { margin-left: 0; }
        .error-msg {
          color: #ef4444;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}
export default NotesApp;
