---
name: find-notes
description: Search, list or retrieve notes from the carnet. Use when the user says "go look", "look in my notes", "find note", "search notes", "show my notes", "what did I write about X", "cherche dans mes notes", "retrouve la note sur", "montre mes notes", or wants to recall content from the notes system. For "what to review today", prefer review-notes instead - that skill owns the spaced-repetition queue.
allowed-tools: Bash(curl:*), Bash(jq:*)
---

# Find notes

Retrieve notes from the carnet.

## Routing

1. **Specific id known** -> `GET /notes/<id>` (returns full note + rendered body)
2. **Keyword / phrase search** -> `GET /notes/search?q=<terms>` (server-side full-text search with ranking and snippet)
3. **Filter by tag** -> `GET /notes/search?tag=<tag>` (combinable with q)
4. **Plain list (no query)** -> `GET /notes`
5. **"What to review today"** -> this is not for find-notes. Hand off to the review-notes skill.

## API shapes

- `GET /notes` -> `{"notes": [{"id","title","tags","created","last_review","next_review"}, ...]}`. Always iterate `.notes[]`. The list endpoint does not include the body.
- `GET /notes/:id` -> `{"note": {<all fields>}, "body": "<rendered>"}`. Read `.note` for metadata and `.body` for the rendered markdown.
- `GET /notes/search?q=...&tag=...&limit=N` -> `{"query","tag","count","results":[{"id","title","tags","score","matches":{"title","tags","body"},"snippet"}, ...]}`. Iterate `.results[]`. Scoring: phrase-in-title +5, term-in-title +3, term-in-tags +2, term-in-body +1 (body capped at 5 per term).

## Setup

```bash
API="$NOTES_API_URL"
[ -z "$API" ] && { echo "NOTES_API_URL not set"; exit 1; }
[ -z "$NOTES_API_TOKEN" ] && { echo "NOTES_API_TOKEN not set"; exit 1; }
AUTH=(-H "Authorization: Bearer $NOTES_API_TOKEN")
```

## Actions

```bash
# Full list (metadata only)
curl -s "${AUTH[@]}" "$API/notes" | jq '.notes'

# Single note (with body)
curl -s "${AUTH[@]}" "$API/notes/<ID>" | jq '{meta: .note, body}'

# Full-text search (URL-encode the query - jq handles the rest)
Q=$(printf %s "<KEYWORDS>" | jq -sRr @uri)
curl -s "${AUTH[@]}" "$API/notes/search?q=$Q&limit=10" \
  | jq '.results[] | {id, title, score, snippet}'

# Search within a tag
curl -s "${AUTH[@]}" "$API/notes/search?q=$Q&tag=<TAG>"

# Filter by tag only (no keywords)
curl -s "${AUTH[@]}" "$API/notes/search?tag=<TAG>"
```

Avoid the old list-then-grep-client-side approach - the server endpoint ranks better and returns snippets for free.

## Output

- Single note: render the markdown body.
- Search results: ranked list with id, title, score, and snippet (highlighted match). Cap at 10 rows unless the user asks for more.
- Plain list: compact table (id, title, tags, next_review). Cap at 20 rows and mention the full total.
