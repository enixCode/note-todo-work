// Client de l'API brainstorm-vault (Hono). Voir llms.txt a la racine du repo.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090";

export type Project = {
  id: string;
  name: string;
  created_at: string;
};

export type ReviewCard = {
  state: "New" | "Learning" | "Review" | "Relearning";
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  last_review?: string;
};

export type NoteSummary = {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  due_at?: string;
  review?: ReviewCard;
};

export type Note = NoteSummary & { body: string };

export type Rating = 1 | 2 | 3 | 4;

export const RATINGS: { value: Rating; label: string }[] = [
  { value: 1, label: "Again" },
  { value: 2, label: "Hard" },
  { value: 3, label: "Good" },
  { value: 4, label: "Easy" },
];

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} sur ${path}`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  listProjects: () => req<Project[]>("/projects"),
  listNotes: (projectId: string) =>
    req<NoteSummary[]>(`/projects/${encodeURIComponent(projectId)}/notes`),
  getNote: (projectId: string, noteId: string) =>
    req<Note>(
      `/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}`,
    ),
  reviewNote: (projectId: string, noteId: string, rating: Rating) =>
    req<Note>(
      `/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}/review`,
      { method: "POST", body: JSON.stringify({ rating }) },
    ),
  listDue: (before?: string) =>
    req<NoteSummary[]>(
      `/review/due${before ? `?before=${encodeURIComponent(before)}` : ""}`,
    ),
};

export function isDue(note: NoteSummary, at: Date = new Date()): boolean {
  return !!note.due_at && new Date(note.due_at) <= at;
}
