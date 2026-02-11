# UI Pages Overhaul - Implementation Spec

## Overview
Implement the page-by-page UI restructuring per the audit recommendations.

## DASHBOARD (Home Page) - "Quick Preview, Not Control Center"

### File: `dashboard_rebuild/client/src/pages/dashboard.tsx`

**Current Problems:**
- Full NextActions component duplicates Brain functionality
- Too many competing elements
- No clear primary CTA

**Changes:**

#### 1. Remove NextActions Import and Usage
```typescript
// REMOVE this import:
import { NextActions } from "@/components/NextActions";

// REMOVE this from JSX:
<NextActions />
```

#### 2. Add Compact Task Preview Component
Create new component or inline:

```typescript
function CompactTaskPreview({ limit = 3 }: { limit?: number }) {
  const { data: queue = [] } = useQuery<StudyTask[]>({
    queryKey: ["planner", "queue"],
    queryFn: api.planner.getQueue,
  });
  
  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = queue.filter(t => t.scheduled_date && t.scheduled_date <= today).slice(0, limit);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Today's Focus</span>
          <Badge variant="outline">{todayTasks.length} tasks</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todayTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks due today</p>
        ) : (
          <ul className="space-y-2">
            {todayTasks.map(task => (
              <li key={task.id} className="text-sm flex items-center gap-2">
                <Circle className="w-2 h-2" />
                <span className="truncate">{task.anchor_text || task.notes}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

#### 3. Add Prominent "Open Brain" CTA
```tsx
<Button 
  size="lg" 
  className="w-full"
  onClick={() => navigate('/brain')}
>
  Open Brain →
</Button>
```

#### 4. Make Sections Collapsible
Add state persistence:
```typescript
const [collapsedSections, setCollapsedSections] = useState(() => {
  const saved = localStorage.getItem('dashboard-collapsed');
  return saved ? JSON.parse(saved) : { deadlines: true, courses: true, tasks: true };
});

const toggleSection = (section: string) => {
  const updated = { ...collapsedSections, [section]: !collapsedSections[section] };
  setCollapsedSections(updated);
  localStorage.setItem('dashboard-collapsed', JSON.stringify(updated));
};
```

Wrap sections in Collapsible:
```tsx
<Collapsible open={!collapsedSections.deadlines} onOpenChange={() => toggleSection('deadlines')}>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" size="sm">Academic Deadlines {collapsedSections.deadlines ? '▶' : '▼'}</Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* Deadlines content */}
  </CollapsibleContent>
</Collapsible>
```

#### New Dashboard Layout
```
Dashboard Page
├── Header: PT Study Dashboard
├── Primary: Study Wheel (keep existing)
├── Secondary Row:
│   ├── Today's Focus (CompactTaskPreview, limit=3)
│   └── Today's Activity (mini stats - keep existing)
├── Tertiary (collapsible):
│   ├── Academic Deadlines (collapsed by default)
│   ├── Courses Summary (collapsed by default)
│   └── Google Tasks (collapsed by default)
└── Floating: Open Brain button (prominent)
```

---

## BRAIN Page - "The Hub" (Tabs Restructured)

### File: `dashboard_rebuild/client/src/pages/brain.tsx`

**Current Problems:**
- Daily/Weekly/Advanced naming is confusing
- Advanced tab too crowded
- "Ingest" terminology ambiguous
- DataTables in Weekly feels out of place

**Changes:**

#### 1. Rename Tabs
```typescript
// OLD:
const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'advanced'>('daily');
const tabs = [
  { id: 'daily', label: 'DAILY' },
  { id: 'weekly', label: 'WEEKLY' },
  { id: 'advanced', label: 'ADVANCED' },
];

// NEW:
const [activeTab, setActiveTab] = useState<'today' | 'this_week' | 'tools' | 'data'>('today');
const tabs = [
  { id: 'today', label: 'TODAY' },
  { id: 'this_week', label: 'THIS WEEK' },
  { id: 'tools', label: 'TOOLS' },
  { id: 'data', label: 'DATA' },
];
```

#### 2. Reorganize Tab Content

**TODAY Tab (was Daily):**
```tsx
<TabsContent value="today">
  <div className="space-y-6">
    <SessionSnapshot />
    <AttachJsonSection /> {/* Renamed from IngestionTab */}
    <TodaysActions /> {/* NextActions filter="today" */}
  </div>
</TabsContent>
```

**THIS WEEK Tab (was Weekly):**
```tsx
<TabsContent value="this_week">
  <div className="space-y-6">
    <FullPlannerQueue /> {/* NextActions filter="all" */}
    <StaleTopicsAlert />
    {/* REMOVE DataTablesSection from here */}
  </div>
</TabsContent>
```

**TOOLS Tab (was Advanced):**
```tsx
<TabsContent value="tools">
  <div className="space-y-6">
    <TopicNoteBuilder />
    <SyllabusImport /> {/* Moved from separate view */}
    <ObsidianVaultBrowser />
    <AnkiIntegration />
  </div>
</TabsContent>
```

**DATA Tab (NEW):**
```tsx
<TabsContent value="data">
  <div className="space-y-6">
    <DataTablesSection /> {/* Moved from Weekly */}
    <VaultGraph />
    <MindMap />
    <ExportTools />
  </div>
</TabsContent>
```

#### 3. Rename Ingestion Components

**Display name change only:**
```tsx
// In brain.tsx
<IngestionTab />

// Inside IngestionTab.tsx
<Card>
  <CardHeader>
    <CardTitle>Attach JSON to Session</CardTitle>
    <CardDescription>
      Paste Tracker JSON and Enhanced JSON from your Tutor session
    </CardDescription>
  </CardHeader>
  {/* ... */}
  <Button>Attach JSON</Button>
