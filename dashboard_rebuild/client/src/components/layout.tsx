import { Link, useLocation } from "wouter";
import { useState } from "react";
import { LayoutDashboard, Brain, Calendar, GraduationCap, Bot, Save, Trash2, GripVertical, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import arcadeBg from "@assets/generated_images/dark_retro_arcade_grid_background_texture.png";
import logoImg from "@assets/StudyBrainIMAGE_1768640444498.jpg";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Note } from "@shared/schema";

const NAV_ITEMS = [
  { path: "/", label: "DASHBOARD", icon: LayoutDashboard },
  { path: "/brain", label: "BRAIN", icon: Brain },
  { path: "/calendar", label: "CALENDAR", icon: Calendar },
  { path: "/scholar", label: "SCHOLAR", icon: GraduationCap },
  { path: "/tutor", label: "TUTOR", icon: Bot },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const currentPath = location === "/" ? "/" : "/" + location.split("/")[1];
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [showTutor, setShowTutor] = useState(false);
  const queryClient = useQueryClient();

  // Expose tutor toggle to window for integration
  (window as any).openTutor = () => setShowTutor(true);

  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: api.notes.getAll,
  });

  const createNoteMutation = useMutation({
    mutationFn: api.notes.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setNewNote("");
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => 
      api.notes.update(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setEditingId(null);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: api.notes.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: api.notes.reorder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const handleSaveNote = () => {
    if (newNote.trim()) {
      createNoteMutation.mutate({ content: newNote.trim(), position: notes.length });
    }
  };

  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId !== null && draggedId !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    
    const newOrder = [...notes];
    const draggedIndex = newOrder.findIndex(n => n.id === draggedId);
    const targetIndex = newOrder.findIndex(n => n.id === targetId);
    
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    
    reorderMutation.mutate(newOrder.map(n => n.id));
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col font-terminal">
      {/* Background with overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-15 pointer-events-none" 
        style={{ 
          backgroundImage: `url(${arcadeBg})`, 
          backgroundSize: '300px' 
        }}
      />
      <div className="fixed inset-0 z-10 crt-overlay pointer-events-none" />

      {/* Top Nav */}
      <header className="relative z-20 border-b-4 border-primary bg-black/80 backdrop-blur-sm sticky top-0">
        <div className="w-full px-2 md:px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer group">
                <img src={logoImg} alt="Logo" className="w-10 h-10 object-cover rounded" />
                <span className="hidden lg:block font-arcade text-xs text-white group-hover:text-primary transition-colors whitespace-nowrap">TREY'S STUDY SYSTEM</span>
              </div>
            </Link>

            <nav className="hidden md:flex gap-0.5">
              {NAV_ITEMS.map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button 
                    variant={location === item.path ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "font-arcade rounded-none h-8 px-2 lg:px-3 text-[10px] transition-all hover:bg-primary/20",
                      location === item.path && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    <item.icon className="w-3 h-3 lg:mr-1" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Button>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="font-arcade rounded-none border-2 text-xs h-8 px-2">
                  NOTES
                </Button>
              </SheetTrigger>
                <SheetContent
                  className="bg-black border-l-4 border-t-2 border-b-2 border-primary w-[300px] sm:w-[400px] shadow-2xl overflow-y-auto z-[100001] inset-y-3 h-auto"
                  style={{ zIndex: 100001 }}
                >
                <SheetTitle className="font-arcade text-primary mb-4">QUICK_NOTES</SheetTitle>
                <SheetDescription className="sr-only">Quick notes panel</SheetDescription>
                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <Textarea 
                      placeholder="TYPE_NOTE_HERE..." 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="h-20 bg-secondary/20 border-2 border-secondary font-terminal text-sm rounded-none resize-none focus-visible:ring-primary" 
                      data-testid="input-note-content"
                    />
                    <Button 
                      className="w-full font-arcade rounded-none text-xs" 
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={!newNote.trim() || createNoteMutation.isPending}
                      data-testid="button-add-note"
                    >
                      <Save className="w-3 h-3 mr-2" /> ADD NOTE
                    </Button>
                  </div>
                  
                  <div className="border-t border-secondary pt-2">
                    <div className="font-arcade text-xs text-muted-foreground mb-2">SAVED NOTES ({notes.length})</div>
                    <ScrollArea className="h-[calc(100vh-280px)]">
                      <div className="space-y-2 pr-2">
                        {notes.map((note) => (
                          <div 
                            key={note.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, note.id)}
                            onDragOver={(e) => handleDragOver(e, note.id)}
                            onDrop={(e) => handleDrop(e, note.id)}
                            onDragEnd={handleDragEnd}
                            data-testid={`card-note-${note.id}`}
                            className={cn(
                              "bg-secondary/20 border border-secondary p-2 rounded-none cursor-move transition-all",
                              draggedId === note.id && "opacity-50",
                              dragOverId === note.id && "border-primary border-2"
                            )}
                          >
                            {editingId === note.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="bg-black border-primary rounded-none text-sm font-terminal"
                                  autoFocus
                                />
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    className="flex-1 rounded-none text-xs h-6"
                                    onClick={() => updateNoteMutation.mutate({ id: note.id, content: editingContent })}
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    className="rounded-none text-xs h-6"
                                    onClick={() => setEditingId(null)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="flex-1 font-terminal text-sm whitespace-pre-wrap break-words">{note.content}</div>
                                <div className="flex gap-1 shrink-0">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0 rounded-none hover:bg-primary/20"
                                    onClick={() => { setEditingId(note.id); setEditingContent(note.content); }}
                                    data-testid={`button-edit-note-${note.id}`}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0 rounded-none hover:bg-red-500/20 text-red-400"
                                    onClick={() => deleteNoteMutation.mutate(note.id)}
                                    data-testid={`button-delete-note-${note.id}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {notes.length === 0 && (
                          <div className="text-center text-muted-foreground font-terminal text-sm py-8">
                            No notes yet
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 container mx-auto p-4 md:p-8 pb-24">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>

      {/* Tutor Modal Integration */}
      <Dialog open={showTutor} onOpenChange={setShowTutor}>
        <DialogContent className="bg-black border-2 border-primary rounded-none max-w-2xl h-[80vh] flex flex-col p-0">
          <div className="flex justify-between items-center p-4 border-b border-primary">
            <DialogTitle className="font-arcade text-primary flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI_STUDY_ASSISTANT
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowTutor(false)} className="rounded-none">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <iframe src="/tutor" className="flex-1 w-full border-0" />
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-secondary bg-black/95 py-2">
        <div className="container mx-auto px-4 flex justify-between items-center text-xs text-muted-foreground font-terminal">
          <div className="flex gap-4">
            <span>STATUS: <span className="text-primary">ONLINE</span></span>
            <span>SYNC: <span className="text-white">09:41 AM</span></span>
          </div>
          <div>v2.0.25 [BETA]</div>
        </div>
      </footer>
      {/* Footer spacer */}
      <div className="h-10" />
    </div>
  );
}
