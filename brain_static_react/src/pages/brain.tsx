import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2, Edit2, Download, Database, RefreshCw, Plus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { InsertSession } from "@shared/schema";
import { format } from "date-fns";

export default function Brain() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<InsertSession>({
    date: new Date(),
    topic: "",
    mode: "Core",
    duration: "45m",
    errors: 0,
    cards: 0,
    notes: "",
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: api.sessions.getAll,
  });

  const { data: stats } = useQuery({
    queryKey: ["sessions", "stats"],
    queryFn: api.sessions.getStats,
  });

  const createMutation = useMutation({
    mutationFn: api.sessions.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setIsDialogOpen(false);
      setFormData({
        date: new Date(),
        topic: "",
        mode: "Core",
        duration: "45m",
        errors: 0,
        cards: 0,
        notes: "",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.sessions.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const handleSubmit = () => {
    createMutation.mutate(formData);
  };

  return (
    <Layout>
      <div className="space-y-8">
        
        {/* Fast Entry & DB Stats Row */}
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-2 bg-black/40 border-2 border-secondary rounded-none">
            <CardHeader className="border-b border-secondary p-4 flex flex-row items-center justify-between">
              <CardTitle className="font-arcade text-sm">FAST_ENTRY</CardTitle>
              <Button size="sm" variant="outline" className="font-arcade text-xs rounded-none border-primary text-primary hover:bg-primary hover:text-black">
                <Copy className="w-3 h-3 mr-2" /> COPY_PROMPT
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Textarea 
                placeholder="PASTE SESSION OUTPUT HERE..." 
                className="min-h-[120px] bg-black border-secondary rounded-none font-terminal focus-visible:ring-primary"
                data-testid="textarea-fast-entry"
              />
              <div className="flex justify-end">
                <Button className="font-arcade rounded-none bg-primary text-black hover:bg-primary/90" data-testid="button-ingest-data">
                  INGEST_DATA
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-2 border-primary/30 rounded-none">
            <CardHeader className="border-b border-primary/30 p-4">
              <CardTitle className="font-arcade text-sm flex items-center gap-2">
                <Database className="w-4 h-4" /> DB_STATS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 font-terminal text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">TOTAL_SESSIONS</span>
                <span className="text-primary text-lg" data-testid="text-total-sessions">{stats?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TOTAL_CARDS</span>
                <span className="text-primary text-lg" data-testid="text-total-cards">{stats?.totalCards || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AVG_ERRORS</span>
                <span className="text-white" data-testid="text-avg-errors">{stats?.avgErrors || 0}</span>
              </div>
              <div className="pt-2 border-t border-secondary text-xs text-muted-foreground text-center">
                LAST_SYNC: {format(new Date(), 'MMM dd, hh:mm a')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions Table */}
        <Card className="bg-black/40 border-2 border-secondary rounded-none">
           <CardHeader className="border-b border-secondary p-4 flex flex-row items-center justify-between">
              <CardTitle className="font-arcade text-sm">SESSION_LOGS</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="font-arcade text-xs rounded-none bg-secondary hover:bg-white hover:text-black" data-testid="button-manual-entry">
                    <Plus className="w-3 h-3 mr-2" /> MANUAL_ENTRY
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black border-2 border-primary rounded-none max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="font-arcade text-primary">QUICK_SESSION_ENTRY</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <label className="text-xs font-arcade text-muted-foreground">TOPIC</label>
                      <Input 
                        className="rounded-none bg-secondary/20 border-secondary" 
                        value={formData.topic}
                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                        data-testid="input-topic"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-arcade text-muted-foreground">MODE</label>
                      <Select value={formData.mode} onValueChange={(value) => setFormData({ ...formData, mode: value })}>
                        <SelectTrigger className="rounded-none bg-secondary/20 border-secondary" data-testid="select-mode">
                          <SelectValue placeholder="SELECT" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none bg-black border-primary">
                          <SelectItem value="Core">CORE</SelectItem>
                          <SelectItem value="Sprint">SPRINT</SelectItem>
                          <SelectItem value="Drill">DRILL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-arcade text-muted-foreground">DURATION</label>
                      <Input 
                        className="rounded-none bg-secondary/20 border-secondary" 
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        placeholder="e.g. 45m, 60m"
                        data-testid="input-duration"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-arcade text-muted-foreground">ERRORS</label>
                      <Input 
                        type="number"
                        className="rounded-none bg-secondary/20 border-secondary" 
                        value={formData.errors}
                        onChange={(e) => setFormData({ ...formData, errors: parseInt(e.target.value) || 0 })}
                        data-testid="input-errors"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                       <label className="text-xs font-arcade text-muted-foreground">NOTES</label>
                       <Textarea 
                         className="rounded-none bg-secondary/20 border-secondary min-h-[100px]"
                         value={formData.notes}
                         onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                         data-testid="textarea-notes"
                       />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" className="rounded-none font-arcade" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">CANCEL</Button>
                    <Button className="rounded-none font-arcade bg-primary text-black" onClick={handleSubmit} data-testid="button-save">SAVE_LOG</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center font-terminal text-muted-foreground">LOADING...</div>
              ) : sessions.length === 0 ? (
                <div className="p-8 text-center font-terminal text-muted-foreground">NO SESSIONS YET. ADD ONE ABOVE.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-secondary hover:bg-transparent">
                      <TableHead className="font-arcade text-xs text-primary">DATE</TableHead>
                      <TableHead className="font-arcade text-xs text-primary">TOPIC</TableHead>
                      <TableHead className="font-arcade text-xs text-primary">MODE</TableHead>
                      <TableHead className="font-arcade text-xs text-primary">DURATION</TableHead>
                      <TableHead className="font-arcade text-xs text-primary">ERRORS</TableHead>
                      <TableHead className="font-arcade text-xs text-primary text-right">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id} className="border-secondary group hover:bg-primary/10 font-terminal" data-testid={`row-session-${session.id}`}>
                        <TableCell data-testid={`text-date-${session.id}`}>{format(new Date(session.date), 'yyyy-MM-dd')}</TableCell>
                        <TableCell className="font-bold" data-testid={`text-topic-${session.id}`}>{session.topic}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-none border-secondary font-normal" data-testid={`badge-mode-${session.id}`}>{session.mode}</Badge>
                        </TableCell>
                        <TableCell data-testid={`text-duration-${session.id}`}>{session.duration}</TableCell>
                        <TableCell className={session.errors > 0 ? "text-primary" : "text-white"} data-testid={`text-errors-${session.id}`}>
                          {session.errors}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 hover:text-destructive"
                              onClick={() => deleteMutation.mutate(session.id)}
                              data-testid={`button-delete-${session.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
        </Card>

        {/* Bottom Modules */}
        <div className="grid md:grid-cols-2 gap-8">
           {/* Mastery */}
           <Card className="bg-black/40 border-2 border-secondary rounded-none">
              <CardHeader className="border-b border-secondary p-4">
                <CardTitle className="font-arcade text-sm">MASTERY_TRACKER</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {[
                  { topic: "Neuroscience", score: 92, status: "strong" },
                  { topic: "Pharmacology", score: 45, status: "weak" },
                  { topic: "Anatomy", score: 78, status: "average" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-32 font-terminal text-sm truncate">{item.topic}</div>
                    <div className="flex-1 h-3 bg-secondary/30 relative">
                      <div 
                        className={`absolute top-0 left-0 h-full ${
                          item.status === 'strong' ? 'bg-white' : 
                          item.status === 'weak' ? 'bg-primary' : 'bg-secondary'
                        }`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                    <div className="w-8 font-terminal text-xs text-right">{item.score}%</div>
                  </div>
                ))}
              </CardContent>
           </Card>

           {/* Anki Sync */}
           <Card className="bg-black/40 border-2 border-secondary rounded-none">
              <CardHeader className="border-b border-secondary p-4 flex flex-row items-center justify-between">
                <CardTitle className="font-arcade text-sm">ANKI_CONNECT</CardTitle>
                <Badge variant="outline" className="rounded-none border-white text-white bg-white/10">CONNECTED</Badge>
              </CardHeader>
              <CardContent className="p-4">
                <div className="text-center py-8 space-y-4">
                  <div className="font-terminal text-muted-foreground">
                    12 CARDS PENDING SYNC
                  </div>
                  <Button className="w-full font-arcade rounded-none bg-primary hover:bg-red-600 text-black border-2 border-red-800" data-testid="button-sync-anki">
                    <RefreshCw className="w-4 h-4 mr-2" /> SYNC_NOW
                  </Button>
                </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </Layout>
  );
}
