import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Flame, Award, Layers, Upload, AlertTriangle } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMemo } from "react";

const PIE_DATA = [
  { name: "Core", value: 400, color: "var(--color-primary)" },
  { name: "Sprint", value: 300, color: "var(--color-secondary)" },
  { name: "Drill", value: 300, color: "#444" },
];

export default function Dashboard() {
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: api.sessions.getAll,
  });

  const { data: stats } = useQuery({
    queryKey: ["sessions", "stats"],
    queryFn: api.sessions.getStats,
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals"],
    queryFn: api.proposals.getAll,
  });

  const weekData = useMemo(() => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const counts = days.map((name, idx) => {
      const count = sessions.filter(s => {
        const date = new Date(s.date);
        return date.getDay() === idx;
      }).length;
      return { name, value: count };
    });
    return counts;
  }, [sessions]);

  const topicBreakdown = useMemo(() => {
    const topics: Record<string, number> = {};
    sessions.forEach(s => {
      topics[s.topic] = (topics[s.topic] || 0) + 1;
    });
    return Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([topic, count]) => ({
        topic,
        percentage: Math.round((count / sessions.length) * 100),
      }));
  }, [sessions]);

  const activeProposals = proposals.filter(p => p.status !== "REJECTED").length;
  
  return (
    <Layout>
      <div className="space-y-8">
        {/* Top Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "SESSIONS", value: String(stats?.total || 0), icon: Layers, testId: "stat-sessions" },
            { label: "STREAK", value: "12 DAYS", icon: Flame, testId: "stat-streak" },
            { label: "LEVEL", value: String(Math.floor((stats?.total || 0) / 6)), icon: Award, testId: "stat-level" },
            { label: "CARDS", value: String(stats?.totalCards || 0), icon: Activity, testId: "stat-cards" },
          ].map((stat, i) => (
            <Card key={i} className="bg-black/40 border-2 border-secondary hover:border-primary transition-colors rounded-none">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-arcade">{stat.label}</p>
                  <p className="text-2xl font-arcade text-primary" data-testid={stat.testId}>{stat.value}</p>
                </div>
                <stat.icon className="w-8 h-8 text-secondary" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Study Trends */}
            <Card className="bg-black/40 border-2 border-secondary rounded-none">
              <CardHeader className="flex flex-row items-center justify-between border-b border-secondary p-4">
                <CardTitle className="font-arcade text-sm">STUDY_TRENDS</CardTitle>
                <Select defaultValue="7">
                  <SelectTrigger className="w-32 h-8 rounded-none border-secondary bg-black" data-testid="select-timeframe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-primary bg-black">
                    <SelectItem value="7">7 DAYS</SelectItem>
                    <SelectItem value="30">30 DAYS</SelectItem>
                    <SelectItem value="90">90 DAYS</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-4 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weekData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} fontFamily="var(--font-terminal)" tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} fontFamily="var(--font-terminal)" tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '2px solid var(--color-primary)', borderRadius: '0px', fontFamily: 'var(--font-terminal)' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Patterns & Insights */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-black/40 border-2 border-secondary rounded-none">
                <CardHeader className="p-4 border-b border-secondary">
                  <CardTitle className="font-arcade text-sm">MODE_DISTRIBUTION</CardTitle>
                </CardHeader>
                <CardContent className="p-4 h-[200px] flex items-center justify-center">
                   <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={PIE_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {PIE_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '0px', fontFamily: 'var(--font-terminal)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-2 border-secondary rounded-none">
                <CardHeader className="p-4 border-b border-secondary">
                  <CardTitle className="font-arcade text-sm">FOCUS_AREAS</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {topicBreakdown.length === 0 ? (
                    <div className="text-center font-terminal text-muted-foreground py-8">NO DATA YET</div>
                  ) : (
                    topicBreakdown.map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center text-sm font-terminal">
                          <span data-testid={`text-topic-${i}`}>{item.topic.toUpperCase()}</span>
                          <span className="text-primary" data-testid={`text-percentage-${i}`}>{item.percentage}%</span>
                        </div>
                        <div className="h-2 w-full bg-secondary overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${item.percentage}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            {/* Scholar Insights */}
            <Card className="bg-black/40 border-2 border-primary/50 rounded-none relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              </div>
              <CardHeader className="p-4 border-b border-primary/20">
                <CardTitle className="font-arcade text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                  INSIGHTS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 font-terminal text-sm">
                <div className="p-3 bg-primary/10 border border-primary/30">
                  <span className="text-primary block mb-1">&gt; ALERT</span>
                  {stats?.avgErrors && stats.avgErrors > 2 
                    ? "Error rate above average. Review weak areas."
                    : "Consistency maintained. Good progress."}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>ACTIVE_PROPOSALS</span>
                    <span className="text-white" data-testid="text-active-proposals">{activeProposals}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>TOTAL_SESSIONS</span>
                    <span className="text-white" data-testid="text-insight-sessions">{stats?.total || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Log */}
            <Card className="bg-black/40 border-2 border-dashed border-secondary rounded-none hover:border-primary transition-colors cursor-pointer group">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="font-arcade text-xs text-primary mb-1">UPLOAD_LOGS</p>
                  <p className="font-terminal text-xs text-muted-foreground">DRAG & DROP SESSION FILES</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
