# brainstorm-vault

**v0.2.0** — API REST + UI web minimaliste pour organiser mes notes de brainstorm en Markdown, par projet, avec révision espacée FSRS.

## Vision

Je voulais un endroit où poser mes pensées, mes apprentissages, mes plans et mes challenges sans que ça devienne un second boulot de les maintenir. Pas de base de données relationnelle, pas de schéma rigide : juste des fichiers `.md` dans des dossiers, exposés via une API, une UI web volontairement légère par-dessus, et un planificateur de révision qui me dit quoi revoir et quand.

Les cas d'usage concrets :

- **Connaissances** : synthèses de ce que j'ai appris (reverse, web, crypto, réseau, dev)
- **Labs** : notes sur les labs que je dois créer ou que j'ai créés
- **Challenges** : root-me, CTF, HackTheBox, un projet par plateforme ou par catégorie
- **Problèmes ouverts** : trucs pas encore résolus, idées à creuser, blocages à lever
- **Recherches** : brainstorm avant une implémentation, comparaisons de solutions

Chaque note est un fichier `.md` brut avec frontmatter. Un project est un dossier. Tout est stocké dans MinIO (objet S3-compatible, self-hosted). Quand je veux ancrer une note en mémoire, je l'enrôle dans la révision espacée : l'algorithme FSRS planifie les rappels.

## Fonctionnalités

**Actuelles :**

- CRUD projets + notes via API REST (Hono) ; notes en Markdown brut avec frontmatter
- Révision espacée FSRS (`ts-fsrs`) : enrôlement à la première note, échéances calculées par carte
- Stockage objet MinIO (S3-compatible, self-hosted), aucune base relationnelle
- UI web (Next.js + shadcn/ui, thème DA enixCode) : sidebar des projets, lecture des notes en Markdown rendu, recherche par titre (Ctrl+K) sur tout le vault, notation de révision (Again / Hard / Good / Easy)
- Docker Compose : stack complète (API + MinIO) en une commande

**Prochaines étapes :**

- Déploiement sur serveur perso via Ansible derrière Traefik, avec un workflow GitHub Actions qui redéploie sur push
- Auth de l'UI au niveau du reverse proxy (OAuth), token Bearer pour l'accès machine à l'API
- Création et édition de notes depuis l'UI (aujourd'hui : lecture + révision uniquement)

**À terme :**

- Recherche sémantique par embedding : retrouver une note par le sens, pas seulement par mot-clé
- Vues et filtres UI par échéance et état FSRS, à réviser aujourd'hui, en retard, etc. (le moteur `/review/due` existe déjà côté API)

## Démarrage rapide

```bash
# dev local (Node, hot reload) — nécessite un MinIO joignable
cp .env.example .env   # remplir les vars MinIO
npm install
npm run dev            # http://localhost:8080

# dev Docker (MinIO inclus, console sur :9001)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
# API : http://localhost:8090
# MinIO console : http://localhost:9001  (minioadmin / minioadmin)

# prod (port non publié, derrière un reverse proxy)
docker compose up --build -d
```

```bash
# UI web (dev) — pointe sur l'API ci-dessus via NEXT_PUBLIC_API_URL (défaut http://localhost:8090)
cd web
npm install
npm run dev            # http://localhost:3000
```

## Configuration

| Variable | Par défaut | Description |
|---|---|---|
| `PORT` | `8080` | Port HTTP |
| `MINIO_ENDPOINT` | `http://localhost:9000` | URL du serveur MinIO (host, port et SSL déduits) |
| `MINIO_ACCESS_KEY` | | Clé d'accès |
| `MINIO_SECRET_KEY` | | Clé secrète |
| `MINIO_BUCKET` | | Nom du bucket (obligatoire) |

## API

Toutes les réponses sont en JSON.

### Projects

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/projects` | Lister tous les projets |
| `POST` | `/projects` | Créer un projet. Body : `{ name }` |
| `DELETE` | `/projects/:id` | Supprimer un projet et toutes ses notes |

### Notes

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/projects/:id/notes` | Lister les notes d'un projet (sans le body) |
| `POST` | `/projects/:id/notes` | Créer une note. Body : `{ title, body? }` |
| `GET` | `/projects/:id/notes/:noteId` | Lire une note complète |
| `PUT` | `/projects/:id/notes/:noteId` | Modifier. Body : `{ title?, body? }` |
| `DELETE` | `/projects/:id/notes/:noteId` | Supprimer une note |

