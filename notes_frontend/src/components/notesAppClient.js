import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || window.PUBLIC_SUPABASE_URL || 'https://mzxyorlnbfdkneiezgjz.supabase.co';
const SUPABASE_KEY = import.meta.env.PUBLIC_SUPABASE_KEY || window.PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16eHlvcmxuYmZka25laWV6Z2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNDUxMDksImV4cCI6MjA2NzYyMTEwOX0.URYpbwtC2u5ORBlUzpWPNspXMWq_cLBOKWMOgGbilyQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const NOTES_TABLE = 'notes';

/**
 * Helper to fetch all notes ordered by latest update.
 */
async function fetchNotes() {
  const { data, error } = await supabase
    .from(NOTES_TABLE)
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Helper to fetch a single note.
 */
async function fetchNote(id) {
  const { data, error } = await supabase
    .from(NOTES_TABLE)
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Helper to create note.
 */
async function createNote(payload) {
  const { data, error } = await supabase
    .from(NOTES_TABLE)
    .insert([{ title: payload.title, content: payload.content }])
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Helper to update note.
 */
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

/**
 * Helper to delete note.
 */
async function deleteNote(id) {
  const { error } = await supabase
    .from(NOTES_TABLE)
    .delete()
    .eq('id', id);
  if (error) throw error;
}


// UI rendering
let notes = [];
let selectedNoteId = null;
let isEditing = false;
let errorMsg = null;
let loading = false;

const appEl = document.getElementById('notes-app');

/**
 * Helper: Format date nicely.
 */
function toShortDate(dtString) {
  if (!dtString) return '';
  return new Date(dtString).toLocaleDateString([], { year: '2-digit', month: 'short', day: '2-digit' });
}
function toReadable(dtString) {
  if (!dtString) return '';
  const d = new Date(dtString);
  return d.toLocaleString([], { year: '2-digit', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function render() {
  // Sidebar
  let sidebar =
    `<aside class="sidebar">
      <header>
        <h2>Notes</h2>
        <button class="new-note-btn" title="Create New Note" id="sidebar-new-note">+</button>
      </header>
      <nav>` +
      (notes.length === 0
        ? `<div class="empty">No notes</div>`
        : `<ul>${
            notes
              .map(
                (note) => `<li class="list-item${note.id === selectedNoteId ? " selected" : ""}" data-note-id="${note.id}">
              <span class="note-title">${note.title || "Untitled"}</span>
              <span class="note-date">${toShortDate(note.updated_at)}</span>
            </li>`
              )
              .join("")
          }</ul>`) +
      `</nav>
    </aside>`;

  // Main area
  let note = notes.find((n) => n.id === selectedNoteId) || null;
  let detail = "";
  if (!note && !isEditing) {
    detail = `<div class="empty-detail">No note selected.</div>`;
  } else if (isEditing) {
    let editTitle = note ? note.title : "";
    let editContent = note ? note.content : "";
    detail = `<form class="edit-form" id="edit-note-form">
      <input class="note-title-input" id="edit-title" value="${escapeHTML(editTitle)}" placeholder="Title" autofocus />
      <textarea class="note-content-input" id="edit-content" placeholder="Start writing your note..." rows="16">${escapeHTML(
        editContent
      )}</textarea>
      <div class="actions">
        <button class="save-btn" type="submit">${note && note.id ? "Save" : "Create"}</button>
        <button class="cancel-btn" type="button" id="cancel-edit-btn">Cancel</button>
        ${(note && note.id) ? `<button class="delete-btn" type="button" id="delete-btn">Delete</button>` : ""}
      </div>
      ${errorMsg ? `<div class="error-msg">${escapeHTML(errorMsg)}</div>` : ""}
    </form>`;
  } else {
    detail = `<article class="note-detail">
    <h2>${escapeHTML(note.title || "Untitled note")}</h2>
    <div class="note-meta">${note.updated_at ? `Last updated: ${toReadable(note.updated_at)}` : ""}</div>
    <pre class="note-content">${escapeHTML(note.content || "")}</pre>
    <div class="actions">
      <button class="edit-btn" id="edit-btn">Edit</button>
      <button class="delete-btn" type="button" id="delete-btn">Delete</button>
    </div>
    ${errorMsg ? `<div class="error-msg">${escapeHTML(errorMsg)}</div>` : ""}
    </article>`;
  }

  appEl.innerHTML = `<div class="notes-app">${sidebar}<main class="editor-main">${detail}</main></div>`;
  applyStyling();

  // Event handlers
  document.getElementById("sidebar-new-note").onclick = onNewNote;
  Array.from(document.querySelectorAll(".list-item")).forEach((el) => {
    el.onclick = () => onSelect(el.getAttribute("data-note-id"));
  });
  if (document.getElementById("edit-btn")) {
    document.getElementById("edit-btn").onclick = onEdit;
  }
  if (document.getElementById("edit-note-form")) {
    document.getElementById("edit-note-form").onsubmit = async (e) => {
      e.preventDefault();
      let title = document.getElementById("edit-title").value;
      let content = document.getElementById("edit-content").value;
      await onSave({ title, content });
    };
  }
  if (document.getElementById("cancel-edit-btn")) {
    document.getElementById("cancel-edit-btn").onclick = onCancel;
  }
  if (document.getElementById("delete-btn")) {
    document.getElementById("delete-btn").onclick = onDelete;
  }
}

function escapeHTML(str) {
  return (str || '').replace(/[&<>"']/g, function (match) {
    switch (match) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
    }
  });
}

/** Styling from Astro CSS split here for SIDEBAR and MAIN, since this is a pure client module now */
function applyStyling() {
  if (document.getElementById("notes-app").querySelector("style")) return;
  const style = document.createElement("style");
  style.textContent = `
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
`;
  document.getElementById("notes-app").appendChild(style);
}

// UI event handlers
async function onSelect(noteId) {
  selectedNoteId = noteId;
  isEditing = false;
  errorMsg = null;
  render();
}

function onNewNote() {
  isEditing = true;
  selectedNoteId = null;
  errorMsg = null;
  render();
}

function onEdit() {
  isEditing = true;
  errorMsg = null;
  render();
}

function onCancel() {
  isEditing = false;
  errorMsg = null;
  render();
}

// Save (create or update)
async function onSave({ title, content }) {
  loading = true;
  try {
    if (!selectedNoteId) {
      // Create new note
      const created = await createNote({ title, content });
      notes = await fetchNotes();
      selectedNoteId = created.id;
      isEditing = false;
      errorMsg = null;
    } else {
      await updateNote(selectedNoteId, { title, content });
      notes = await fetchNotes();
      isEditing = false;
      errorMsg = null;
    }
  } catch (e) {
    errorMsg = "Failed to save note.";
  } finally {
    loading = false;
    render();
  }
}

async function onDelete() {
  if (!selectedNoteId) return;
  if (!confirm('Are you sure you want to delete this note?')) return;
  loading = true;
  try {
    await deleteNote(selectedNoteId);
    notes = await fetchNotes();
    selectedNoteId = notes[0]?.id || null;
    isEditing = false;
    errorMsg = null;
  } catch (e) {
    errorMsg = "Could not delete note.";
  } finally {
    loading = false;
    render();
  }
}

// Initial load
async function initNotes() {
  try {
    notes = await fetchNotes();
    selectedNoteId = notes[0]?.id || null;
    render();
  } catch (e) {
    appEl.innerHTML = "<div class='empty-detail'>Could not load notes.</div>";
  }
}

initNotes();
