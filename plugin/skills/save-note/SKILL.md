---
name: save-note
description: Save a new piece of content to the notes carnet. Use when the user says "save this", "save to notes", "note this", "remember this", "add a note", "keep this", "note ca", "garde ca", "retiens ca", "enregistre ca", or wants to capture content into the spaced-repetition notes system. If the user wants to modify an existing note, prefer edit-note instead.
allowed-tools: Bash(curl:*), Bash(jq:*)
---

# Save a note

Capture a new note into the carnet via the API.

## Inputs

- `title` (required): short descriptive title. If not given, derive from the first heading or first meaningful line of the body.
- `body` (required): markdown content.
- `tags` (optional): comma-separated.
- `review_days` (optional): days until next review. Let the server apply its default rather than hardcoding a value, unless the user asks for a specific interval.

Ask the user only for what is missing and cannot reasonably be inferred.

## API shape

`POST /notes` returns `{"note": {"id", "title", "tags", "created", "last_review", "next_review"}}`. Read the id and next_review from `.note.*`, not from the top level.

## Action

Use a heredoc for the JSON payload to handle multiline bodies and embedded quotes safely.

```bash
API="$NOTES_API_URL"
[ -z "$API" ] && { echo "NOTES_API_URL not set - ask the user to export it"; exit 1; }
[ -z "$NOTES_API_TOKEN" ] && { echo "NOTES_API_TOKEN not set - ask the user to export it, do not hardcode"; exit 1; }

PAYLOAD=$(jq -n \
  --arg title "<TITLE>" \
  --arg body "<BODY>" \
  --arg tags "<TAGS>" \
  '{title: $title, body: $body, tags: $tags}')

curl -s -X POST "$API/notes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NOTES_API_TOKEN" \
  -d "$PAYLOAD" | jq '.note | {id, title, tags, next_review}'
```

If the user asked for a specific review interval, add `review_days: <N>` to the jq object.

## Output

Report one line: "saved: <id> - <title> - next review <date>".
