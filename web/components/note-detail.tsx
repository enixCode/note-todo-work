"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RATINGS, type Note, type Rating } from "@/lib/api";

const STATE_LABEL: Record<string, string> = {
  New: "nouvelle",
  Learning: "apprentissage",
  Review: "revision",
  Relearning: "reapprentissage",
};

// Palette froide : pas de feu tricolore. Easy = action primaire (hot), le reste en retrait.
const VARIANT: Record<Rating, "outline" | "secondary" | "default"> = {
  1: "outline",
  2: "outline",
  3: "secondary",
  4: "default",
};

function fmt(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function NoteDetail({
  note,
  onReview,
  reviewing,
}: {
  note: Note;
  onReview: (r: Rating) => void;
  reviewing: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h2 className="font-heading text-2xl font-bold tracking-tight">
          {note.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>maj {fmt(note.updated_at)}</span>
          {note.review && (
            <span className="rounded-sm border px-1.5 py-0.5">
              {STATE_LABEL[note.review.state] ?? note.review.state}
            </span>
          )}
          {note.due_at && <span>echeance {fmt(note.due_at)}</span>}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <article className="prose prose-sm max-w-3xl px-6 py-6 dark:prose-invert">
          {note.body.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.body}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">note vide</p>
          )}
        </article>
      </ScrollArea>

      <div className="border-t px-6 py-3">
        <p className="mb-2 text-xs text-muted-foreground">
          {note.review ? "noter cette revision" : "demarrer la revision espacee"}
        </p>
        <div className="flex flex-wrap gap-2">
          {RATINGS.map((r) => (
            <Button
              key={r.value}
              variant={VARIANT[r.value]}
              size="sm"
              disabled={reviewing}
              onClick={() => onReview(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
