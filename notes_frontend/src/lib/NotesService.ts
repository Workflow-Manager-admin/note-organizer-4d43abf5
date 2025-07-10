import { getSupabaseClient } from './supabaseClient';

const NOTES_TABLE = 'notes';

export type Note = {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  created_at: string;
};

// PUBLIC_INTERFACE
/** Get all notes (ordered by most recently updated first) */
export async function getNotes(): Promise<Note[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(NOTES_TABLE)
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as Note[];
}

// PUBLIC_INTERFACE
/** Get single note by id */
export async function getNote(id: string): Promise<Note | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(NOTES_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Note;
}

// PUBLIC_INTERFACE
/** Create a new note */
export async function createNote(payload: { title: string, content: string }): Promise<Note> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(NOTES_TABLE)
    .insert([{ title: payload.title, content: payload.content }])
    .select('*')
    .single();

  if (error) throw error;
  return data as Note;
}

// PUBLIC_INTERFACE
/** Update existing note */
export async function updateNote(id: string, payload: { title: string, content: string }): Promise<Note> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(NOTES_TABLE)
    .update({ title: payload.title, content: payload.content })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Note;
}

// PUBLIC_INTERFACE
/** Delete a note by id */
export async function deleteNote(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(NOTES_TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
}
