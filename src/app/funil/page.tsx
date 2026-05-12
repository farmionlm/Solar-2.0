"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, LayoutDashboard, Sun, Clock, CheckCircle, Briefcase, FileText, ExternalLink, Trash2 } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const COLUMNS = [
  { id: "SIMULATION", title: "Simulação", icon: <FileText className="w-4 h-4 text-blue-400" />, color: "border-blue-500/50 bg-blue-500/5" },
  { id: "NEGOTIATION", title: "Em Negociação", icon: <Briefcase className="w-4 h-4 text-amber-400" />, color: "border-amber-500/50 bg-amber-500/5" },
  { id: "CLOSED", title: "Fechado", icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, color: "border-emerald-500/50 bg-emerald-500/5" },
  { id: "INSTALLATION", title: "Instalação", icon: <Clock className="w-4 h-4 text-purple-400" />, color: "border-purple-500/50 bg-purple-500/5" },
  { id: "COMPLETED", title: "Concluído", icon: <Sun className="w-4 h-4 text-yellow-500" />, color: "border-yellow-500/50 bg-yellow-500/5" }
];

function SortableItem({ id, project, onDelete }: { id: string, project: any, onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border ${isDragging ? 'border-primary ring-1 ring-primary/50 shadow-xl' : 'border-border shadow-sm'} p-4 rounded-xl mb-3 hover:border-primary/50 transition-colors group`}
    >
      {/* Header — drag handle only on this area */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors pr-2">
            {project.clientId ? (
              <Link href={`/clientes/${project.clientId}`} className="hover:underline">
                {project.name || "Sem nome"}
              </Link>
            ) : (
              project.name || "Sem nome"
            )}
          </h4>
          <span className="text-xs font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
            {Number(project.totalKwp).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kWp
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-3">
          {project.clientId ? (
            <Link href={`/clientes/${project.clientId}`} className="hover:text-primary transition-colors">
              Cliente: {project.client?.name || "Sem nome"}
            </Link>
          ) : (
            "Sem cliente vinculado"
          )}
        </p>
        <div className="flex justify-between items-center text-[10px] text-muted-foreground/80 font-medium">
          <span>{format(new Date(project.createdAt), "dd MMM, yyyy", { locale: ptBR })}</span>
          <span>{project.totalModules} módulos</span>
        </div>
      </div>

      {/* Actions — NOT part of drag handle */}
      <div className="mt-3 pt-3 border-t border-border/50 flex gap-2">
        <Link
          href={`/proposta?projectId=${project.id}${project.client?.name ? `&clientName=${encodeURIComponent(project.client.name)}` : ''}`}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:bg-primary/10 py-1.5 px-3 rounded-lg transition-colors border border-primary/20 hover:border-primary/40"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Proposta PDF
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Excluir a simulação "${project.name || 'Sem nome'}"? Esta ação não pode ser desfeita.`)) {
              onDelete(project.id);
            }
          }}
          className="flex items-center justify-center gap-1 text-xs font-bold text-red-400 hover:bg-red-950/40 py-1.5 px-3 rounded-lg transition-colors border border-red-900/30 hover:border-red-700/50"
          title="Excluir simulação"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { data: projectsData, error, mutate } = useSWR("/api/calculations", fetcher);
  
  const [items, setItems] = useState<Record<string, any[]>>({
    SIMULATION: [],
    NEGOTIATION: [],
    CLOSED: [],
    INSTALLATION: [],
    COMPLETED: []
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  // Initialize board state when data loads
  useEffect(() => {
    if (projectsData && Array.isArray(projectsData)) {
      const newItems: Record<string, any[]> = { SIMULATION: [], NEGOTIATION: [], CLOSED: [], INSTALLATION: [], COMPLETED: [] };
      projectsData.forEach(p => {
        if (newItems[p.status]) {
          newItems[p.status].push(p);
        } else {
          newItems.SIMULATION.push(p); // Fallback
        }
      });
      setItems(newItems);
    }
  }, [projectsData]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = (id: string) => {
    if (id in items) return id;
    return Object.keys(items).find((key) => items[key].some((item) => item.id === id));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setItems((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((item) => item.id === activeId);
      const overIndex = overId in prev ? overItems.length + 1 : overItems.findIndex((item) => item.id === overId);

      return {
        ...prev,
        [activeContainer]: [...prev[activeContainer].filter((item) => item.id !== activeId)],
        [overContainer]: [
          ...prev[overContainer].slice(0, overIndex),
          activeItems[activeIndex],
          ...prev[overContainer].slice(overIndex, prev[overContainer].length),
        ],
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      // Reordering within the same column
      const activeIndex = items[activeContainer].findIndex((item) => item.id === activeId);
      const overIndex = items[overContainer].findIndex((item) => item.id === overId);

      if (activeIndex !== overIndex) {
        setItems((items) => ({
          ...items,
          [activeContainer]: arrayMove(items[activeContainer], activeIndex, overIndex),
        }));
      }
    } else {
      // Moved to a different column, update DB
      try {
        await fetch(`/api/projects/${activeId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: overContainer })
        });
        mutate(); // Revalidate
      } catch (err) {
        console.error("Failed to update status", err);
        mutate(); // Revert on failure
      }
    }
  };

  const handleDelete = async (projectId: string) => {
    // Optimistically remove from local state immediately
    setItems(prev => {
      const next: Record<string, any[]> = {};
      for (const col of Object.keys(prev)) {
        next[col] = prev[col].filter((p) => p.id !== projectId);
      }
      return next;
    });
    try {
      await fetch(`/api/calculations?id=${projectId}`, { method: 'DELETE' });
      mutate();
    } catch (err) {
      console.error('Erro ao excluir projeto:', err);
      mutate(); // revert on failure
    }
  };

  const activeProject = activeId ? Object.values(items).flat().find(p => p.id === activeId) : null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-8 flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div className="flex items-center gap-3 group">
          <Link href="/" title="Voltar ao Início" className="bg-primary p-3 rounded-xl text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
            <LayoutDashboard className="w-8 h-8" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Funil de Vendas</h1>
            <p className="text-muted-foreground font-medium">Acompanhe e organize seus negócios (CRM)</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="flex items-center gap-2 bg-card border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max h-full">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {COLUMNS.map((col) => (
              <div key={col.id} className={`w-80 flex flex-col bg-secondary/20 rounded-2xl border ${col.color} overflow-hidden`}>
                <div className="p-4 border-b border-border/50 bg-background/50 flex justify-between items-center backdrop-blur-sm">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {col.icon} {col.title}
                  </div>
                  <span className="bg-background text-xs font-black px-2 py-1 rounded-md border border-border shadow-sm">
                    {items[col.id]?.length || 0}
                  </span>
                </div>
                
                <SortableContext
                  id={col.id}
                  items={items[col.id]?.map(i => i.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 p-3 overflow-y-auto min-h-[150px]">
                    {items[col.id]?.map((project) => (
                      <SortableItem key={project.id} id={project.id} project={project} onDelete={handleDelete} />
                    ))}
                    {(!items[col.id] || items[col.id].length === 0) && (
                      <div className="h-full flex items-center justify-center text-muted-foreground/40 text-sm font-medium border-2 border-dashed border-border/50 rounded-xl p-8 text-center">
                        Arraste projetos para cá
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            ))}

            <DragOverlay>
              {activeId && activeProject ? (
                <div className="bg-card border border-primary ring-2 ring-primary/50 shadow-2xl p-4 rounded-xl cursor-grabbing opacity-90 scale-105 rotate-2">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-foreground text-sm">{activeProject.name || "Sem nome"}</h4>
                    <span className="text-xs font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {Number(activeProject.totalKwp).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kWp
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-3">
                    {activeProject.client?.name ? `Cliente: ${activeProject.client.name}` : "Sem cliente vinculado"}
                  </p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
