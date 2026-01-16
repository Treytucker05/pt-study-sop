import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { LayoutDashboard, Brain, Calendar, GraduationCap, Bot, Menu, X, Save, Trash2, Edit3, Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import arcadeBg from "@assets/generated_images/dark_retro_arcade_grid_background_texture.png";
import { cn } from "@/lib/utils";
import { api, type Note } from "@/lib/api";

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
  
  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await api.notes.getAll();
      setNotes(data.sort((a, b) => a.position - b.position));
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;
    setIsLoading(true);
    try {
      await api.notes.create({ content: newNoteContent.trim() });
      setNewNoteContent("");
      await loadNotes();
    } catch (err) {
      console.error("Failed to create note:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (id: number) => {
    try {
      await api.notes.delete(id);
      await loadNotes();
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    try {
      await api.notes.update(editingId, { content: editContent.trim() });
      setEditingId(null);
      setEditContent("");
      await loadNotes();
    } catch (err) {
      console.error("Failed to update note:", err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
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
                  NOTES {notes.length > 0 && <span className="ml-1 text-primary">({notes.length})</span>}
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-black border-l-4 border-primary w-[300px] sm:w-[400px] flex flex-col">
                <SheetTitle className="font-arcade text-primary mb-4">QUICK_NOTES</SheetTitle>
                
                {/* New note input - smaller */}
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Add a quick note..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleCreateNote()}
                    className="flex-1 bg-secondary/20 border-2 border-secondary font-terminal rounded-none h-10"
                  />
                  <Button 
                    onClick={handleCreateNote} 
                    disabled={isLoading || !newNoteContent.trim()}
                    className="font-arcade rounded-none h-10 px-4"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>

                {/* Saved notes list */}
                <ScrollArea className="flex-1 -mx-2 px-2">
                  <div className="space-y-2 pb-8">
                    {notes.length === 0 ? (
                      <div className="text-center text-muted-foreground font-terminal text-sm py-8">
                        No notes yet. Add one above!
                      </div>
                    ) : (
                      notes.map((note) => (
                        <div 
                          key={note.id} 
                          className="p-3 bg-secondary/10 border border-secondary/30 hover:border-primary/50 transition-colors group"
                        >
                          {editingId === note.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="bg-black border-primary font-terminal text-sm rounded-none resize-none min-h-[60px]"
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={handleCancelEdit}
                                  className="h-7 px-2 text-muted-foreground hover:text-white"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={handleSaveEdit}
                                  className="h-7 px-2 bg-primary text-black hover:bg-primary/90"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="font-terminal text-sm whitespace-pre-wrap break-words">
                                {note.content}
                              </p>
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-secondary/20">
                                <span className="text-[10px] text-muted-foreground font-terminal">
                                  {new Date(note.createdAt).toLocaleDateString()}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleStartEdit(note)}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
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
