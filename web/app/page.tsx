"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSidebar } from "@/components/app-sidebar";
import { NoteDetail } from "@/components/note-detail";
import { SearchCommand } from "@/components/search-command";
import {
  api,
  isDue,
  type Note,
  type NoteSummary,
  type Project,
  type Rating,
} from "@/lib/api";

export default function Page() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<NoteSummary[]>([]); // tout le vault (titres) pour recherche + listes
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ps = await api.listProjects();
        setProjects(ps);
        const lists = await Promise.all(ps.map((p) => api.listNotes(p.id)));
        setNotes(lists.flat());
        if (ps.length) setSelectedProject(ps[0].id);
      } catch (e) {
        toast.error("API injoignable", { description: String(e) });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openNote = useCallback(async (projectId: string, noteId: string) => {
    setSelectedProject(projectId);
    setSearchOpen(false);
    try {
      setNote(await api.getNote(projectId, noteId));
    } catch (e) {
      toast.error("note introuvable", { description: String(e) });
    }
  }, []);

  const review = useCallback(
    async (rating: Rating) => {
      if (!note) return;
      setReviewing(true);
      try {
        const updated = await api.reviewNote(note.project_id, note.id, rating);
        setNote(updated);
        setNotes((ns) =>
          ns.map((n) =>
            n.id === updated.id && n.project_id === updated.project_id
              ? {
                  ...n,
                  due_at: updated.due_at,
                  review: updated.review,
                  updated_at: updated.updated_at,
                }
              : n,
          ),
        );
        toast.success("revision enregistree", {
          description: updated.due_at
            ? `prochaine echeance ${new Date(updated.due_at).toLocaleString("fr-FR")}`
            : undefined,
        });
      } catch (e) {
        toast.error("echec de la revision", { description: String(e) });
      } finally {
        setReviewing(false);
      }
    },
    [note],
  );

  const projectNotes = useMemo(
    () => notes.filter((n) => n.project_id === selectedProject),
    [notes, selectedProject],
  );
  const dueCount = useMemo(() => notes.filter((n) => isDue(n)).length, [notes]);
  const projectName =
    projects.find((p) => p.id === selectedProject)?.name ?? "brainstorm-vault";

  return (
    <SidebarProvider>
      <AppSidebar
        projects={projects}
        selectedProjectId={selectedProject}
        onSelectProject={(id) => {
          setSelectedProject(id);
          setNote(null);
        }}
        onOpenSearch={() => setSearchOpen(true)}
        dueCount={dueCount}
      />

      <SidebarInset className="flex h-svh flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="font-heading font-semibold tracking-tight">
            {note ? note.title : projectName}
          </span>
          {note && (
            <button
              onClick={() => setNote(null)}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              retour a la liste
            </button>
          )}
        </header>

        <div className="min-h-0 flex-1">
          {loading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-24 w-full max-w-2xl" />
            </div>
          ) : note ? (
            <NoteDetail note={note} onReview={review} reviewing={reviewing} />
          ) : (
            <ScrollArea className="h-full">
              <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
                {projectNotes.map((n) => (
                  <button
                    key={n.id}
                    className="text-left"
                    onClick={() => openNote(n.project_id, n.id)}
                  >
                    <Card className="h-full transition-colors hover:border-primary">
                      <CardHeader>
                        <CardTitle className="font-heading text-base">
                          {n.title}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {n.review
                            ? `${n.review.state}${isDue(n) ? " . a reviser" : ""}`
                            : "brainstorm"}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </button>
                ))}
                {projectNotes.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    aucune note dans ce projet
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </SidebarInset>

      <SearchCommand
        open={searchOpen}
        onOpenChange={setSearchOpen}
        notes={notes}
        projects={projects}
        onSelect={openNote}
      />
    </SidebarProvider>
  );
}
