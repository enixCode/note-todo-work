---
name: integrate-notes
description: Integrate existing notes with an external source (current file, code snippet, URL, PR, document, solution). Use when the user says "integrate with", "link to my notes", "cross-reference", "connect to my notes", "match with notes", "lie avec mes notes", "relie a mes notes", or wants to weave the carnet into the current context.
allowed-tools: Bash(curl:*), Bash(jq:*), Read, Grep, Glob
---

# Integrate notes

Find the notes relevant to the user's current context and link them both ways.

## API shapes

- `GET /notes` -> `{"notes": [metadata only]}` - iterate `.notes[]`.
- `GET /notes/:id` -> `{"note": {<full, with body>}}`.
- `PUT /notes/:id` requires the full merged payload (see reorganize-notes for the GET-merge-PUT pattern).
- `POST /notes` returns `{"note": {...}}`.

## Setup

```bash
API="$NOTES_API_URL"
[ -z "$API" ] && { echo "NOTES_API_URL not set"; exit 1; }
[ -z "$NOTES_API_TOKEN" ] && { echo "NOTES_API_TOKEN not set"; exit 1; }
AUTH=(-H "Authorization: Bearer $NOTES_API_TOKEN")
```

## Inputs

Identify the "source" the user wants to integrate with. Examples:
- a file or selection in the editor (use Read / Grep / Glob)
- a URL or doc content
- a piece of code the user just pasted
- a PR or issue

If ambiguous, ask one clarifying question - do not guess.

## Steps

1. Extract keywords, entities, tags from the source: file path, function names, domain terms, existing frontmatter tags.
2. Fetch all notes: `curl -s "${AUTH[@]}" "$API/notes" | jq '.notes'`.
3. Rank candidates against the source. A match on any of (tag, title keyword, body keyword) qualifies a note. Rank by total match count across those axes; break ties by recency (`created`). Body match requires a `GET /notes/:id` so only fetch bodies for the top ~10 title/tag candidates.
4. Present the top 5-10 matches: id, title, why matched (which keywords hit where).
5. Offer concrete integration actions:
   - **Update the source** to reference the notes (add a comment block / markdown link list).
   - **Update the note** body with a "Related:" section pointing to the source. Use the GET-merge-PUT pattern:
     ```bash
     curl -s "${AUTH[@]}" "$API/notes/<ID>" \
       | jq --arg rel "<RELATED_BLOCK>" '.note | {title, body: (.body + "\n\n" + $rel), tags}' \
       | curl -s -X PUT "${AUTH[@]}" -H "Content-Type: application/json" -d @- "$API/notes/<ID>"
     ```
   - **Create a bridging note** that indexes both sides via `POST /notes`. Do the POST here - do not defer to another skill, skills cannot call each other.
6. Apply only the actions the user picks. Show a diff / preview before writing.

## Rules

- Do not edit notes or source files without explicit confirmation.
- Keep the "Related:" append idempotent: check the existing body before adding so repeated runs do not duplicate the block.
