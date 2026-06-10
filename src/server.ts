import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { readFileSync } from 'node:fs';
import * as repo from './repo.js';

const llmsTxt = readFileSync(new URL('../llms.txt', import.meta.url), 'utf-8');

const app = new Hono();
app.use('*', logger(), cors());

app.get('/health', (c) => c.json({ ok: true }));
app.get('/llms.txt', (c) => c.text(llmsTxt));

// --- Projects ---
app.get('/projects', async (c) => c.json(await repo.listProjects()));

app.post('/projects', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.name?.trim()) return c.json({ error: 'name is required' }, 400);
  return c.json(await repo.createProject(body.name.trim()), 201);
});

app.delete('/projects/:id', async (c) => {
  if (!(await repo.deleteProject(c.req.param('id')))) return c.json({ error: 'not found' }, 404);
  return c.body(null, 204);
});

// --- Notes ---
const P = '/projects/:projectId';

app.get(`${P}/notes`, async (c) => {
  if (!(await repo.getProject(c.req.param('projectId')))) return c.json({ error: 'project not found' }, 404);
  return c.json(await repo.listNotes(c.req.param('projectId')));
});

app.post(`${P}/notes`, async (c) => {
  if (!(await repo.getProject(c.req.param('projectId')))) return c.json({ error: 'project not found' }, 404);
  const body = await c.req.json().catch(() => null);
  if (!body?.title?.trim()) return c.json({ error: 'title is required' }, 400);
  return c.json(await repo.createNote(c.req.param('projectId'), body.title.trim(), body.body ?? ''), 201);
});

app.get(`${P}/notes/:noteId`, async (c) => {
  const note = await repo.getNote(c.req.param('projectId'), c.req.param('noteId'));
  if (!note) return c.json({ error: 'not found' }, 404);
  return c.json(note);
});

app.put(`${P}/notes/:noteId`, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'invalid body' }, 400);
  const note = await repo.updateNote(c.req.param('projectId'), c.req.param('noteId'), { title: body.title, body: body.body });
  if (!note) return c.json({ error: 'not found' }, 404);
  return c.json(note);
});

app.delete(`${P}/notes/:noteId`, async (c) => {
  if (!(await repo.deleteNote(c.req.param('projectId'), c.req.param('noteId')))) return c.json({ error: 'not found' }, 404);
  return c.body(null, 204);
});

app.post(`${P}/notes/:noteId/review`, async (c) => {
  const body = await c.req.json().catch(() => null);
  const rating = body?.rating;
  if (![1, 2, 3, 4].includes(rating)) return c.json({ error: 'rating must be 1 (Again) 2 (Hard) 3 (Good) 4 (Easy)' }, 400);
  const note = await repo.reviewNote(c.req.param('projectId'), c.req.param('noteId'), rating as repo.Rating);
  if (!note) return c.json({ error: 'not found' }, 404);
  return c.json(note);
});

// --- Révisions dues (tous projets) ---
app.get('/review/due', async (c) => {
  const { before } = c.req.query();
  return c.json(await repo.listDueNotes(before));
});

// --- UI statique ---
// Build Next.js exporte, copie dans ./public par le Dockerfile. Les routes API
// ci-dessus restent prioritaires ; en dev ./public n'existe pas (UI sur :3000).
app.use('/*', serveStatic({ root: './public' }));
app.get('*', serveStatic({ path: './public/index.html' }));

const port = Number(process.env.PORT ?? 8080);
serve({ fetch: app.fetch, port }, (info) => console.log(`listening on http://localhost:${info.port}`));
