import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Sparkles, BookOpen, Clock, Zap, BrainCircuit, FileText, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function Tutor() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("core");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}`);
  const [timer, setTimer] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], refetch } = useQuery({
    queryKey: ["chat", sessionId],
    queryFn: () => api.chat.getMessages(sessionId),
    enabled: isSessionActive,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => 
      api.chat.sendMessage(sessionId, { sender: "user", content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", sessionId] });
      setTimeout(() => {
        api.chat.sendMessage(sessionId, { 
          sender: "tutor", 
          content: generateTutorResponse(),
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["chat", sessionId] });
        });
      }, 1000);
    },
  });

  const generateTutorResponse = () => {
    const responses = [
      `Great question about ${topic || "this topic"}! Let me break this down for you with the PEIRRO method.`,
      `Let's apply the Seed-Lock principle here. What's your initial hook or mental model for understanding this concept?`,
      `According to the Function Before Structure approach, let's first understand what this DOES before where it IS.`,
      `Excellent progress! Remember: prove understanding at L2 (teach-back) before advancing to the next level.`,
      `Let me check the source materials... Based on your active sources, here's what we know:`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = () => {
    const newSessionId = `session-${Date.now()}`;
    setSessionId(newSessionId);
    setIsSessionActive(true);
    setTimer(0);
    api.chat.sendMessage(newSessionId, {
      sender: "tutor",
      content: `Ready to study ${topic || "your chosen topic"} in ${mode.toUpperCase()} mode. What would you like to focus on first?`,
    }).then(() => {
      refetch();
    });
  };

  const handleSend = () => {
    if (message.trim() && isSessionActive) {
      sendMessageMutation.mutate(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
        
        {/* Left Sidebar: Context & Setup */}
        <aside className="w-full md:w-80 flex flex-col gap-6 shrink-0">
          
          {/* Mode Selector */}
          <Card className="bg-black/40 border-2 border-primary rounded-none">
             <div className="grid grid-cols-3">
               {['core', 'sprint', 'drill'].map((m) => (
                 <button
                   key={m}
                   onClick={() => setMode(m)}
                   className={cn(
                     "p-3 font-arcade text-[10px] uppercase border-b-2 transition-all hover:bg-primary/20",
                     mode === m 
                       ? "bg-primary text-black border-primary font-bold" 
                       : "text-muted-foreground border-secondary bg-black"
                   )}
                   data-testid={`button-mode-${m}`}
                 >
                   {m}
                 </button>
               ))}
             </div>
             <CardContent className="p-4">
                <div className="font-terminal text-sm text-center text-primary mb-4 animate-pulse uppercase">
                  &lt;&lt; {mode.toUpperCase()}_MODE {isSessionActive ? "ACTIVE" : "STANDBY"} &gt;&gt;
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-arcade text-muted-foreground">COURSE</label>
                    <Select defaultValue="anat">
                      <SelectTrigger className="rounded-none bg-black border-secondary" data-testid="select-course"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-black border-primary rounded-none">
                         <SelectItem value="anat">ANATOMY</SelectItem>
                         <SelectItem value="phys">PHYSIOLOGY</SelectItem>
                         <SelectItem value="neuro">NEUROSCIENCE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-arcade text-muted-foreground">TOPIC</label>
                    <Input 
                      className="rounded-none bg-black border-secondary" 
                      placeholder="Ex: Cranial Nerves" 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      data-testid="input-topic"
                    />
                  </div>
                  <Button 
                    className="w-full rounded-none font-arcade bg-secondary hover:bg-white hover:text-black"
                    onClick={startSession}
                    data-testid="button-start-session"
                  >
                    {isSessionActive ? <><RefreshCw className="w-4 h-4 mr-2" /> NEW_SESSION</> : "START_SESSION"}
                  </Button>
                </div>
             </CardContent>
          </Card>

          {/* Context Panel */}
          <Card className="bg-black/40 border-2 border-secondary rounded-none flex-1 flex flex-col">
             <CardHeader className="border-b border-secondary p-4">
               <CardTitle className="font-arcade text-sm flex items-center gap-2">
                 <BrainCircuit className="w-4 h-4" /> CONTEXT
               </CardTitle>
             </CardHeader>
             <CardContent className="p-4 flex-1 space-y-4 font-terminal text-sm">
                <div className="flex justify-between items-center">
                   <span className="text-muted-foreground">TIMER</span>
                   <span className="text-xl text-primary font-arcade" data-testid="text-timer">{formatTime(timer)}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-muted-foreground">MESSAGES</span>
                   <span className="text-white" data-testid="text-message-count">{messages.length}</span>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-secondary/50">
                   <p className="text-xs text-muted-foreground uppercase mb-2">ACTIVE SOURCES</p>
                   <div className="flex items-center gap-2 text-xs border border-secondary p-2 bg-black/50">
                      <BookOpen className="w-3 h-3 text-white" /> 
                      <span className="truncate">Gray's Anatomy Ch.4</span>
                   </div>
                   <div className="flex items-center gap-2 text-xs border border-secondary p-2 bg-black/50">
                      <FileText className="w-3 h-3 text-white" /> 
                      <span className="truncate">Lecture_Notes_W4.pdf</span>
                   </div>
                </div>
             </CardContent>
             
             {/* Quick Actions */}
             <div className="p-2 grid grid-cols-2 gap-2 border-t border-secondary bg-black/20">
                <Button size="sm" variant="ghost" className="rounded-none border border-secondary hover:bg-primary hover:text-black text-[10px] font-arcade h-auto py-2" data-testid="button-explain">
                   <Sparkles className="w-3 h-3 mr-1" /> EXPLAIN
                </Button>
                <Button size="sm" variant="ghost" className="rounded-none border border-secondary hover:bg-primary hover:text-black text-[10px] font-arcade h-auto py-2" data-testid="button-quiz">
                   <Zap className="w-3 h-3 mr-1" /> QUIZ_ME
                </Button>
             </div>
          </Card>

        </aside>

        {/* Chat Interface */}
        <Card className="flex-1 bg-black/60 border-2 border-primary rounded-none flex flex-col overflow-hidden relative">
           <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(255,0,0,0.03)_1px,transparent_1px),linear-gradient(rgba(255,0,0,0.03),rgba(255,0,0,0.03)_1px,transparent_1px)] bg-[length:100%_4px,20px_20px,20px_20px] pointer-events-none"></div>
           
           {/* Messages */}
           <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              <div className="space-y-6">
                 {!isSessionActive && messages.length === 0 ? (
                   <div className="text-center py-12 font-terminal text-muted-foreground">
                     <Bot className="w-12 h-12 mx-auto mb-4 text-primary/50" />
                     <p>SELECT A TOPIC AND START A SESSION</p>
                     <p className="text-xs mt-2">Your AI tutor is standing by...</p>
                   </div>
                 ) : (
                   messages.map((msg) => (
                     msg.sender === "tutor" ? (
                       <div key={msg.id} className="flex gap-4 max-w-[80%]" data-testid={`message-tutor-${msg.id}`}>
                          <div className="w-8 h-8 shrink-0 bg-primary/20 border border-primary flex items-center justify-center rounded-none">
                             <Bot className="w-5 h-5 text-primary" />
                          </div>
                          <div className="space-y-1">
                             <div className="text-xs font-arcade text-primary">AI_TUTOR</div>
                             <div className="bg-primary/10 border border-primary/30 p-3 font-terminal text-sm md:text-base leading-relaxed">
                                <p>{msg.content}</p>
                             </div>
                          </div>
                       </div>
                     ) : (
                       <div key={msg.id} className="flex flex-row-reverse gap-4 max-w-[80%] ml-auto" data-testid={`message-user-${msg.id}`}>
                          <div className="w-8 h-8 shrink-0 bg-secondary/20 border border-secondary flex items-center justify-center rounded-none">
                             <User className="w-5 h-5 text-secondary-foreground" />
                          </div>
                          <div className="space-y-1 text-right">
                             <div className="text-xs font-arcade text-muted-foreground">USER</div>
                             <div className="bg-secondary/20 border border-secondary p-3 font-terminal text-sm md:text-base leading-relaxed text-left">
                                <p>{msg.content}</p>
                             </div>
                          </div>
                       </div>
                     )
                   ))
                 )}
              </div>
           </ScrollArea>

           {/* Input Area */}
           <div className="p-4 border-t-2 border-primary bg-black">
              <div className="flex gap-2">
                 <Input 
                   className="flex-1 rounded-none bg-secondary/20 border-secondary focus-visible:ring-primary font-terminal text-lg h-12" 
                   placeholder={isSessionActive ? "TYPE_MESSAGE..." : "START A SESSION FIRST..."}
                   value={message}
                   onChange={(e) => setMessage(e.target.value)}
                   onKeyPress={handleKeyPress}
                   disabled={!isSessionActive}
                   data-testid="input-message"
                 />
                 <Button 
                   className="h-12 w-12 rounded-none bg-primary text-black hover:bg-primary/90"
                   onClick={handleSend}
                   disabled={!isSessionActive || !message.trim()}
                   data-testid="button-send"
                 >
                    <Send className="w-5 h-5" />
                 </Button>
              </div>
              <div className="text-[10px] font-arcade text-muted-foreground mt-2 text-right" data-testid="text-session-id">
                 SESSION_ID: #{sessionId.slice(-8).toUpperCase()}{isSessionActive ? "-ACTIVE" : "-IDLE"}
              </div>
           </div>
        </Card>

      </div>
    </Layout>
  );
}
