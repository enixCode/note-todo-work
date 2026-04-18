---
name: edit-note
description: Edit a single existing note - change its title, body, or tags. Use when the user says "edit note X", "rename note X", "fix the title of", "update tags on", "change body of", "modifie la note", "renomme la note", "corrige", or references a specific note id and wants to change one of its fields. For creating a new note, use save-note. For cleaning up many notes at once, use reorganize-notes.
allowed-tools: Bash(curl:*), Bash(jq:*)
---

# Edit a single note

Update one field (or a few) of an existing note, safely.

## API shape

`PUT /notes/:id` replaces the note with the payload you send. A PUT with only `{"tags": "x"}` will wipe the title and body. The safe pattern is always GET -> merge -> PUT the full object.

`DELETE /notes/:id` if the user wants to delete rather than edit - confirm explicitly before calling.

## Setup

```bash
API="$NOTES_API_URL"
[ -z "$API" ] && { echo "NOTES_API_URL not set"; exit 1; }
[ -z "$NOTES_API_TOKEN" ] && { echo "NOTES_API_TOKEN not set"; exit 1; }
AUTH=(-H "Authorization: Bearer $NOTES_API_TOKEN")
```

## Steps

1. Confirm the target note id. If the user gave a title or approximate description rather than an id, hand off to find-notes to resolve, then come back with the id.
2. Fetch the current state:
   ```bash
   curl -s "${AUTH[@]}" "$API/notes/<ID>" | jq '.note'
   ```
3. Show the user the current value of the fields they want to change, plus the proposed new value. For a body change, show a unified diff.
4. Wait for explicit confirmation.
5. Build the merged payload from the GET response and PUT it back:
   ```bash
   curl -s "${AUTH[@]}" "$API/notes/<ID>" \
     | jq '.note | {title, body, tags}' \
     | jq '.title = "<NEW_TITLE>"' \
     | curl -s -X PUT "${AUTH[@]}" -H "Content-Type: application/json" -d @- "$API/notes/<ID>"
   ```
   Substitute which field(s) the jq step rewrites depending on what the user is changing.
6. Report one line: "updated: <id> - <what changed>".

## Rules

- Never skip the GET step - partial PUTs destroy data on this API.
- For destructive edits (shrinking body, removing tags entirely), double-confirm.
