import React, { useState, useEffect } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Trash2, Plus, Calendar as CalendarIcon, AlignLeft, ChevronRight, ChevronDown, Clock } from "lucide-react";
import type { GoogleTask } from "@/lib/api";
import { format, parseISO, isPast, isToday, isTomorrow, isValid } from "date-fns";

// -----------------------------------------------------------------------------
// Helper: Format Due Date
// -----------------------------------------------------------------------------
function FormatDueDate({ dateStr }: { dateStr?: string }) {
    if (!dateStr) return null;
    try {
        const date = parseISO(dateStr);
        if (!isValid(date)) return null;

        let label = format(date, "MMM d");
        if (isToday(date)) label = "Today";
        if (isTomorrow(date)) label = "Tomorrow";

        const isOverdue = isPast(date) && !isToday(date);

        return (
            <div className={`flex items-center gap-1 text-xs border px-1.5 py-0.5 rounded-none ${isOverdue ? 'text-red-400 border-red-400/50' : 'text-muted-foreground border-border'}`}>
                <CalendarIcon className="w-3 h-3" />
                {label}
            </div>
        );
    } catch (e) { return null; }
}

// -----------------------------------------------------------------------------
// Sortable Task Item
// -----------------------------------------------------------------------------
export function SortableTaskItem({ task, onToggle, onDelete, onEdit }: {
    task: GoogleTask;
    onToggle: (t: GoogleTask) => void;
    onDelete: (id: string, listId: string) => void;
    onEdit: (t: GoogleTask) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id, data: { type: 'Task', ...task } });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-2 touch-none select-none relative group">
            <div
                className={`
            p-3 rounded-none border border-transparent hover:border-primary/30 transition-all
            flex gap-3 items-start bg-transparent hover:bg-primary/5
            ${isDragging ? 'ring-2 ring-primary/50 bg-primary/10 z-50' : ''}
        `}
                onClick={() => onEdit(task)}
            >
                <div
                    onClick={(e) => { e.stopPropagation(); onToggle(task); }}
                    className={`
                mt-0.5 w-5 h-5 rounded-none border-2 flex items-center justify-center cursor-pointer transition-colors
                ${task.status === 'completed' ? 'bg-primary border-primary' : 'border-muted-foreground/60 hover:border-primary'}
            `}
                >
                    {task.status === 'completed' && <div className="w-2.5 h-1.5 border-b-2 border-l-2 border-black rotate-[-45deg] mb-0.5" />}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                    <div className={`text-sm font-terminal leading-tight truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {task.title}
                    </div>

                    {(task.notes || task.due) && (
                        <div className="flex flex-wrap gap-2 items-center mt-1">
                            {task.due && <FormatDueDate dateStr={task.due} />}
                            {task.notes && (
                                <div className="flex items-center text-xs text-muted-foreground gap-1">
                                    <AlignLeft className="w-3 h-3" />
                                    <span className="truncate max-w-[150px] opacity-70 font-terminal">{task.notes.split('\n')[0]}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------------------
// Task Dialog
// -----------------------------------------------------------------------------
export function TaskDialog({ task, isOpen, onClose, onSave, onDelete, isCreating, activeListId, availableLists = [] }: {
    task: GoogleTask | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<GoogleTask>) => void;
    onDelete: (id: string, listId: string) => void;
    isCreating?: boolean;
    activeListId?: string;
    availableLists?: { id: string, title: string }[];
}) {
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [listId, setListId] = useState("");

    useEffect(() => {
        if (isOpen) {
            if (isCreating) {
                setTitle("");
                setNotes("");
                setDate("");
                setTime("");
                setListId(activeListId || (availableLists[0]?.id) || "");
            } else if (task) {
                setTitle(task.title);
                setNotes(task.notes || "");
                setListId(task.listId);
                if (task.due) {
                    try {
                        const iso = parseISO(task.due);
                        if (isValid(iso)) {
                            setDate(format(iso, "yyyy-MM-dd"));
                        }
                    } catch (e) { }
                } else {
                    setDate("");
                }
            }
        }
    }, [isOpen, task, isCreating, activeListId]);

    const handleSave = () => {
        if (!title) return;

        let due = undefined;
        if (date) {
            due = time ? `${date}T${time}:00Z` : `${date}T00:00:00Z`;
        }

        onSave({
            title,
            notes,
            due,
            listId
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[500px] border-2 border-primary bg-black text-foreground p-0 gap-0 overflow-hidden shadow-2xl rounded-none">
                <DialogTitle className="sr-only">
                    {isCreating ? "Create New Task" : "Edit Task"}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    {isCreating ? "Enter task details to create a new task." : "Modify task details."}
                </DialogDescription>
                {/* Header / Title Input */}
                <div className="p-6 pb-2">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Add title"
                        className="text-2xl font-terminal bg-transparent border-0 border-b border-primary/30 rounded-none px-0 py-2 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/50 h-auto"
                        autoFocus={isCreating}
                    />
                </div>

                <div className="p-6 pt-2 space-y-4">
                    {/* Date & Time Row */}
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 flex gap-2">
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-secondary/20 border-secondary text-sm w-[150px] rounded-none"
                            />
                            <Input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="bg-secondary/20 border-secondary text-sm w-[120px] rounded-none"
                            />
                        </div>
                    </div>

                    {/* Recurrence (Visual Stub) */}
                    <div className="flex items-center gap-2 pl-7">
                        <div className="text-sm text-muted-foreground flex items-center gap-2 cursor-not-allowed opacity-70 font-terminal">
                            <div className="w-4 h-4 rounded-none border border-current" />
                            Does not repeat
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 ml-4 cursor-not-allowed opacity-70 font-terminal">
                            <div className="w-4 h-4 border border-current rounded-none" />
                            All day
                        </div>
                    </div>

                    {/* Description */}
                    <div className="flex gap-2">
                        <AlignLeft className="w-5 h-5 text-muted-foreground shrink-0 mt-2" />
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add description"
                            className="bg-transparent border-0 resize-none min-h-[100px] focus-visible:ring-0 p-0 text-sm leading-relaxed placeholder:text-muted-foreground/50 font-terminal rounded-none"
                        />
                    </div>

                    {/* List Selector */}
                    <div className="flex items-center gap-2">
                        <div className="w-5 shrink-0" />
                        <Select value={listId} onValueChange={setListId}>
                            <SelectTrigger className="w-[150px] h-8 bg-secondary/20 border-secondary text-xs rounded-none">
                                <SelectValue placeholder="Select List" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableLists.map(l => (
                                    <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="p-4 bg-secondary/10 flex justify-between items-center border-t border-secondary">
                    {!isCreating && task ? (
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) { onDelete(task.id, task.listId); onClose(); } }}>
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Button>
                    ) : <div />}

                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} className="hover:bg-secondary/20 rounded-none font-terminal">Cancel</Button>
                        <Button onClick={handleSave} disabled={!title} className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-none px-6 font-terminal">
                            Save
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// -----------------------------------------------------------------------------
// Task List Container
// -----------------------------------------------------------------------------
export function TaskListContainer({ listId, title, tasks, onAddTask, onEdit, onToggle, onDelete }: {
    listId: string;
    title: string;
    tasks: GoogleTask[];
    onAddTask: (listId: string) => void;
    onEdit: (t: GoogleTask) => void;
    onToggle: (t: GoogleTask) => void;
    onDelete: (id: string, listId: string) => void;
}) {
    const { setNodeRef } = useSortable({
        id: listId,
        data: { type: 'Container', listId }
    });

    const activeTasks = tasks.filter(t => t.status !== 'completed');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    return (
        <div ref={setNodeRef} className="flex-1 min-w-[260px] max-w-[300px] flex flex-col h-full bg-black/40 rounded-none overflow-hidden border-2 border-secondary my-1">
            {/* Header */}
            <div className="p-4 flex items-center justify-between pb-2 border-b border-secondary">
                <h3 className="font-arcade text-xs text-primary tracking-wide truncate uppercase">
                    {title}
                </h3>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-none">
                        <div className="w-1 h-1 bg-current mb-0.5" />
                        <div className="w-1 h-1 bg-current mb-0.5" />
                        <div className="w-1 h-1 bg-current" />
                    </Button>
                </div>
            </div>

            {/* Add Task Button */}
            <div className="px-4 py-2 border-b border-secondary/50">
                <button
                    onClick={() => onAddTask(listId)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group w-full text-left font-terminal"
                >
                    <div className="w-6 h-6 rounded-none bg-secondary/20 flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary border border-secondary">
                        <Plus className="w-4 h-4" />
                    </div>
                    Add a task
                </button>
            </div>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto px-2 py-2 overflow-x-hidden">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {activeTasks.length > 0 ? (
                        <div className="space-y-1">
                            {activeTasks.map(task => (
                                <SortableTaskItem
                                    key={task.id}
                                    task={task}
                                    onToggle={onToggle}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    ) : (
                        completedTasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                                <p className="text-sm font-terminal">No tasks yet</p>
                            </div>
                        )
                    )}

                    {/* Completed Section using Collapsible */}
                    {completedTasks.length > 0 && (
                        <div className="mt-4 pt-2 border-t border-secondary/50">
                            <Collapsible>
                                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-terminal text-muted-foreground hover:text-primary w-full py-2 px-2 hover:bg-primary/5 rounded-none transition-colors">
                                    <ChevronRight className="w-4 h-4 transition-transform ui-open:rotate-90" />
                                    Completed ({completedTasks.length})
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-1 pl-2 mt-1">
                                    {completedTasks.map(task => (
                                        <SortableTaskItem
                                            key={task.id}
                                            task={task}
                                            onToggle={onToggle}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                        />
                                    ))}
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                    )}
                </SortableContext>
            </div>
        </div>
    );
}
