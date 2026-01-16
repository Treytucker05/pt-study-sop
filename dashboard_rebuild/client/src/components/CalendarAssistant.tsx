
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, Undo, MessageSquare, AlertTriangle } from "lucide-react";
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

export function CalendarAssistant() {
    const [isOpen, setIsOpen] = useState(false);
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
            setMessages(prev => [...prev, { role: 'assistant', content: `↩️ Undo: ${data.message}` }]);
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['google-tasks'] });
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

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="absolute top-4 right-4 h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-20 border border-black/20"
                title="AI Assistant"
            >
                <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </Button>
        );
    }

    return (
        <Card className="absolute top-16 right-4 w-[400px] h-[600px] shadow-2xl z-50 flex flex-col border-primary/20 bg-[#0a0a0a] text-white animate-in fade-in slide-in-from-top-5 duration-200">
            <CardHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-primary/10 to-transparent">
                <div>
                    <CardTitle className="text-lg font-arcade tracking-wider text-primary">Assistant</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Codex Powered</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => undoMutation.mutate()} title="Undo Last Action" disabled={undoMutation.isPending}>
                        <Undo className="h-4 w-4 text-muted-foreground hover:text-white" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                        <div className="w-1 h-1 bg-current rounded-full mb-0.5" />
                    </Button>
                </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm mt-10">
                            <p>Ask me to create events or tasks.</p>
                            <p className="text-xs mt-2 opacity-50">"Schedule a workout tomorrow at 5pm"</p>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : m.isError
                                        ? 'bg-red-500/10 border border-red-500/50 text-red-200'
                                        : 'bg-white/10 text-white'
                                    }`}
                            >
                                {m.content}
                            </div>
                        </div>
                    ))}

                    {chatMutation.isPending && (
                        <div className="flex justify-start">
                            <div className="bg-white/5 rounded-lg px-3 py-2 text-xs flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-3 border-t border-white/10">
                <div className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="bg-white/5 border-white/10 focus-visible:ring-primary/50"
                        disabled={chatMutation.isPending}
                    />
                    <Button onClick={handleSend} disabled={chatMutation.isPending || !inputValue.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <div className="text-[10px] text-center mt-1 text-muted-foreground/50">
                    Codex CLI Mode (60s Timeout)
                </div>
            </div>
        </Card>
    );
}