### Révision

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/projects/:id/notes/:noteId/review` | Noter une révision. Body : `{ rating }` (1=Again, 2=Hard, 3=Good, 4=Easy). Enrôle la note à la première note. |
| `GET` | `/review/due` | Notes dues maintenant, tous projets. `?before=<ISO>` pour une autre échéance. |

### Exemples

```bash
# créer un projet
curl -X POST http://localhost:8090/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"root-me"}'

# ajouter une note brainstorm
curl -X POST http://localhost:8090/projects/root-me/notes \
  -H 'Content-Type: application/json' \
  -d '{"title":"XSS stocké niveau avancé","body":"## Vecteurs\n- innerHTML"}'

# noter une révision (Good)
curl -X POST http://localhost:8090/projects/root-me/notes/xss-stocke-niveau-avance/review \
  -H 'Content-Type: application/json' \
  -d '{"rating":3}'

# voir ce qui est à réviser
curl http://localhost:8090/review/due
```

## Format des fichiers

Une note fraîche est un `.md` avec un frontmatter minimal :

```
---
title: Mon brainstorm
created_at: 2026-06-07T12:00:00.000Z
updated_at: 2026-06-07T12:00:00.000Z
---

Contenu markdown libre ici.
```

Une fois enrôlée dans la révision (première note), un bloc `fsrs` apparaît :

```
---
title: XSS stocké
created_at: 2026-06-07T12:00:00.000Z
updated_at: 2026-06-08T06:39:55.253Z
fsrs:
  due: 2026-06-08T06:49:55.251Z
  stability: 2.3065
  difficulty: 2.1181
  scheduled_days: 0
  learning_steps: 1
  reps: 1
  lapses: 0
  state: 1
  last_review: 2026-06-08T06:39:55.251Z
---

Contenu markdown libre ici.
```

Les projets sont des "dossiers" virtuels dans le bucket :

```
projects/<slug>/meta.json
projects/<slug>/notes/<slug>.md
```

## Révision espacée (FSRS)

La planification utilise FSRS (Free Spaced Repetition Scheduler) via le package `ts-fsrs`, paramètres par défaut. C'est l'algorithme natif d'Anki depuis 23.10, entraîné sur ~1,7 milliard de révisions réelles.

États d'une carte : `New → Learning → Review ↔ Relearning`. Étapes d'apprentissage par défaut : 1 min puis 10 min, ensuite intervalles en jours.

Intervalles réellement observés (paramètres par défaut, révision faite pile à l'échéance) :

- Carte neuve : `Again → +1 min`, `Hard → +6 min`, `Good → +10 min`, `Easy → +8 jours`
- Toujours `Good` : `10 min → 2 j → 11 j → 46 j → 163 j → 498 j`
- Toujours `Easy` : `8 j → 66 j → 397 j → 1875 j`
- `Again` en Review : retour en Relearning `+10 min`, puis l'intervalle repart réduit

Ces valeurs découlent de `stability`/`difficulty`, pas d'un barème codé en dur : elles varient selon l'historique de chaque carte. Une note jamais notée n'a pas de carte et n'apparaît pas dans `/review/due`.

## Architecture

```
src/
  storage.ts   client MinIO + helpers (get/put/delete/list)
  repo.ts      CRUD Project + Note, slugify, frontmatter (gray-matter), FSRS (ts-fsrs)
  server.ts    routes Hono
web/           UI Next.js (App Router) : sidebar, viewer markdown, recherche, révision
  app/         pages, layout, thème DA
  components/  app-sidebar, note-detail, search-command + shadcn/ui
  lib/api.ts   client typé de l'API
Dockerfile
docker-compose.yml       stack complète avec MinIO
docker-compose.dev.yml   ports publiés pour le dev
```

## Stack

- Node 22 + TypeScript
- Hono + @hono/node-server
- minio (client objet S3-compatible)
- gray-matter (frontmatter Markdown)
- ts-fsrs (révision espacée)

Front (`web/`) :

- Next.js 16 (App Router) + React 19 + TypeScript
- shadcn/ui + Tailwind v4, thème DA enixCode
- react-markdown (rendu des notes)

## Pas d'auth

Aucune couche d'authentification. Mettre derrière un reverse proxy, un VPN, ou un réseau privé.

## License

MIT