</Card>
```

#### 4. Add U8 CTA (see u8-planner-cta.md)
Already specified in separate file.

---

## SCHOLAR Page - "Active Advisor" (7→3 Tabs)

### File: `dashboard_rebuild/client/src/pages/scholar.tsx`

**Current Problems:**
- 7 tabs overwhelming
- No way to trigger new runs
- Unclear what's actionable

**Changes:**

#### 1. Reduce to 3 Tabs
```typescript
// OLD: 7 tabs
const tabs = ['summary', 'tutor_audit', 'questions', 'evidence', 'proposals', 'clusters', 'history'];

// NEW: 3 tabs
const tabs = ['summary', 'analysis', 'proposals'];
```

#### 2. Merge Content

**SUMMARY Tab:**
```tsx
<TabsContent value="summary">
  <div className="space-y-6">
    <StudyHealthOverview />
    <div className="grid grid-cols-2 gap-4">
      <WhatsWorkingCard />
      <PotentialConcernsCard />
    </div>
    <ScholarChat />
  </div>
</TabsContent>
```

**ANALYSIS Tab (with collapsible sections):**
```tsx
<TabsContent value="analysis">
  <div className="space-y-4">
    <CollapsibleSection title="Tutor Audit" defaultOpen={false}>
      <TutorAuditContent />
    </CollapsibleSection>
    
    <CollapsibleSection title="Question Pipeline" defaultOpen={false}>
      <QuestionPipelineContent />
    </CollapsibleSection>
    
    <CollapsibleSection title="Evidence Review" defaultOpen={false}>
      <EvidenceReviewContent />
    </CollapsibleSection>
    
    <CollapsibleSection title="Topic Clusters" defaultOpen={false}>
      <ClustersContent />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => runClusteringMutation.mutate()}
      >
        Run Clustering
      </Button>
    </CollapsibleSection>
  </div>
</TabsContent>
```

**PROPOSALS Tab:**
```tsx
<TabsContent value="proposals">
  <div className="space-y-6">
    <ActiveProposals />
    <ImplementationBundleButton />
    
    <Collapsible>
      <CollapsibleTrigger>View Archive</CollapsibleTrigger>
      <CollapsibleContent>
        <ProposalHistory />
      </CollapsibleContent>
    </Collapsible>
  </div>
</TabsContent>
```

#### 3. Add Run Controls (U7)
See u7-scholar-run.md for full implementation.

---

## CALENDAR Page - "Clean Separation"

### File: `dashboard_rebuild/client/src/pages/calendar.tsx`

**Current Problems:**
- Calendar and Tasks board compete for space
- Too many modal types
- Assistant inline takes space

**Changes:**

#### 1. Mutually Exclusive Views
```typescript
const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'tasks'>('month');

// Show only one at a time
{viewMode === 'month' && <MonthView />}
{viewMode === 'week' && <WeekView />}
{viewMode === 'day' && <DayView />}
{viewMode === 'tasks' && <TasksBoard />}
```

#### 2. Add Sidebar (Collapsible)
```tsx
<div className="flex">
  {/* Main content */}
  <div className="flex-1">
    <CalendarHeader viewMode={viewMode} setViewMode={setViewMode} />
    {currentView}
  </div>
  
  {/* Collapsible sidebar */}
  <Collapsible open={showSidebar} onOpenChange={setShowSidebar}>
    <div className="w-64 border-l p-4 space-y-4">
      <MiniCalendar />
      <CalendarList />
      <UpcomingDeadlines />
    </div>
  </Collapsible>
</div>
```

#### 3. Floating Assistant
```tsx
{/* Instead of inline, use floating button */}
<div className="fixed bottom-4 right-4">
  <Button 
    size="icon"
    onClick={() => setShowAssistant(!showAssistant)}
  >
    <BotIcon />
  </Button>
  
  {showAssistant && (
    <Card className="absolute bottom-16 right-0 w-96">
      <CalendarAssistant />
    </Card>
  )}
</div>
```

---

## Component: CollapsibleSection

Create reusable component:

```typescript
// dashboard_rebuild/client/src/components/CollapsibleSection.tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false 
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-accent rounded">
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span className="font-medium">{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 py-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

---

## Testing Checklist

### Dashboard
- [ ] NextActions removed
- [ ] Compact preview shows only 3 tasks
- [ ] "Open Brain" button navigates to /brain
- [ ] Sections can be collapsed/expanded
- [ ] Collapse state persists in localStorage

### Brain
- [ ] Tabs renamed: TODAY, THIS WEEK, TOOLS, DATA
- [ ] IngestionTab shows "Attach JSON to Session" title
- [ ] SyllabusViewTab moved to TOOLS tab
- [ ] DataTablesSection moved to DATA tab
- [ ] Planner CTA appears after JSON attach (U8)

### Scholar
- [ ] Only 3 tabs visible: SUMMARY, ANALYSIS, PROPOSALS
- [ ] Analysis sections are collapsible
- [ ] Run Scholar button present in header
- [ ] Status shows idle/running/success
- [ ] History panel shows recent runs

### Calendar
- [ ] View toggle switches between calendar and tasks (not both)
- [ ] Sidebar can be collapsed
- [ ] Assistant is floating button (not inline)

---

## Files Modified

### Dashboard Page
- `dashboard_rebuild/client/src/pages/dashboard.tsx`

### Brain Page  
- `dashboard_rebuild/client/src/pages/brain.tsx`
- `dashboard_rebuild/client/src/components/IngestionTab.tsx` (rename display)

### Scholar Page
- `dashboard_rebuild/client/src/pages/scholar.tsx`

### Calendar Page
- `dashboard_rebuild/client/src/pages/calendar.tsx`

### Shared Components
- `dashboard_rebuild/client/src/components/CollapsibleSection.tsx` (new)
