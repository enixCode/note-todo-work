---
name: review-notes
description: Handle spaced-repetition review of notes. Use when the user says "what to review", "pending review", "review my notes", "I reviewed X", "mark reviewed", "bump review", "qu'est-ce que j'ai a reviser", "mes notes a reviser", "marque revue", or wants to see or update the spaced-repetition state of the carnet. This skill owns the review queue - find-notes should defer to this one on review-related questions.
allowed-tools: Bash(curl:*), Bash(jq:*)
---

# Review notes

Drive the spaced-repetition flow of the carnet.

## API shapes

- `GET /notes/review/pending` when there are pending notes: `{"notes": [<note>, ...], "count": N}`.
- `GET /notes/review/pending` when empty: `{"notes": {}, "count": 0}` - note the object-not-array on the notes field when count is zero. Always branch on `.count` first.
- `PATCH /notes/:id/review?days=N` marks reviewed and bumps `next_review` by N days server-side.

Dates are ISO yyyy-mm-dd strings.

## Setup

```bash
API="$NOTES_API_URL"
[ -z "$API" ] && { echo "NOTES_API_URL not set"; exit 1; }
[ -z "$NOTES_API_TOKEN" ] && { echo "NOTES_API_TOKEN not set"; exit 1; }
AUTH=(-H "Authorization: Bearer $NOTES_API_TOKEN")
```

## Routing

1. **"What's due / pending / to review today"** -> list pending.
2. **"I reviewed note X"** -> mark that id reviewed.
3. **"Reschedule X by N days"** -> mark reviewed with `?days=N`.
4. **"I reviewed all of them"** -> loop over pending ids, mark each. Confirm the count before looping.

## Actions

```bash
# List pending (handle the empty-object edge case)
curl -s "${AUTH[@]}" "$API/notes/review/pending" \
  | jq 'if .count == 0 then "no notes pending" else .notes end'

# Mark a note reviewed (default 7 days server-side; pass days only if the user specifies one)
curl -s -X PATCH "${AUTH[@]}" "$API/notes/<ID>/review?days=<DAYS>"
```

## Behaviour

- Listing: sort by most overdue first. Compute overdue as `today - next_review` in days. Show id, title, last_review, next_review, days_overdue.
- Marking: confirm the new `next_review` back to the user in one line.
- Never mark a note reviewed without explicit intent for that specific id (or an explicit "all").
