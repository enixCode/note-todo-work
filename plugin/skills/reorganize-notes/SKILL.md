---
name: reorganize-notes
description: Reorganize, clean up or bulk-restructure the notes carnet. Use when the user says "reorganize", "clean up notes", "tidy my notes", "group my notes", "fix tags", "deduplicate", "range mes notes", "reorganise", "nettoie mes notes", or wants bulk cleanup across many notes. For single-note edits (fix the title of note X), use edit-note instead.
allowed-tools: Bash(curl:*), Bash(jq:*)
---

# Reorganize notes

Analyse and clean up the carnet at the carnet level. Never destructive without confirmation.

## API shapes

- `GET /notes` -> `{"notes": [<metadata only>]}`
- `GET /notes/:id` -> `{"note": {<full, incl. body>}}`
- `PUT /notes/:id` replaces the note. You must send the full desired payload. A PUT with only `{"tags": "x"}` will wipe title and body. Always GET first, merge, then PUT the merged object.
- `DELETE /notes/:id` removes the note.

## Setup

```bash
API="$NOTES_API_URL"
[ -z "$API" ] && { echo "NOTES_API_URL not set"; exit 1; }
[ -z "$NOTES_API_TOKEN" ] && { echo "NOTES_API_TOKEN not set"; exit 1; }
AUTH=(-H "Authorization: Bearer $NOTES_API_TOKEN")
```

## Steps

1. Fetch all notes: `curl -s "${AUTH[@]}" "$API/notes" | jq '.notes'`.
2. Analyse and propose a plan covering the axes that actually show issues in the current data:
   - **Duplicates**: near-identical titles, overlapping tags, matching leading sentence. Use your own judgment rather than a rigid threshold - if you are unsure, list as "possible duplicate" and let the user decide.
   - **Tags**: typos, inconsistent casing, singular/plural drift, orphan tags used once.
   - **Stale**: `next_review` far in the past without activity, or never reviewed.
   - **Orphan**: no tag + very short body.
   - **Grouping**: propose tag clusters for untagged notes.
3. **Show the full plan first**, numbered, grouped by action type. Nothing has been written yet at this point.
4. **Ask for confirmation** before any write. Accept "all", "only 1,3,5", "skip deletes".
5. Apply each approved item:
   - For a retag or rename: GET the note, modify the field(s), PUT the full merged body back.
     ```bash
     curl -s "${AUTH[@]}" "$API/notes/<ID>" | jq '.note | {title, body, tags, review_days: 7}' \
       | jq '.tags = "<NEW_TAGS>"' \
       | curl -s -X PUT "${AUTH[@]}" -H "Content-Type: application/json" -d @- "$API/notes/<ID>"
     ```
   - For a delete: only after explicit yes for that specific id.
     ```bash
     curl -s -X DELETE "${AUTH[@]}" "$API/notes/<ID>"
     ```
6. Never merge two notes automatically - if the user approves a merge, build the merged markdown, preview it, then save as a new note via POST and delete the sources.

## Rules

- Never delete without explicit user approval per note.
- Report a short summary at the end: N renamed, N retagged, N deleted, N skipped.
