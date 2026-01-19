import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { LayoutDashboard, Brain, Calendar, GraduationCap, Bot, Menu, X, Save, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import arcadeBg from "@assets/generated_images/dark_retro_arcade_grid_background_texture.png";
import { cn } from "@/lib/utils";
import { api, type Note } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="w-8 h-8 bg-primary animate-pulse" />
                <span className="font-arcade text-xl text-white group-hover:text-primary transition-colors">PT_STUDY</span>
              </div>
            </Link>

            <nav className="hidden md:flex gap-1">
              {NAV_ITEMS.map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={location === item.path ? "default" : "ghost"}
                    className={cn(
                      "font-arcade rounded-none h-10 px-4 text-xs transition-all hover:bg-primary/20",
                      location === item.path && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="font-arcade rounded-none border-2">
                  NOTES
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-black border-l-4 border-primary w-[300px] sm:w-[500px]">
                <SheetTitle className="font-arcade text-primary mb-4">QUICK_NOTES</SheetTitle>
                <div className="flex flex-col h-full pb-8 gap-4">
                  <NotesEditor />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 container mx-auto p-4 md:p-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>

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

function NotesEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use select to sort or rely on API sort order
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: api.notes.getAll,
  });

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const createMutation = useMutation({
    mutationFn: api.notes.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setNewTitle("");
      setNewContent("");
      toast({ title: "Note Added", description: "New note created." });
    },
  });

  // ... (keep update/delete/reorder mutations) ...
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; content?: string } }) =>
      api.notes.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.notes.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast({ title: "Deleted", description: "Note removed." });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: api.notes.reorder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const handleReorder = (index: number, direction: 'up' | 'down') => {
    // ... (keep logic) ...
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === notes.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentNote = notes[index];
    const targetNote = notes[targetIndex];

    reorderMutation.mutate([
      { id: currentNote.id, position: targetNote.position },
      { id: targetNote.id, position: currentNote.position }
    ]);
  };

  const handleCreate = () => {
    if (!newContent.trim()) {
      toast({ title: "Empty Note", description: "Please enter some content.", variant: "destructive" });
      return;
    }
    createMutation.mutate({ title: newTitle, content: newContent });
  };

  if (isLoading) {
    return <div className="text-center font-terminal text-primary animate-pulse mt-10">LOADING_SYSTEM...</div>;
  }

  return (
    <div className="flex flex-col h-full gap-4">

      {/* Creation Form */}
      <div className="border-2 border-primary p-2 bg-primary/10 relative">
        <div className="text-[10px] font-arcade mb-2 text-primary tracking-widest">:: NEW_NOTE_ENTRY ::</div>
        <div className="space-y-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="TITLE..."
            className="h-8 font-barcode text-xs bg-black/50 border-primary/30 focus-visible:ring-primary"
          />
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="TYPE_NEW_NOTE_HERE..."
            className="min-h-[80px] bg-black/50 border-primary/30 font-terminal text-sm resize-none focus-visible:ring-primary"
          />
          <Button
            size="sm"
            className="w-full font-arcade rounded-none h-8 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "SAVING..." : "ADD_NOTE"} <Plus className="w-3 h-3 ml-2" />
          </Button>
        </div>
      </div>

      <div className="h-[1px] bg-primary/30 w-full" />

      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="space-y-4 pb-4">
          {notes.map((note, index) => (
            <div key={note.id} className="border border-primary/30 p-2 bg-black/40 relative group hover:border-primary/60 transition-colors">
              {/* Controls */}
              <div className="flex items-center justify-between mb-2 gap-2">
                <Input
                  defaultValue={note.title || ""}
                  placeholder="UNTITLED"
                  className="h-6 font-arcade text-xs bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-primary placeholder:text-primary/30 w-full"
                  onBlur={(e) => {
                    if (e.target.value !== note.title) {
                      updateMutation.mutate({ id: note.id, data: { title: e.target.value } });
                    }
                  }}
                />
                <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleReorder(index, 'up')} disabled={index === 0}>
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleReorder(index, 'down')} disabled={index === notes.length - 1}>
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => deleteMutation.mutate(note.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <Textarea
                defaultValue={note.content}
                placeholder="Content..."
                className="min-h-[60px] bg-transparent border-none font-terminal text-sm resize-y focus-visible:ring-0 p-0 shadow-none leading-relaxed text-muted-foreground focus:text-foreground transition-colors"
                onBlur={(e) => {
                  if (e.target.value !== note.content) {
                    updateMutation.mutate({ id: note.id, data: { content: e.target.value } });
                  }
                }}
              />
              <div className="text-[9px] text-muted-foreground/30 mt-1 text-right font-terminal uppercase tracking-tighter">
                #{note.position} • {new Date(note.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}

          {notes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground font-terminal text-[10px] border border-dashed border-secondary/30">
              NO_ARCHIVED_NOTES
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
