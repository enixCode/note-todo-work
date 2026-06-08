# Plan UI - brainstorm-vault

Suivi de la construction de l'interface. Source de vérité tant que l'UI est en chantier.

## Décisions validées

- **Stack** : Next.js (dernière version stable, App Router, TypeScript) + shadcn/ui (composants importés, pas réinventés) + Tailwind.
- **Emplacement** : `web/` (monorepo léger : API Hono à la racine, UI dans `web/`).
- **Thème** : DA enixCode. Tokens depuis `https://enixcode.github.io/da/tokens.css`, mappés sur les variables shadcn (`--background`, `--foreground`, `--primary`, ...). Fonts Archivo / Fraunces / JetBrains Mono. VOICE : jamais d'emoji dans l'UI, jamais d'em-dash. WCAG 2.2 AA.
- **Données** : API Hono dev sur `http://localhost:8090` via `NEXT_PUBLIC_API_URL`.
- **Recherche** : titre, côté client (Phase 1). Extension au contenu = plus tard.
- **Séquence** : coeur d'abord, vue 3D ensuite.
- **Hors scope maintenant** : déploiement prod (dev-only). La route `/` fake-UI (commit `8781464`) reste transitoire, traitée quand on déploiera le vrai front.

## Phase 1 - Coeur (à ouvrir en dev)

1. Scaffold Next.js dans `web/` (TS, Tailwind, App Router, ESLint, alias `@/*`).
2. `shadcn init` + ajout des composants : sidebar, command, button, card, scroll-area, separator, skeleton, sonner.
3. Mapper le DA sur `globals.css` (lire PALETTE / TYPOGRAPHY / VOICE + `tokens.css`) [délégable Sonnet].
4. Client API `lib/api.ts` (fetch typé vers `:8090`).
5. Layout : sidebar gauche (projets via `GET /projects`) + zone principale.
6. Clic projet -> liste des notes (`GET /projects/:id/notes`).
7. Clic note -> viewer markdown rendu (`GET /projects/:id/notes/:noteId`, react-markdown + remark-gfm).
8. Recherche par titre (command palette shadcn, filtrage client).
9. Action de révision : boutons Again / Hard / Good / Easy -> `POST /projects/:id/notes/:noteId/review`.
10. `npm run dev`, stack API up (`docker compose -f docker-compose.dev.yml up`), ouvrir le navigateur.

**Critère Phase 1** : l'UI liste les projets, ouvre une note rendue, filtre par titre, et note une note due. `tsc --noEmit` et `next build` en exit 0.

## Phase 2 - Vue 3D gamifiée (ABANDONNÉE)

Construite (champ de cubes react-three-fiber) puis retirée le 2026-06-08 : jugée moche et inutile. Le coeur (Phase 1) suffit. Ne pas relancer de feature gadget : simple, fonctionnel, solide.

## Statut

- [x] Phase 1 : scaffold Next 16.2 + shadcn (Tailwind v4), thème DA, client API, sidebar projets, viewer markdown + révision FSRS, recherche Ctrl+K. `tsc --noEmit` exit 0. Dev sur :3000.
- [~] Phase 2 (3D) : **abandonnée**. Champ de cubes construit puis retiré (jugé moche et inutile). On reste sur le coeur, qui suffit. Vraie priorité future = recherche par embedding (voir TODO.md).

### Notes
- Warning Turbopack "multiple lockfiles" (racine API + web/) : bénin, `.env.local` bien chargé. À silencer plus tard via `turbopack.root`.
- `web/node_modules` et `web/.next` ignorés par le `.gitignore` généré dans `web/`.
