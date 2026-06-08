"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { NoteSummary, Project } from "@/lib/api";

export function SearchCommand({
  open,
  onOpenChange,
  notes,
  projects,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  notes: NoteSummary[];
  projects: Project[];
  onSelect: (projectId: string, noteId: string) => void;
}) {
  const nameOf = (id: string) => projects.find((p) => p.id === id)?.name ?? id;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Recherche"
      description="Rechercher une note par titre"
    >
      <CommandInput placeholder="Rechercher une note par titre..." />
      <CommandList>
        <CommandEmpty>aucune note</CommandEmpty>
        <CommandGroup heading="notes">
          {notes.map((n) => (
            <CommandItem
              key={`${n.project_id}/${n.id}`}
              value={`${n.title} ${nameOf(n.project_id)}`}
              onSelect={() => onSelect(n.project_id, n.id)}
            >
              <span className="truncate">{n.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {nameOf(n.project_id)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
