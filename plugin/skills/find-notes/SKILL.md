---
name: find-notes
description: Search, list or retrieve notes from the carnet. Use when the user says "go look", "look in my notes", "find note", "search notes", "show my notes", "what did I write about X", "cherche dans mes notes", "retrouve la note sur", "montre mes notes", or wants to recall content from the notes system. For "what to review today", prefer review-notes instead - that skill owns the spaced-repetition queue.
allowed-tools: Bash(curl:*), Bash(jq:*)
---

# Find notes

Retrieve notes from the carnet.

## Routing

1. **Specific id known** -> `GET /notes/<id>` (returns full note + rendered body)
2. **Keyword / topic search** -> `GET /notes` then filter client-side on title, tags, body
3. **Plain list** -> `GET /notes`
4. **"What to review today"** -> this is not for find-notes. Hand off to the review-notes skill.

## API shapes

- `GET /notes` -> `{"notes": [{"id","title","tags","created","last_review","next_review"}, ...]}`. Always iterate `.notes[]`, not `.[]`. The list endpoint does not include the body.
- `GET /notes/:id` -> `{"note": {<all fields + rendered body>}}`. Read `.note`.

The API has no `?q=` search parameter. Keyword search means list + filter locally.

## Setup

```bash
API="$NOTES_API_URL"
[ -z "$API" ] && { echo "NOTES_API_URL not set"; exit 1; }
[ -z "$NOTES_API_TOKEN" ] && { echo "NOTES_API_TOKEN not set"; exit 1; }
AUTH=(-H "Authorization: Bearer $NOTES_API_TOKEN")
```

## Actions

```bash
# List (metadata only)
curl -s "${AUTH[@]}" "$API/notes" | jq '.notes'

# Single note (with body)
curl -s "${AUTH[@]}" "$API/notes/<ID>" | jq '.note'

# Keyword search (title / tags)
curl -s "${AUTH[@]}" "$API/notes" \
  | jq --arg q "<KEYWORD>" '.notes | map(select((.title|ascii_downcase|contains($q|ascii_downcase)) or (.tags|ascii_downcase|contains($q|ascii_downcase))))'
```

For body search, first narrow by title/tags, then for the top candidates fetch `/notes/:id` and grep the body - avoid fetching every body.

## Output

- Single note: render the markdown body.
- List: compact table (id, title, tags, next_review). Cap at 20 rows for readability and mention the full total; show all if the user asks.
