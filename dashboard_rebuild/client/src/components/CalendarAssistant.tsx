
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, X, Bot, Link } from "lucide-react";
import { api } from "@/lib/api";

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    isError?: boolean;
}

interface CalendarAssistantResponse {
    response: string;
    success: boolean;
    error?: string;
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

    const {
        data: googleStatus,
        isLoading: isGoogleStatusLoading,
        refetch: refetchGoogleStatus,
    } = useQuery({
        queryKey: ["google-status"],
        queryFn: api.google.getStatus,
        retry: 1,
        enabled: isOpen,
    });

    const connectGoogleMutation = useMutation({
        mutationFn: async () => {
            const { authUrl } = await api.google.getAuthUrl();
            window.location.href = authUrl;
        },
    });


    // Refresh Google status when assistant opens
    useEffect(() => {
        if (isOpen) {
            refetchGoogleStatus();
        }
    }, [isOpen, refetchGoogleStatus]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);


    const chatMutation = useMutation({
        mutationFn: async (message: string) => {
            return api.calendar.assistant(message);
        },
        onSuccess: (data: CalendarAssistantResponse) => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response,
                isError: !data.success
            }]);
            // Refresh calendar data after assistant actions
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['google-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['google-calendar'] });
            queryClient.refetchQueries({ queryKey: ['google-calendar'] });
        },
        onError: (err) => {
            setMessages(prev => [...prev, { role: 'assistant', content: `Network Error: ${err}`, isError: true }]);
        }
    });

    const handleSend = () => {
        if (!inputValue.trim()) return;
        const newMsg: Message = { role: 'user', content: inputValue };
        setMessages(prev => [...prev, newMsg]);
        setInputValue("");
        chatMutation.mutate(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <Card className="fixed left-0 top-[68px] bottom-[40px] w-[380px] shadow-2xl z-50 flex flex-col border-r-2 border-primary bg-black text-white rounded-none animate-in fade-in slide-in-from-left-4 duration-300">
            <CardHeader className="p-3 border-b border-primary/50 flex flex-row items-center justify-between bg-primary/10">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    <div>
                        <CardTitle className="text-sm font-arcade tracking-wider text-primary">AI_ASSISTANT</CardTitle>
                        <div className="flex items-center gap-2">
                            <CardDescription className="text-[10px] text-muted-foreground font-terminal">Calendar + Tasks Assistant</CardDescription>
                            {!isGoogleStatusLoading && googleStatus?.connected && (
                                <span className="text-[9px] font-arcade text-green-400">CONNECTED</span>
                            )}
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                    <X className="h-4 w-4 text-muted-foreground hover:text-white" />
                </Button>
            </CardHeader>


            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                <div className="space-y-3">
                    {!isGoogleStatusLoading && !googleStatus?.connected && (
                        <div className="border border-yellow-500/50 bg-yellow-500/10 text-yellow-200 text-[10px] font-terminal px-3 py-2 flex items-center justify-between gap-3">
                            <span>Calendar not connected.</span>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 rounded-none border-yellow-500 text-yellow-200 hover:bg-yellow-500/20 font-arcade text-[9px]"
                                onClick={() => connectGoogleMutation.mutate()}
                                disabled={connectGoogleMutation.isPending}
                            >
                                <Link className="w-3 h-3 mr-1" />
                                {connectGoogleMutation.isPending ? "CONNECTING..." : "CONNECT GOOGLE CALENDAR"}
                            </Button>
                        </div>
                    )}
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
                    OpenRouter • GPT-4o-mini
                </div>
            </div>
        </Card>
    );
}
