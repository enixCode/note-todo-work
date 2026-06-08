"use client";

import { Folder, Search } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { Project } from "@/lib/api";

type Props = {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onOpenSearch: () => void;
  dueCount: number;
};

export function AppSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenSearch,
  dueCount,
}: Props) {
  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="px-2 py-1.5">
          <h1 className="font-heading text-lg font-bold tracking-tight">
            brainstorm-vault
          </h1>
          <p className="text-xs text-muted-foreground">notes . labs . challenges</p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onOpenSearch}>
              <Search />
              <span>Rechercher</span>
              <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">
                Ctrl K
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>projets</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((p) => (
                <SidebarMenuItem key={p.id}>
                  <SidebarMenuButton
                    isActive={p.id === selectedProjectId}
                    onClick={() => onSelectProject(p.id)}
                  >
                    <Folder />
                    <span className="truncate">{p.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {projects.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  aucun projet
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
          <span>{projects.length} projets</span>
          {dueCount > 0 && (
            <span className="rounded-sm bg-primary px-1.5 py-0.5 font-medium text-primary-foreground">
              {dueCount} a reviser
            </span>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
