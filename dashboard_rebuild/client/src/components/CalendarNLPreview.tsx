import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Check, X, Edit2, Send } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface ChangePlanOperation {
  action: "add" | "move" | "delete" | "reschedule";
  event_type?: string;
  title?: string;
  date?: string;
  time?: string;
  end_time?: string;
  original_title?: string;
  new_date?: string;
}

interface ChangePlan {
  success: boolean;
  plan: ChangePlanOperation[];
  error?: string;
}

export function CalendarNLPreview() {
  const [nlInput, setNlInput] = useState("");
  const [changePlan, setChangePlan] = useState<ChangePlan | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedOp, setEditedOp] = useState<ChangePlanOperation | null>(null);

  const parseMutation = useMutation({
    mutationFn: async (input: string) => {
      const response = await fetch("/api/calendar/parse-nl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nl_input: input }),
      });
      if (!response.ok) throw new Error("Failed to parse natural language");
      return response.json();
    },
    onSuccess: (data: ChangePlan) => {
      setChangePlan(data);
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (plan: ChangePlanOperation[]) => {
      const response = await fetch("/api/calendar/execute-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations: plan }),
      });
      if (!response.ok) throw new Error("Failed to execute plan");
      return response.json();
    },
    onSuccess: () => {
      setChangePlan(null);
      setNlInput("");
      setEditingIndex(null);
      setEditedOp(null);
    },
  });

  const handleParse = () => {
    if (nlInput.trim()) {
      parseMutation.mutate(nlInput);
    }
  };

  const handleEdit = (index: number) => {
    if (!changePlan) return;
    setEditingIndex(index);
    setEditedOp({ ...changePlan.plan[index] });
  };

  const handleSaveEdit = () => {
    if (!changePlan || editingIndex === null || !editedOp) return;
    const updated = [...changePlan.plan];
    updated[editingIndex] = editedOp;
    setChangePlan({ ...changePlan, plan: updated });
    setEditingIndex(null);
    setEditedOp(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedOp(null);
  };

  const handleAccept = () => {
    if (changePlan && changePlan.success) {
      executeMutation.mutate(changePlan.plan);
    }
  };

  const handleDecline = () => {
    setChangePlan(null);
    setEditingIndex(null);
    setEditedOp(null);
  };

  const getActionBadge = (action: string) => {
    const colors = {
      add: "border-green-500/50 text-green-400",
      move: "border-blue-500/50 text-blue-400",
      delete: "border-red-500/50 text-red-400",
      reschedule: "border-yellow-500/50 text-yellow-400",
    };
    return (
      <Badge
        variant="outline"
        className={`text-xs font-terminal ${colors[action as keyof typeof colors] || ""}`}
      >
        {action.toUpperCase()}
      </Badge>
    );
  };

  const renderOperation = (op: ChangePlanOperation, index: number) => {
    const isEditing = editingIndex === index;

    if (isEditing && editedOp) {
      return (
        <div key={index} className="p-3 border border-primary bg-primary/10 rounded-none space-y-2">
          <div className="font-arcade text-xs text-primary">EDITING OPERATION</div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={editedOp.title || ""}
              onChange={(e) => setEditedOp({ ...editedOp, title: e.target.value })}
              placeholder="Title"
              className="rounded-none border-primary font-terminal text-xs"
            />
            <Input
              type="date"
              value={editedOp.date || editedOp.new_date || ""}
              onChange={(e) =>
                setEditedOp({ ...editedOp, [editedOp.new_date ? "new_date" : "date"]: e.target.value })
              }
              className="rounded-none border-primary font-terminal text-xs"
            />
            <Input
              type="time"
              value={editedOp.time || ""}
              onChange={(e) => setEditedOp({ ...editedOp, time: e.target.value })}
              placeholder="Start time"
              className="rounded-none border-primary font-terminal text-xs"
            />
            <Input
              type="time"
              value={editedOp.end_time || ""}
              onChange={(e) => setEditedOp({ ...editedOp, end_time: e.target.value })}
              placeholder="End time"
              className="rounded-none border-primary font-terminal text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSaveEdit}
              className="flex-1 bg-primary hover:bg-primary/80 rounded-none font-terminal text-xs"
            >
              <Check className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button
              onClick={handleCancelEdit}
              variant="outline"
              className="flex-1 rounded-none font-terminal text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div key={index} className="p-3 border border-secondary/40 bg-black/20 rounded-none">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              {getActionBadge(op.action)}
              <span className="font-terminal text-xs text-primary">
                {op.title || op.original_title || `${op.action} event`}
              </span>
            </div>
            <div className="font-terminal text-xs text-muted-foreground space-y-0.5">
              {op.event_type && <div>Type: {op.event_type}</div>}
              {op.date && <div>Date: {op.date}</div>}
              {op.new_date && <div>New Date: {op.new_date}</div>}
              {op.time && <div>Time: {op.time}{op.end_time ? ` - ${op.end_time}` : ""}</div>}
            </div>
          </div>
          <Button
            onClick={() => handleEdit(index)}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <Edit2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="brain-card rounded-none">
      <CardHeader className="border-b border-secondary/50">
        <CardTitle className="font-arcade text-sm text-primary">
          NATURAL LANGUAGE CALENDAR
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Input Section */}
        <div className="space-y-2">
          <div className="font-terminal text-xs text-muted-foreground">
            Enter calendar command in natural language:
          </div>
          <div className="flex gap-2">
            <Input
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleParse();
                }
              }}
              placeholder="e.g., 'Add exam on March 15' or 'Move quiz to next Tuesday'"
              className="flex-1 rounded-none border-primary font-terminal text-xs"
              disabled={parseMutation.isPending || executeMutation.isPending}
            />
            <Button
              onClick={handleParse}
              disabled={!nlInput.trim() || parseMutation.isPending || executeMutation.isPending}
              className="bg-primary hover:bg-primary/80 rounded-none font-terminal text-xs"
            >
              <Send className="w-3 h-3 mr-1" />
              {parseMutation.isPending ? "Parsing..." : "Parse"}
            </Button>
          </div>
        </div>

        {/* Preview Section */}
        {changePlan && (
          <div className="space-y-2 p-3 border border-secondary/40 rounded-none bg-black/40">
            {changePlan.success ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="font-arcade text-xs text-green-400">
                    ✓ CHANGE PLAN ({changePlan.plan.length} operation{changePlan.plan.length !== 1 ? "s" : ""})
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={handleDecline}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 rounded-none font-terminal text-xs"
                      disabled={executeMutation.isPending}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Decline
                    </Button>
                    <Button
                      onClick={handleAccept}
                      size="sm"
                      className="h-6 px-2 rounded-none font-terminal text-xs bg-green-600 hover:bg-green-700"
                      disabled={executeMutation.isPending}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      {executeMutation.isPending ? "Executing..." : "Accept"}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-2">
                    {changePlan.plan.map((op, idx) => renderOperation(op, idx))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex items-start gap-2 text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <div className="font-terminal text-xs font-bold">Parse Error</div>
                  <div className="font-terminal text-xs">
                    {changePlan.error || "Failed to parse natural language input"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Examples */}
        {!changePlan && (
          <div className="pt-2 border-t border-secondary/30">
            <div className="font-terminal text-xs text-muted-foreground space-y-1">
              <div>Examples:</div>
              <div>• "Add exam on March 15 at 2pm"</div>
              <div>• "Move quiz to next Tuesday"</div>
              <div>• "Delete lab on Friday"</div>
              <div>• "Reschedule lecture to April 1st"</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
