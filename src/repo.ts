import matter from 'gray-matter';
import { fsrs, createEmptyCard, State } from 'ts-fsrs';
import type { Card, Grade } from 'ts-fsrs';
import { getObject, putObject, deleteObject, listKeys } from './storage.js';

export type Rating = 1 | 2 | 3 | 4; // 1=Again  2=Hard  3=Good  4=Easy

const f = fsrs();

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

// Vue lisible de la carte FSRS exposée par l'API (état en toutes lettres, dates ISO).
export interface ReviewCard {
  state: string; // New | Learning | Review | Relearning
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  last_review?: string;
}

export interface Note {
  id: string;
  project_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  due_at?: string; // miroir de review.due, présent une fois la note enrôlée en révision
  review?: ReviewCard;
}

export type NoteSummary = Omit<Note, 'body'>;

// --- Helpers ---

const now = (): string => new Date().toISOString();
const toDate = (v: Date | string | number): Date => (v instanceof Date ? v : new Date(v));
const iso = (v: Date | string | number): string => toDate(v).toISOString();

function slugify(s: string): string {
  return (
    s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'item'
  );
}

const metaKey = (pid: string) => `projects/${pid}/meta.json`;
const noteKey = (pid: string, nid: string) => `projects/${pid}/notes/${nid}.md`;

function presentCard(card: Card): ReviewCard {
  return {
    state: State[card.state],
    due: iso(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    ...(card.last_review ? { last_review: iso(card.last_review) } : {}),
  };
}

// Construit la Note exposée à partir du frontmatter (data) et du corps (content).
function buildNote(data: { [key: string]: any }, content: string, id: string, projectId: string): Note {
  const note: Note = {
    id,
    project_id: projectId,
    title: String(data.title ?? id),
    body: content,
    created_at: iso(data.created_at),
    updated_at: iso(data.updated_at),
  };
  if (data.fsrs) {
    note.review = presentCard(data.fsrs as Card);
    note.due_at = note.review.due;
  }
  return note;
}

// --- Projects ---

export async function listProjects(): Promise<Project[]> {
  const { prefixes } = await listKeys('projects/', '/');
  const results = await Promise.all(
    prefixes.map(async (prefix) => {
      const raw = await getObject(metaKey(prefix.slice('projects/'.length, -1)));
      return raw ? (JSON.parse(raw) as Project) : null;
    }),
  );
  return results.filter(Boolean) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const raw = await getObject(metaKey(id));
  return raw ? (JSON.parse(raw) as Project) : null;
}

export async function createProject(name: string): Promise<Project> {
  const project: Project = { id: slugify(name), name, created_at: now() };
  await putObject(metaKey(project.id), JSON.stringify(project));
  return project;
}

export async function deleteProject(id: string): Promise<boolean> {
  if (!(await getProject(id))) return false;
  const { keys } = await listKeys(`projects/${id}/`);
  await Promise.all(keys.map((k) => deleteObject(k)));
  return true;
}

// --- Notes ---

export async function listNotes(projectId: string): Promise<NoteSummary[]> {
  const { keys } = await listKeys(`projects/${projectId}/notes/`);
  const results = await Promise.all(
    keys.filter((k) => k.endsWith('.md')).map(async (key) => {
      const raw = await getObject(key);
      if (raw === null) return null;
      const { data, content } = matter(raw);
      const id = key.slice(`projects/${projectId}/notes/`.length, -3);
      const { body: _body, ...summary } = buildNote(data, content, id, projectId);
      return summary;
    }),
  );
  return results.filter(Boolean) as NoteSummary[];
}

export async function getNote(projectId: string, noteId: string): Promise<Note | null> {
  const raw = await getObject(noteKey(projectId, noteId));
  if (raw === null) return null;
  const { data, content } = matter(raw);
  return buildNote(data, content, noteId, projectId);
}

export async function createNote(projectId: string, title: string, body = ''): Promise<Note> {
  const id = slugify(title);
  const ts = now();
  await putObject(noteKey(projectId, id), matter.stringify(body, { title, created_at: ts, updated_at: ts }));
  return { id, project_id: projectId, title, body, created_at: ts, updated_at: ts };
}

export async function updateNote(projectId: string, noteId: string, patch: { title?: string; body?: string }): Promise<Note | null> {
  const raw = await getObject(noteKey(projectId, noteId));
  if (raw === null) return null;
  const { data, content } = matter(raw);
  const fm: { [key: string]: any } = {
    title: patch.title ?? String(data.title ?? noteId),
    created_at: iso(data.created_at),
    updated_at: now(),
  };
  if (data.fsrs) fm.fsrs = data.fsrs;
  const newBody = patch.body ?? content;
  await putObject(noteKey(projectId, noteId), matter.stringify(newBody, fm));
  return buildNote(fm, newBody, noteId, projectId);
}

export async function deleteNote(projectId: string, noteId: string): Promise<boolean> {
  if ((await getObject(noteKey(projectId, noteId))) === null) return false;
  await deleteObject(noteKey(projectId, noteId));
  return true;
}

// Applique une note de révision FSRS. La carte est créée à la première révision (enrôlement).
export async function reviewNote(projectId: string, noteId: string, rating: Rating): Promise<Note | null> {
  const raw = await getObject(noteKey(projectId, noteId));
  if (raw === null) return null;
  const { data, content } = matter(raw);
  const card: Card = (data.fsrs as Card) ?? createEmptyCard(new Date());
  const { card: next } = f.next(card, new Date(), rating as Grade);
  const fm = {
    title: String(data.title ?? noteId),
    created_at: iso(data.created_at),
    updated_at: now(),
    fsrs: next,
  };
  await putObject(noteKey(projectId, noteId), matter.stringify(content, fm));
  return buildNote(fm, content, noteId, projectId);
}

// --- Révisions dues (tous projets confondus) ---

export async function listDueNotes(before?: string): Promise<NoteSummary[]> {
  const threshold = before ? new Date(before) : new Date();
  const { prefixes } = await listKeys('projects/', '/');
  const all = await Promise.all(
    prefixes.map(async (prefix) => {
      const projectId = prefix.slice('projects/'.length, -1);
      const { keys } = await listKeys(`projects/${projectId}/notes/`);
      const notes = await Promise.all(
        keys.filter((k) => k.endsWith('.md')).map(async (key) => {
          const raw = await getObject(key);
          if (raw === null) return null;
          const { data, content } = matter(raw);
          if (!data.fsrs || toDate((data.fsrs as Card).due) > threshold) return null;
          const id = key.slice(`projects/${projectId}/notes/`.length, -3);
          const { body: _body, ...summary } = buildNote(data, content, id, projectId);
          return summary;
        }),
      );
      return notes.filter(Boolean) as NoteSummary[];
    }),
  );
  return all.flat();
}
