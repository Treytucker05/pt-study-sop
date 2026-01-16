
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, Undo, MessageSquare, AlertTriangle, X, Bot } from "lucide-react";
import { apiRequest } from "@/lib/api";

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    isError?: boolean;
}

interface AssistantResponse {
    response: string;
    tool_result?: any;
    can_undo?: boolean;
    error?: string;
    fallback_available?: boolean;
    fallback_models?: string[];
}

interface CalendarAssistantProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CalendarAssistantButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            onClick={onClick}
            variant="outline"
            size="sm"
            className="rounded-none font-arcade text-xs border-primary text-primary hover:bg-primary hover:text-black"
        >
            <Bot className="w-4 h-4 mr-1" /> AI_ASSIST
        </Button>
    );
}

export function CalendarAssistant({ isOpen, onClose }: CalendarAssistantProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const chatMutation = useMutation({
        mutationFn: async (msgs: Message[]) => {
            return apiRequest<AssistantResponse>('/calendar/assistant', {
                method: 'POST',
                body: JSON.stringify({ messages: msgs })
            });
        },
        onSuccess: (data) => {
            if (data.error) {
                // Check fallback
                if (data.fallback_available) {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `**Codex Failed**: ${data.error}\n\n*Fallback is available, but currently manual selection is not implemented in this UI demo. Please try again later.*`,
                        isError: true
                    }]);
                } else {
                    setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}`, isError: true }]);
                }
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
                // Refetch calendar/tasks if tool execution happened
                if (data.tool_result) {
                    queryClient.invalidateQueries({ queryKey: ['events'] });
                    queryClient.invalidateQueries({ queryKey: ['google-tasks'] });
                    queryClient.invalidateQueries({ queryKey: ['google-calendar'] });
                }
            }
        },
        onError: (err) => {
            setMessages(prev => [...prev, { role: 'assistant', content: `Network Error: ${err}`, isError: true }]);
        }
    });

    const undoMutation = useMutation({
        mutationFn: async () => {
            return apiRequest<{ success: boolean; message: string }>('/calendar/assistant/undo', {
                method: 'POST',
                body: JSON.stringify({})
            });
        },
        onSuccess: (data) => {
            setMessages(prev => [...prev, { role: 'assistant', content: `Undo: ${data.message}` }]);
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['google-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['google-calendar'] });
        },
        onError: (err) => {
            setMessages(prev => [...prev, { role: 'assistant', content: `Undo Failed: ${err}`, isError: true }]);
        }
    });

    const handleSend = () => {
        if (!inputValue.trim()) return;
        const newMsg: Message = { role: 'user', content: inputValue };
        const newHistory = [...messages, newMsg];
        setMessages(newHistory);
        setInputValue("");
        chatMutation.mutate(newHistory);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <Card className="absolute top-14 right-4 w-[380px] h-[500px] shadow-2xl z-50 flex flex-col border-2 border-primary bg-black text-white rounded-none animate-in fade-in slide-in-from-top-2 duration-200">
            <CardHeader className="p-3 border-b border-primary/50 flex flex-row items-center justify-between bg-primary/10">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    <div>
                        <CardTitle className="text-sm font-arcade tracking-wider text-primary">AI_ASSISTANT</CardTitle>
                        <CardDescription className="text-[10px] text-muted-foreground font-terminal">Codex Powered</CardDescription>
                    </div>
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => undoMutation.mutate()} title="Undo Last Action" disabled={undoMutation.isPending}>
                        <Undo className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                        <X className="h-4 w-4 text-muted-foreground hover:text-white" />
                    </Button>
                </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                <div className="space-y-3">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground text-xs mt-8 space-y-2">
                            <p className="font-terminal">Ask me to create events or tasks.</p>
                            <p className="text-[10px] opacity-50 font-terminal">"Add a workout tomorrow at 3pm"</p>
                            <p className="text-[10px] opacity-50 font-terminal">"Schedule PT study session Friday 2pm"</p>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[85%] px-3 py-2 text-xs font-terminal whitespace-pre-wrap ${m.role === 'user'
                                    ? 'bg-primary text-black'
                                    : m.isError
                                        ? 'bg-red-500/10 border border-red-500/50 text-red-300'
                                        : 'bg-white/10 text-white border border-white/10'
                                    }`}
                            >
                                {m.content}
                            </div>
                        </div>
                    ))}

                    {chatMutation.isPending && (
                        <div className="flex justify-start">
                            <div className="bg-white/5 border border-white/10 px-3 py-2 text-[10px] flex items-center gap-2 text-muted-foreground font-terminal">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-3 border-t border-primary/50">
                <div className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command..."
                        className="bg-black border-secondary font-terminal text-sm rounded-none focus-visible:ring-primary"
                        disabled={chatMutation.isPending}
                    />
                    <Button onClick={handleSend} disabled={chatMutation.isPending || !inputValue.trim()} className="rounded-none bg-primary text-black hover:bg-primary/90">
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <div className="text-[9px] text-center mt-1 text-muted-foreground/50 font-terminal">
                    Codex CLI (60s Timeout)
                </div>
            </div>
        </Card>
    );
}
