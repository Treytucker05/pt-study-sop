import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Clock, BookOpen, AlertTriangle, Play, Check, Plus, Pencil, Trash2, Calendar, CheckCircle2, Circle, GraduationCap, ChevronLeft, ChevronRight, ListTodo } from "lucide-react";
import type { GoogleTask } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type AcademicDeadline, type InsertAcademicDeadline } from "@/lib/api";
import { PlannerKanban } from "@/components/PlannerKanban";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/use-toast";
import { format, isPast, isToday, isTomorrow, differenceInDays, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [minutes, setMinutes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<{ id: number; name: string; code?: string | null } | null>(null);
  const [editCourseName, setEditCourseName] = useState("");
  const [editCourseCode, setEditCourseCode] = useState("");
  const [courseToDelete, setCourseToDelete] = useState<{ id: number; name: string } | null>(null);

  // Google Tasks state
  const [currentTaskListIndex, setCurrentTaskListIndex] = useState(0);
  const [taskListInitialized, setTaskListInitialized] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editingTask, setEditingTask] = useState<GoogleTask | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskNotes, setEditTaskNotes] = useState("");
  const [editTaskDue, setEditTaskDue] = useState("");
  const [editTaskDeadlineType, setEditTaskDeadlineType] = useState<"none" | "assignment" | "quiz" | "exam">("none");

  // Academic deadlines state
  const [showAddDeadline, setShowAddDeadline] = useState(false);
  const [deadlineCourseFilter, setDeadlineCourseFilter] = useState("all");
  const [newDeadline, setNewDeadline] = useState<InsertAcademicDeadline>({
    title: "",
    course: "",
    type: "assignment",
    dueDate: "",
    notes: "",
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingGoal, setOnboardingGoal] = useState("");
  const [onboardingFriction, setOnboardingFriction] = useState("");
  const [onboardingTools, setOnboardingTools] = useState("");
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [showDataRights, setShowDataRights] = useState(false);
  const [privacyDraft, setPrivacyDraft] = useState({
    retentionDays: 180,
    allowTier2Signals: true,
    allowVaultSignals: true,
    allowCalendarSignals: true,
    allowScholarPersonalization: true,
    allowOutcomeReports: true,
  });

  const { data: currentCourseData } = useQuery({
    queryKey: ["study-wheel", "current"],
    queryFn: api.studyWheel.getCurrentCourse,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses", "active"],
    queryFn: api.courses.getActive,
  });

  const { data: todaySessions = [] } = useQuery({
    queryKey: ["sessions", "today"],
    queryFn: api.todaySessions.get,
  });

  const { data: streakData } = useQuery({
    queryKey: ["streak"],
    queryFn: api.streak.get,
  });

  const { data: weaknessQueue = [] } = useQuery({
    queryKey: ["weakness-queue"],
    queryFn: api.weaknessQueue.get,
  });

  const { data: academicDeadlines = [] } = useQuery({
    queryKey: ["academic-deadlines"],
    queryFn: api.academicDeadlines.getAll,
  });

  const { data: plannerQueue = [] } = useQuery({
    queryKey: ["planner-queue"],
    queryFn: api.planner.getQueue,
  });

  const { data: brainProfile } = useQuery({
    queryKey: ["brain-profile-summary", "dashboard"],
    queryFn: () => api.brain.getProfileSummary(false),
    staleTime: 5 * 60 * 1000,
  });

  const { data: scholarInvestigations = [] } = useQuery({
    queryKey: ["scholar-investigations", "dashboard"],
    queryFn: () => api.scholar.getInvestigations(5),
    staleTime: 60 * 1000,
  });

  const { data: scholarQuestions = [] } = useQuery({
    queryKey: ["scholar-questions", "dashboard"],
    queryFn: () => api.scholar.getQuestions("pending", 5),
    staleTime: 60 * 1000,
  });

  const { data: productAnalytics } = useQuery({
    queryKey: ["product-analytics", "dashboard"],
    queryFn: () => api.product.getAnalytics(),
    staleTime: 60 * 1000,
  });

  const { data: privacySettings } = useQuery({
    queryKey: ["product-privacy", "dashboard"],
    queryFn: () => api.product.getPrivacySettings(),
    staleTime: 60 * 1000,
  });

  const { data: featureFlagsPayload } = useQuery({
    queryKey: ["product-flags", "dashboard"],
    queryFn: () => api.product.getFeatureFlags(),
    staleTime: 5 * 60 * 1000,
  });

  // Google Tasks
  const { data: googleTaskLists = [] } = useQuery({
    queryKey: ["google-task-lists"],
    queryFn: api.googleTasks.getLists,
  });

  const { data: allGoogleTasks = [] } = useQuery({
    queryKey: ["google-tasks"],
    queryFn: api.googleTasks.getAll,
  });

  useEffect(() => {
    if (taskListInitialized) return;
    if (!googleTaskLists.length) return;

    const preferredIndex = googleTaskLists.findIndex((list) =>
      list.title?.toLowerCase().includes("school")
    );

    if (preferredIndex >= 0) {
      setCurrentTaskListIndex(preferredIndex);
    }

    setTaskListInitialized(true);
  }, [googleTaskLists, taskListInitialized]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tss.onboarding.v1");
      if (!raw) {
        setShowOnboarding(true);
        return;
      }
      const parsed = JSON.parse(raw);
      setOnboardingGoal(parsed.goal || "");
      setOnboardingFriction(parsed.friction || "");
      setOnboardingTools(parsed.tools || "");
    } catch {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    if (!privacySettings) return;
    setPrivacyDraft({
      retentionDays: privacySettings.retentionDays,
      allowTier2Signals: privacySettings.allowTier2Signals,
      allowVaultSignals: privacySettings.allowVaultSignals,
      allowCalendarSignals: privacySettings.allowCalendarSignals,
      allowScholarPersonalization: privacySettings.allowScholarPersonalization,
      allowOutcomeReports: privacySettings.allowOutcomeReports,
    });
  }, [privacySettings]);

  const completeSessionMutation = useMutation({
    mutationFn: ({ courseId, mins }: { courseId: number; mins: number }) =>
      api.studyWheel.completeSession(courseId, mins),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-wheel"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      setMinutes("");
      setIsCompleting(false);
      toast({ title: "Session logged!", description: "Wheel rotated to next course." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log session. Please try again.", variant: "destructive" });
    },
  });

  const addCourseMutation = useMutation({
    mutationFn: ({ name, code }: { name: string; code?: string }) =>
      api.courses.create({ name, code, active: true, position: courses.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["study-wheel"] });
      setNewCourseName("");
      setNewCourseCode("");
      setShowAddCourse(false);
      toast({ title: "Course added!", description: "New course added to the wheel." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add course. Please try again.", variant: "destructive" });
    },
  });

  const editCourseMutation = useMutation({
    mutationFn: ({ id, name, code }: { id: number; name: string; code?: string | null }) =>
      api.courses.update(id, { name, code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["study-wheel"] });
      setEditingCourse(null);
      setEditCourseName("");
      setEditCourseCode("");
      toast({ title: "Course updated!", description: "Course name has been changed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update course. Please try again.", variant: "destructive" });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id: number) => api.courses.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses", "active"] });
      queryClient.invalidateQueries({ queryKey: ["study-wheel", "current"] });
      queryClient.invalidateQueries({ queryKey: ["study-wheel"] });
      toast({ title: "Course deleted!", description: "Course has been removed from the wheel." });
    },
    onError: (error) => {
      console.error("Delete failed:", error);
      toast({ title: "Error", description: "Failed to delete course. Please try again.", variant: "destructive" });
    },
  });

  // Google Task mutations
  const toggleGoogleTaskMutation = useMutation({
    mutationFn: (task: GoogleTask) => api.googleTasks.update(task.id, task.listId, {
      status: task.status === 'completed' ? 'needsAction' : 'completed'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-tasks"] });
      toast({ title: "Task updated", description: "Task status has been changed." });
    },
  });

  const createGoogleTaskMutation = useMutation({
    mutationFn: (vars: { listId: string; title: string }) =>
      api.googleTasks.create(vars.listId, { title: vars.title, status: 'needsAction' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-tasks"] });
      setNewTaskTitle("");
      toast({ title: "Task created", description: "New task added to your list." });
    },
  });

  const updateGoogleTaskMutation = useMutation({
    mutationFn: (vars: { task: GoogleTask; data: { title?: string; notes?: string; due?: string } }) =>
      api.googleTasks.update(vars.task.id, vars.task.listId, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-tasks"] });
      setEditingTask(null);
      setEditTaskTitle("");
      setEditTaskNotes("");
      setEditTaskDue("");
      setEditTaskDeadlineType("none");
      toast({ title: "Task saved", description: "Task details updated." });
    },
  });

  const deleteGoogleTaskMutation = useMutation({
    mutationFn: (task: GoogleTask) => api.googleTasks.delete(task.id, task.listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-tasks"] });
      toast({ title: "Task deleted", description: "Task has been removed." });
    },
  });

  // Academic deadline mutations
  const createDeadlineMutation = useMutation({
    mutationFn: (data: InsertAcademicDeadline) => api.academicDeadlines.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-deadlines"] });
      setShowAddDeadline(false);
      setNewDeadline({ title: "", course: "", type: "assignment", dueDate: "", notes: "" });
      toast({ title: "Deadline added!", description: "Academic deadline has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add deadline.", variant: "destructive" });
    },
  });

  const toggleDeadlineMutation = useMutation({
    mutationFn: (id: number) => api.academicDeadlines.toggleComplete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-deadlines"] });
      toast({ title: "Deadline updated", description: "Deadline status changed." });
    },
  });

  const deleteDeadlineMutation = useMutation({
    mutationFn: (id: number) => api.academicDeadlines.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-deadlines"] });
      toast({ title: "Deadline removed", description: "Academic deadline has been deleted." });
    },
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: () => api.product.updatePrivacySettings(privacyDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-privacy", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["product-analytics", "dashboard"] });
      toast({ title: "Privacy settings saved", description: "Data-rights preferences updated for this workspace." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save privacy settings", description: error.message, variant: "destructive" });
    },
  });

  const resetPersonalizationMutation = useMutation({
    mutationFn: () => api.product.resetPersonalization(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brain-profile-summary", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["scholar-investigations", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["scholar-questions", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["product-analytics", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["product-privacy", "dashboard"] });
      toast({
        title: "Personalization reset",
        description: "Brain profile snapshots and Scholar research workspace data were cleared for a fresh rebuild.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    },
  });

  const completeOnboarding = async () => {
    if (!onboardingGoal.trim() || !onboardingFriction.trim()) {
      toast({ title: "Finish the setup", description: "Add your goal and biggest friction first.", variant: "destructive" });
      return;
    }
    setOnboardingBusy(true);
    try {
      const payload = {
        goal: onboardingGoal.trim(),
        friction: onboardingFriction.trim(),
        tools: onboardingTools.trim(),
        completedAt: new Date().toISOString(),
      };
      localStorage.setItem("tss.onboarding.v1", JSON.stringify(payload));
      await api.product.logEvent({
        eventType: "onboarding_completed",
        source: "dashboard.onboarding",
        metadata: payload,
      });
      await api.scholar.createInvestigation({
        query_text: `Research a study strategy for a learner whose main goal is "${payload.goal}" and whose biggest friction is "${payload.friction}". Current tools/workflow: ${payload.tools || "not specified"}.`,
        rationale: "First-run onboarding should give Scholar a grounded starting investigation for this learner.",
        audience_type: "learner",
        mode: "brain",
        requested_by: "onboarding",
      });
      queryClient.invalidateQueries({ queryKey: ["scholar-investigations", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["product-analytics", "dashboard"] });
      setShowOnboarding(false);
      toast({ title: "System initialized", description: "Scholar started a first-pass investigation from your onboarding answers." });
    } catch (error) {
      toast({
        title: "Onboarding saved locally",
        description: error instanceof Error ? error.message : "Scholar could not start the first investigation yet.",
      });
      setShowOnboarding(false);
    } finally {
      setOnboardingBusy(false);
    }
  };

  const downloadJson = async (filename: string, fetcher: () => Promise<Record<string, unknown>>) => {
    const payload = await fetcher();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const currentCourse = currentCourseData?.currentCourse;
  const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const todaySessionCount = todaySessions.length;
  const hasStudiedToday = todaySessionCount > 0;
  const featureFlags = useMemo(
    () =>
      new Map(
        (featureFlagsPayload?.flags || []).map((flag) => [flag.flagKey, flag])
      ),
    [featureFlagsPayload],
  );
  const outcomeReportsEnabled =
    (featureFlags.get("premium_outcome_report")?.enabled ?? true) &&
    privacyDraft.allowOutcomeReports;

  const handleCompleteSession = () => {
    if (!currentCourse || !minutes || parseInt(minutes) < 1) return;
    completeSessionMutation.mutate({ courseId: currentCourse.id, mins: parseInt(minutes) });
  };

  const handleAddCourse = () => {
    if (!newCourseName.trim()) return;
    addCourseMutation.mutate({
      name: newCourseName.trim(),
      code: newCourseCode.trim() || undefined,
    });
  };

  const handleEditCourse = () => {
    if (!editingCourse || !editCourseName.trim()) return;
    editCourseMutation.mutate({
      id: editingCourse.id,
      name: editCourseName.trim(),
      code: editCourseCode.trim() || null,
    });
  };

  const handleConfirmDelete = () => {
    if (courseToDelete) {
      deleteCourseMutation.mutate(courseToDelete.id);
      setCourseToDelete(null);
    }
  };

  const startEditCourse = (course: { id: number; name: string; code?: string | null }) => {
    setEditingCourse(course);
    setEditCourseName(course.name);
    setEditCourseCode(course.code ?? "");
  };

  const handleAddDeadline = () => {
    if (!newDeadline.title?.trim() || !newDeadline.dueDate) return;
    createDeadlineMutation.mutate(newDeadline as InsertAcademicDeadline);
  };

  // Helper functions for deadline display
  const getDeadlineUrgency = (dueDate: string) => {
    const date = new Date(dueDate);
    if (!isValid(date)) return "unknown";
    if (isPast(date) && !isToday(date)) return "overdue";
    if (isToday(date)) return "today";
    if (isTomorrow(date)) return "tomorrow";
    const daysLeft = differenceInDays(date, new Date());
    if (daysLeft <= 3) return "soon";
    if (daysLeft <= 7) return "week";
    return "later";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "exam": return "📝";
      case "quiz": return "❓";
      case "project": return "📂";
      default: return "📋";
    }
  };

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case "overdue": return "border-destructive bg-destructive/20 text-destructive";
      case "today": return "border-urgent bg-urgent/20 text-urgent";
      case "tomorrow": return "border-warning bg-warning/20 text-warning";
      case "soon": return "border-secondary bg-secondary/20 text-muted-foreground";
      default: return "border-secondary/30 text-muted-foreground";
    }
  };

  // Build a map of course ID -> name for resolving numeric course values
  const courseIdToName: Record<string, string> = {};
  courses.forEach(c => { courseIdToName[String(c.id)] = c.name; });

  // Resolve course field: if numeric, look up the name from wheel courses
  const resolveCourse = (val: string): string => {
    if (!val) return "";
    if (/^\d+$/.test(val)) return courseIdToName[val] || "";
    return val;
  };

  // Unique course names from deadlines + study wheel courses
  const deadlineCourseNames = [...new Set([
    ...academicDeadlines.map(d => resolveCourse(d.course)).filter(Boolean),
    ...courses.map(c => c.name),
  ])].sort();

  // Sort deadlines by due date, incomplete first, then filter by course
  const sortedDeadlines = [...academicDeadlines]
    .filter(d => deadlineCourseFilter === "all" || resolveCourse(d.course) === deadlineCourseFilter)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  // Get current task list and its tasks
  const currentTaskList = googleTaskLists[currentTaskListIndex];
  const currentListTasks = currentTaskList
    ? allGoogleTasks.filter((t: GoogleTask) => t.listId === currentTaskList.id)
    : [];
  const incompleteTasks = currentListTasks.filter((t: GoogleTask) => t.status !== 'completed');
  const completedTasks = currentListTasks.filter((t: GoogleTask) => t.status === 'completed');

  const handleAddGoogleTask = () => {
    if (!newTaskTitle.trim() || !currentTaskList) return;
    createGoogleTaskMutation.mutate({ listId: currentTaskList.id, title: newTaskTitle.trim() });
  };

  const handleEditTask = () => {
    if (!editingTask || !editTaskTitle.trim()) return;

    const updateData: { title?: string; notes?: string; due?: string } = {
      title: editTaskTitle.trim(),
    };
    if (editTaskNotes) updateData.notes = editTaskNotes;
    if (editTaskDue) {
      // Preserve the day the user picked in their local timezone.
      // `new Date("YYYY-MM-DD")` is parsed as UTC, which can shift the displayed date west of UTC.
      const [yy, mm, dd] = editTaskDue.split("-").map((x) => Number(x));
      if (yy && mm && dd) updateData.due = new Date(yy, mm - 1, dd).toISOString();
    }

    updateGoogleTaskMutation.mutate({ task: editingTask, data: updateData });

    if (editTaskDeadlineType !== "none" && editTaskDue) {
      createDeadlineMutation.mutate({
        title: editTaskTitle.trim(),
        type: editTaskDeadlineType,
        dueDate: editTaskDue,
        course: "",
        notes: editTaskNotes || "",
      });
    }
  };

  const startEditTask = (task: GoogleTask) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskNotes(task.notes || "");
    setEditTaskDue(task.due ? task.due.split('T')[0] : "");
    setEditTaskDeadlineType("none");
  };

  const formatTaskDue = (due?: string) => {
    if (!due) return null;
    const date = new Date(due);
    if (!isValid(date)) return null;
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isPast(date)) return "Overdue";
    return format(date, "MMM d");
  };

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const duePlannerTasks = plannerQueue.filter((t) => t.scheduled_date && t.scheduled_date <= todayStr);

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <Card className="bg-black/45 border-2 border-primary rounded-none overflow-hidden">
          <CardHeader className="border-b border-primary/40 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="font-arcade text-xs text-primary/80">PREMIUM LEARNER LOOP</div>
                <CardTitle className="font-arcade text-lg text-white">
                  BRAIN IDENTIFIES. SCHOLAR RESEARCHES. TUTOR TEACHES.
                </CardTitle>
                <div className="font-terminal text-sm text-muted-foreground max-w-3xl">
                  This dashboard is now the control surface for the three-part system. Brain models how you learn best,
                  Scholar investigates what should change, and Tutor executes the live study session.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-none border-primary/40 font-arcade text-xs" onClick={() => setShowOnboarding(true)}>
                  FIRST-RUN SETUP
                </Button>
                <Button variant="outline" className="rounded-none border-primary/40 font-arcade text-xs" onClick={() => setShowDataRights(true)}>
                  DATA RIGHTS
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 grid gap-4 lg:grid-cols-3">
            <div className="border border-primary/30 bg-black/35 p-4 space-y-3 rounded-none">
              <div className="flex items-center justify-between">
                <div className="font-arcade text-xs text-primary">BRAIN</div>
                <Badge variant="outline" className="rounded-none text-[10px] border-primary/40">
                  {brainProfile?.hybridArchetype?.confidence?.toUpperCase() || "LOW"} CONFIDENCE
                </Badge>
              </div>
              <div className="font-terminal text-sm text-white">
                {brainProfile?.hybridArchetype?.label || "Emerging learner pattern"}
              </div>
              <div className="font-terminal text-xs text-muted-foreground">
                {brainProfile?.profileSummary?.headline || "Brain is still building a stable learner-model summary from study telemetry."}
              </div>
              <div className="font-terminal text-[11px] text-muted-foreground">
                Next: {brainProfile?.profileSummary?.nextBestActions?.[0] || "Collect more clean telemetry and calibration answers."}
              </div>
              <Link href="/brain">
                <Button variant="ghost" size="sm" className="rounded-none font-arcade text-xs">
                  OPEN BRAIN
                </Button>
              </Link>
            </div>

            <div className="border border-secondary/30 bg-black/35 p-4 space-y-3 rounded-none">
              <div className="flex items-center justify-between">
                <div className="font-arcade text-xs text-primary">SCHOLAR</div>
                <Badge variant="outline" className="rounded-none text-[10px] border-secondary/40">
                  {scholarQuestions.length} OPEN QUESTION{scholarQuestions.length === 1 ? "" : "S"}
                </Badge>
              </div>
              <div className="font-terminal text-sm text-white">
                {scholarInvestigations[0]?.title || "No active investigation"}
              </div>
              <div className="font-terminal text-xs text-muted-foreground">
                {scholarInvestigations[0]?.rationale || "Scholar has not been given a new investigation yet."}
              </div>
              <div className="font-terminal text-[11px] text-muted-foreground">
                Pending learner input: {scholarQuestions[0]?.question || "None right now."}
              </div>
              <Link href="/scholar">
                <Button variant="ghost" size="sm" className="rounded-none font-arcade text-xs">
                  OPEN SCHOLAR
                </Button>
              </Link>
            </div>

            <div className="border border-primary/30 bg-black/35 p-4 space-y-3 rounded-none">
              <div className="flex items-center justify-between">
                <div className="font-arcade text-xs text-primary">TUTOR</div>
                <Badge variant="outline" className="rounded-none text-[10px] border-primary/40">
                  {hasStudiedToday ? "ACTIVE TODAY" : "READY"}
                </Badge>
              </div>
              <div className="font-terminal text-sm text-white">
                {currentCourse?.name || "Pick the next study target"}
              </div>
              <div className="font-terminal text-xs text-muted-foreground">
                {hasStudiedToday
                  ? `${todaySessionCount} session${todaySessionCount === 1 ? "" : "s"} today • ${todayMinutes} minutes logged`
                  : "No study sessions logged today yet."}
              </div>
              <div className="font-terminal text-[11px] text-muted-foreground">
                Next action: {duePlannerTasks[0]?.title || "Launch Tutor from the current course and run the next focused block."}
              </div>
              <Link href="/tutor">
                <Button variant="ghost" size="sm" className="rounded-none font-arcade text-xs">
                  OPEN TUTOR
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/35 border border-secondary/40 rounded-none">
          <CardHeader className="border-b border-secondary/20 p-4">
            <CardTitle className="font-arcade text-sm text-primary flex items-center justify-between">
              <span>VALUE PROOF</span>
              <span className="font-terminal text-[11px] text-muted-foreground">
                Track the signals that make this product worth trusting and selling.
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 md:grid-cols-4">
            <div className="border border-primary/20 bg-black/30 p-3 space-y-1">
              <div className="font-arcade text-[11px] text-primary">DIAGNOSIS</div>
              <div className="font-terminal text-lg text-white">
                {productAnalytics?.activation?.brainProfileReady ? "READY" : "BUILDING"}
              </div>
              <div className="font-terminal text-[11px] text-muted-foreground">
                {brainProfile?.hybridArchetype?.label || "No stable archetype yet"}
              </div>
            </div>
            <div className="border border-primary/20 bg-black/30 p-3 space-y-1">
              <div className="font-arcade text-[11px] text-primary">SCHOLAR RESPONSE</div>
              <div className="font-terminal text-lg text-white">
                {Math.round((productAnalytics?.engagement?.scholarQuestionResponseRate || 0) * 100)}%
              </div>
              <div className="font-terminal text-[11px] text-muted-foreground">
                Learner-question response rate
              </div>
            </div>
            <div className="border border-primary/20 bg-black/30 p-3 space-y-1">
              <div className="font-arcade text-[11px] text-primary">TUTOR FOLLOW-THROUGH</div>
              <div className="font-terminal text-lg text-white">
                {Math.round((productAnalytics?.engagement?.tutorCompletionRate30d || 0) * 100)}%
              </div>
              <div className="font-terminal text-[11px] text-muted-foreground">
                Session completion rate in the last 30 days
              </div>
            </div>
            <div className="border border-primary/20 bg-black/30 p-3 space-y-1">
              <div className="font-arcade text-[11px] text-primary">SELF-UNDERSTANDING</div>
              <div className="font-terminal text-lg text-white">
                {productAnalytics?.valueProof?.betterSelfUnderstanding || 0}
              </div>
              <div className="font-terminal text-[11px] text-muted-foreground">
                Calibration + Scholar answer actions captured
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Zone 1 — Action ═══ */}

        {/* Study Wheel */}
        <Card className="bg-black/40 border-2 border-primary rounded-none">
            <CardHeader className="border-b border-primary/50 p-4">
              <CardTitle className="font-arcade text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  STUDY_WHEEL
                </div>
                <div className="flex items-center gap-2 bg-black/40 border border-secondary px-3 py-1" data-testid="streak-display">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="font-arcade text-sm text-white" data-testid="text-streak">{streakData?.currentStreak || 0}</span>
                  <span className="font-terminal text-xs text-muted-foreground">DAY STREAK</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {courses.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <p className="font-terminal text-muted-foreground">No courses added yet. Add courses to start the study wheel.</p>
                  <Dialog open={showAddCourse} onOpenChange={setShowAddCourse}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="rounded-none border-primary font-arcade" data-testid="button-add-first-course">
                        <Plus className="w-4 h-4 mr-2" />
                        ADD_COURSE
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-black border-2 border-primary rounded-none">
                      <DialogHeader>
                        <DialogTitle className="font-arcade">ADD_NEW_COURSE</DialogTitle>
                        <DialogDescription className="sr-only">Enter course details to add a new course.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input
                          placeholder="Course name (e.g., Anatomy)"
                          value={newCourseName}
                          onChange={(e) => setNewCourseName(e.target.value)}
                          className="rounded-none border-secondary bg-black font-terminal"
                          data-testid="input-course-name"
                        />
                        <Input
                          placeholder="Course number (e.g., PHTH 5301)"
                          value={newCourseCode}
                          onChange={(e) => setNewCourseCode(e.target.value)}
                          className="rounded-none border-secondary bg-black font-terminal"
                          data-testid="input-course-code"
                        />
                        <Button
                          onClick={handleAddCourse}
                          disabled={!newCourseName.trim() || addCourseMutation.isPending}
                          className="w-full rounded-none font-arcade"
                          data-testid="button-confirm-add-course"
                        >
                          ADD
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Current Course Display */}
                  <div className="text-center space-y-1">
                    <p className="font-terminal text-muted-foreground text-sm">▶ NEXT UP</p>
                    <p className="font-arcade text-2xl text-primary" data-testid="text-current-course">
                      {currentCourse?.name || "LOADING..."}
                    </p>
                  </div>

                  {/* Wheel Visualization */}
                  <div className="flex flex-col gap-1 max-w-md mx-auto">
                    {courses.map((course, idx) => (
                      <div
                        key={course.id}
                        className={`flex items-center justify-between px-4 py-2 border transition-all duration-300 ${
                          idx === 0
                            ? "border-primary bg-primary/20 scale-105"
                            : "border-secondary/30 opacity-70 hover:opacity-100"
                        }`}
                        style={{
                          transform: idx === 0 ? 'scale(1.02)' : `scale(${1 - idx * 0.02})`,
                          opacity: idx === 0 ? 1 : Math.max(0.4, 1 - idx * 0.15),
                        }}
                        data-testid={`wheel-course-${course.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`font-arcade text-xs w-6 h-6 flex items-center justify-center ${idx === 0 ? 'bg-primary text-black' : 'bg-secondary/30 text-muted-foreground'}`}>
                            {idx + 1}
                          </span>
                          <span className={`font-terminal ${idx === 0 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                            {course.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditCourse({ id: course.id, name: course.name, code: course.code })}
                            className="p-1 hover:text-primary transition-colors text-muted-foreground"
                            data-testid={`button-edit-course-${course.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCourseToDelete({ id: course.id, name: course.name })}
                            className="p-1 hover:text-destructive transition-colors text-muted-foreground"
                            data-testid={`button-delete-course-${course.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <Dialog open={showAddCourse} onOpenChange={setShowAddCourse}>
                      <DialogTrigger asChild>
                        <button
                          className="flex items-center justify-center px-4 py-2 border border-dashed border-secondary/50 text-muted-foreground hover:border-primary hover:text-primary transition-colors font-terminal"
                          data-testid="button-add-course-inline"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          ADD COURSE
                        </button>
                      </DialogTrigger>
                      <DialogContent className="bg-black border-2 border-primary rounded-none">
                        <DialogHeader>
                          <DialogTitle className="font-arcade">ADD_NEW_COURSE</DialogTitle>
                          <DialogDescription className="sr-only">Enter course details to add a new course.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <Input
                            placeholder="Course name (e.g., Anatomy)"
                            value={newCourseName}
                            onChange={(e) => setNewCourseName(e.target.value)}
                            className="rounded-none border-secondary bg-black font-terminal"
                            data-testid="input-course-name-inline"
                          />
                          <Input
                            placeholder="Course number (e.g., PHTH 5301)"
                            value={newCourseCode}
                            onChange={(e) => setNewCourseCode(e.target.value)}
                            className="rounded-none border-secondary bg-black font-terminal"
                            data-testid="input-course-code-inline"
                          />
                          <Button
                            onClick={handleAddCourse}
                            disabled={!newCourseName.trim() || addCourseMutation.isPending}
                            className="w-full rounded-none font-arcade"
                            data-testid="button-confirm-add-course-inline"
                          >
                            ADD
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Edit Course Dialog */}
                  <Dialog
                    open={!!editingCourse}
                    onOpenChange={(open) => {
                      if (!open) {
                        setEditingCourse(null);
                        setEditCourseName("");
                        setEditCourseCode("");
                      }
                    }}
                  >
                    <DialogContent className="bg-black border-2 border-primary rounded-none">
                      <DialogHeader>
                        <DialogTitle className="font-arcade">EDIT_COURSE</DialogTitle>
                        <DialogDescription className="sr-only">Modify the course details.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input
                          placeholder="Course name"
                          value={editCourseName}
                          onChange={(e) => setEditCourseName(e.target.value)}
                          className="rounded-none border-secondary bg-black font-terminal"
                          data-testid="input-edit-course-name"
                        />
                        <Input
                          placeholder="Course number (e.g., PHTH 5301)"
                          value={editCourseCode}
                          onChange={(e) => setEditCourseCode(e.target.value)}
                          className="rounded-none border-secondary bg-black font-terminal"
                          data-testid="input-edit-course-code"
                        />
                        <Button
                          onClick={handleEditCourse}
                          disabled={!editCourseName.trim() || editCourseMutation.isPending}
                          className="w-full rounded-none font-arcade"
                          data-testid="button-confirm-edit-course"
                        >
                          SAVE
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Delete Confirmation Dialog */}
                  <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
                    <AlertDialogContent className="bg-black border-2 border-destructive rounded-none">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-arcade text-destructive">DELETE_COURSE</AlertDialogTitle>
                        <AlertDialogDescription className="font-terminal text-muted-foreground">
                          Are you sure you want to delete <span className="text-primary font-bold">{courseToDelete?.name}</span>?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-none border-secondary font-arcade text-xs">
                          CANCEL
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleConfirmDelete}
                          className="rounded-none bg-destructive hover:bg-destructive/80 font-arcade text-xs text-white"
                        >
                          DELETE
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Session Completion */}
                  {!isCompleting ? (
                    <div className="max-w-md mx-auto">
                      <Button
                        onClick={() => setIsCompleting(true)}
                        className="w-full rounded-none font-arcade px-8 py-6 text-lg bg-primary hover:bg-primary/80 transition-colors"
                        disabled={!currentCourse}
                        data-testid="button-start-session"
                      >
                        <Check className="w-5 h-5 mr-2" />
                        COMPLETE SESSION
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 p-4 border border-primary/50 bg-primary/5">
                      <p className="font-terminal text-sm text-muted-foreground">Enter minutes studied:</p>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="1"
                          value={minutes}
                          onChange={(e) => setMinutes(e.target.value)}
                          placeholder="30"
                          className="w-24 rounded-none border-primary bg-black text-center font-arcade text-xl"
                          data-testid="input-minutes"
                          autoFocus
                        />
                        <span className="font-terminal text-muted-foreground">MIN</span>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsCompleting(false);
                            setMinutes("");
                          }}
                          className="rounded-none font-arcade border-secondary"
                          data-testid="button-cancel-session"
                        >
                          CANCEL
                        </Button>
                        <Button
                          onClick={handleCompleteSession}
                          disabled={!minutes || parseInt(minutes) < 1 || completeSessionMutation.isPending}
                          className="rounded-none font-arcade bg-primary"
                          data-testid="button-log-session"
                        >
                          LOG & ROTATE
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        {/* Stats + Focus — side by side */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Today's Activity */}
          <Card className="bg-black/40 border-2 border-primary rounded-none">
            <CardHeader className="border-b border-primary/50 p-4">
              <CardTitle className="font-arcade text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                TODAY
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-terminal text-muted-foreground">Sessions</span>
                <span className="font-arcade text-xl text-white" data-testid="text-today-sessions">{todaySessionCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-terminal text-muted-foreground">Minutes</span>
                <span className="font-arcade text-xl text-primary" data-testid="text-today-minutes">{todayMinutes}</span>
              </div>
              <div className={`p-2 border ${hasStudiedToday ? "border-success/50 bg-success/10" : "border-urgent/50 bg-urgent/10"}`}>
                <span className={`font-terminal text-xs ${hasStudiedToday ? "text-success" : "text-urgent"}`} data-testid="text-today-status">
                  {hasStudiedToday ? "STREAK MAINTAINED" : "NO SESSIONS TODAY - STUDY NOW!"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Today's Focus */}
          <Card className="bg-black/40 border-2 border-secondary rounded-none card-hover-fx">
            <CardHeader className="border-b border-secondary/50">
              <CardTitle className="font-arcade text-xs flex items-center justify-between">
                <span>TODAY'S FOCUS</span>
                <Badge variant="outline" className="rounded-none text-xs">
                  {duePlannerTasks.length} tasks
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {duePlannerTasks.length === 0 ? (
                <p className="font-terminal text-xs text-muted-foreground">No tasks due today</p>
              ) : (
                <ul className="space-y-2 mb-4">
                  {duePlannerTasks
                    .slice(0, 3)
                    .map(task => (
                      <li key={task.id} className="font-terminal text-xs flex items-center gap-2">
                        <Circle className="w-2 h-2 text-primary" />
                        <span className="truncate">{task.anchor_text || task.notes || 'Untitled task'}</span>
                      </li>
                    ))}
                </ul>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-none font-arcade text-xs border-primary"
                onClick={() => window.location.href = '/brain'}
              >
                Open Brain →
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ═══ Zone 2 — Awareness ═══ */}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Deadlines */}
          <Card className="bg-black/40 border-2 border-primary rounded-none">
            <CardHeader className="border-b border-primary/50 space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="font-arcade text-sm flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  DEADLINES
                </CardTitle>
                <Dialog open={showAddDeadline} onOpenChange={setShowAddDeadline}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-none border-primary hover:bg-primary/20 font-arcade text-xs h-7 px-2">
                    <Plus className="w-3 h-3 mr-1" />
                    ADD
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black border-2 border-primary rounded-none">
                  <DialogHeader>
                    <DialogTitle className="font-arcade">ADD_DEADLINE</DialogTitle>
                    <DialogDescription className="sr-only">Add a new academic deadline.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      placeholder="Title (e.g., Midterm Exam)"
                      value={newDeadline.title}
                      onChange={(e) => setNewDeadline({ ...newDeadline, title: e.target.value })}
                      className="rounded-none border-secondary bg-black font-terminal"
                    />
                    <Select
                      value={newDeadline.type}
                      onValueChange={(value) => setNewDeadline({ ...newDeadline, type: value as InsertAcademicDeadline["type"] })}
                    >
                      <SelectTrigger className="rounded-none border-secondary bg-black font-terminal">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-secondary rounded-none">
                        <SelectItem value="assignment">📋 Assignment</SelectItem>
                        <SelectItem value="quiz">❓ Quiz</SelectItem>
                        <SelectItem value="exam">📝 Exam</SelectItem>
                        <SelectItem value="project">📂 Project</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={newDeadline.course || "none"}
                      onValueChange={(value) => setNewDeadline({ ...newDeadline, course: value === "none" ? "" : value })}
                    >
                      <SelectTrigger className="rounded-none border-secondary bg-black font-terminal">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-secondary rounded-none">
                        <SelectItem value="none">No course</SelectItem>
                        {courses.map(c => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={newDeadline.dueDate}
                      onChange={(e) => setNewDeadline({ ...newDeadline, dueDate: e.target.value })}
                      className="rounded-none border-secondary bg-black font-terminal"
                    />
                    <Input
                      placeholder="Notes (optional)"
                      value={newDeadline.notes}
                      onChange={(e) => setNewDeadline({ ...newDeadline, notes: e.target.value })}
                      className="rounded-none border-secondary bg-black font-terminal"
                    />
                    <Button
                      onClick={handleAddDeadline}
                      disabled={!newDeadline.title?.trim() || !newDeadline.dueDate || createDeadlineMutation.isPending}
                      className="w-full rounded-none font-arcade"
                    >
                      ADD_DEADLINE
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
              <Select value={deadlineCourseFilter} onValueChange={setDeadlineCourseFilter}>
                <SelectTrigger className="rounded-none border-secondary bg-black/60 font-terminal text-xs h-7 w-full pl-3 pr-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-secondary rounded-none min-w-[200px]">
                  <SelectItem value="all">ALL COURSES</SelectItem>
                  {deadlineCourseNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-4 max-h-72 overflow-y-auto">
              {academicDeadlines.length === 0 ? (
                <p className="font-terminal text-muted-foreground text-center py-8">
                  No deadlines yet. Add assignments, quizzes, and exams to track.
                </p>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {sortedDeadlines.map((deadline) => {
                      const urgency = getDeadlineUrgency(deadline.dueDate);
                      const dueDate = new Date(deadline.dueDate);
                      return (
                        <div
                          key={deadline.id}
                          className={cn(
                            "flex items-center gap-3 p-3 border transition-all",
                            deadline.completed
                              ? "border-secondary/20 opacity-50"
                              : getUrgencyStyles(urgency)
                          )}
                        >
                          <button
                            onClick={() => toggleDeadlineMutation.mutate(deadline.id)}
                            className="flex-shrink-0 p-0.5"
                          >
                            {deadline.completed ? (
                              <CheckCircle2 className="w-6 h-6 text-success" />
                            ) : (
                              <Circle className="w-6 h-6 text-primary/70 hover:text-primary transition-colors" />
                            )}
                          </button>
                          <span className="text-lg flex-shrink-0">{getTypeIcon(deadline.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "font-terminal text-sm",
                              deadline.completed && "line-through"
                            )}>
                              {deadline.title}
                            </div>
                            {resolveCourse(deadline.course) && (
                              <div className="font-terminal text-xs text-muted-foreground">
                                {resolveCourse(deadline.course)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={cn(
                                "px-2 py-1 font-terminal text-xs font-bold text-white",
                                deadline.completed ? "bg-secondary/50" :
                                urgency === "overdue" ? "bg-destructive" :
                                urgency === "today" ? "bg-urgent" :
                                urgency === "tomorrow" ? "bg-warning text-warning-foreground" :
                                urgency === "soon" ? "bg-destructive/60" :
                                "bg-destructive/40"
                              )}
                            >
                              {isValid(dueDate) ? format(dueDate, "MMM d") : "No date"}
                            </span>
                            <button
                              onClick={() => deleteDeadlineMutation.mutate(deadline.id)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Courses */}
          <Card className="bg-black/40 border-2 border-primary rounded-none">
            <CardHeader className="border-b border-primary/50 p-4">
              <CardTitle className="font-arcade text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                COURSES
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-64 overflow-y-auto">
              {courses.length === 0 ? (
                <p className="font-terminal text-muted-foreground text-center py-4">No courses yet</p>
              ) : (
                <div className="space-y-3">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between p-2 border border-secondary/30 hover:border-secondary transition-colors"
                      data-testid={`summary-course-${course.id}`}
                    >
                      <span className="font-terminal text-white">{course.name}</span>
                      <div className="flex items-center gap-4 text-sm font-terminal">
                        <span className="text-muted-foreground">
                          <span className="text-white font-bold" data-testid={`course-sessions-${course.id}`}>{course.totalSessions}</span> sess
                        </span>
                        <span className="text-muted-foreground">
                          <span className={cn("font-bold", course.totalMinutes > 0 ? "text-success" : "text-muted-foreground")} data-testid={`course-minutes-${course.id}`}>{course.totalMinutes}</span> min
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weakness Queue */}
        {weaknessQueue.length > 0 ? (
          <Card className="bg-black/40 border-2 border-primary rounded-none">
            <CardHeader className="border-b border-primary/50 p-4">
              <CardTitle className="font-arcade text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                WEAKNESS_QUEUE
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {weaknessQueue.map((item) => (
                  <div
                    key={item.id}
                    className="px-3 py-1 border border-orange-500/50 bg-orange-500/10 font-terminal text-sm text-orange-300"
                    data-testid={`weakness-${item.id}`}
                  >
                    {item.topic}
                    {item.reason && <span className="text-xs text-muted-foreground ml-2">({item.reason})</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-black/40 border border-secondary/30 rounded-none">
            <CardContent className="p-3 flex items-center justify-center gap-2">
              <AlertTriangle className="w-3 h-3 text-muted-foreground" />
              <span className="font-terminal text-xs text-muted-foreground">
                No flagged weaknesses — topics you struggle with will appear here.
              </span>
            </CardContent>
          </Card>
        )}

        {/* ═══ Zone 3 — Planning ═══ */}

        <PlannerKanban tasks={plannerQueue} />

        {/* Tasks (Google) */}
        <Card className="bg-black/40 border-2 border-primary rounded-none">
          <CardHeader className="border-b border-primary/50 p-4">
            <CardTitle className="font-arcade text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4" />
                TASKS
              </div>
              {googleTaskLists.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentTaskListIndex(prev => (prev - 1 + googleTaskLists.length) % googleTaskLists.length)}
                    className="p-1 hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-terminal text-xs text-white bg-secondary/40 border border-secondary/60 px-2 py-0.5 min-w-[80px] text-center">
                    {currentTaskList?.title || "Tasks"}
                  </span>
                  <button
                    onClick={() => setCurrentTaskListIndex(prev => (prev + 1) % googleTaskLists.length)}
                    className="p-1 hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {googleTaskLists.length === 0 ? (
              <p className="font-terminal text-muted-foreground text-center py-4">
                Connect Google to see your tasks.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Add Task Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder={currentTaskList ? "Add task..." : "Loading task lists..."}
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGoogleTask()}
                    disabled={!currentTaskList}
                    className="rounded-none border-secondary bg-black font-terminal text-sm h-8"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddGoogleTask}
                    disabled={!currentTaskList || !newTaskTitle.trim() || createGoogleTaskMutation.isPending}
                    className="rounded-none font-arcade text-xs h-8 px-3"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                <div className="max-h-52 overflow-y-auto pr-1">
                  {currentListTasks.length === 0 ? (
                    <p className="font-terminal text-muted-foreground text-center py-4 text-sm">
                      No tasks in this list.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {incompleteTasks.map((task: GoogleTask) => {
                        const dueLabel = formatTaskDue(task.due);
                        const isOverdue = task.due && isPast(new Date(task.due)) && !isToday(new Date(task.due));
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 p-2 border border-secondary/30 hover:border-primary/50 transition-colors group"
                          >
                            <button
                              onClick={() => toggleGoogleTaskMutation.mutate(task)}
                              className="flex-shrink-0 p-0.5 hover:bg-primary/20 rounded-none"
                            >
                              <Circle className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className="font-terminal text-sm text-white block truncate">{task.title}</span>
                              {(dueLabel || task.notes) && (
                                <div className="flex items-center gap-2 mt-0.5">
                                  {dueLabel && (
                                    <span className={cn(
                                      "font-terminal text-xs",
                                      isOverdue ? "text-destructive" : "text-muted-foreground"
                                    )}>
                                      {dueLabel}
                                    </span>
                                  )}
                                  {task.notes && (
                                    <span className="font-terminal text-xs text-muted-foreground truncate max-w-[120px]">
                                      {task.notes}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => startEditTask(task)}
                              className="p-1 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteGoogleTaskMutation.mutate(task)}
                              className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                      {completedTasks.length > 0 && (
                        <div className="pt-2 border-t border-secondary/20 mt-2">
                          <p className="font-terminal text-xs text-muted-foreground mb-2">Completed ({completedTasks.length})</p>
                          {completedTasks.slice(0, 5).map((task: GoogleTask) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-2 p-2 opacity-50 group hover:opacity-75 transition-opacity"
                            >
                              <button
                                onClick={() => toggleGoogleTaskMutation.mutate(task)}
                                className="flex-shrink-0 p-0.5 hover:bg-primary/20 rounded-none"
                              >
                                <CheckCircle2 className="w-4 h-4 text-success" />
                              </button>
                              <span className="font-terminal text-sm text-muted-foreground line-through flex-1 truncate">{task.title}</span>
                              <button
                                onClick={() => deleteGoogleTaskMutation.mutate(task)}
                                className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
          <DialogContent className="bg-black border-2 border-primary rounded-none max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-arcade">FIRST_RUN_SETUP</DialogTitle>
              <DialogDescription className="font-terminal text-xs text-muted-foreground">
                Give Brain and Scholar enough context to start from your real goal instead of guessing.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="font-terminal text-xs text-muted-foreground block mb-1">Main goal</label>
                <Input
                  value={onboardingGoal}
                  onChange={(event) => setOnboardingGoal(event.target.value)}
                  placeholder="What are you trying to get better at right now?"
                  className="rounded-none border-secondary bg-black font-terminal"
                />
              </div>
              <div>
                <label className="font-terminal text-xs text-muted-foreground block mb-1">Biggest friction</label>
                <Textarea
                  value={onboardingFriction}
                  onChange={(event) => setOnboardingFriction(event.target.value)}
                  placeholder="What usually breaks your learning loop: time, confusion, confidence drift, weak notes, bad pacing?"
                  className="rounded-none border-secondary bg-black font-terminal min-h-[96px]"
                />
              </div>
              <div>
                <label className="font-terminal text-xs text-muted-foreground block mb-1">Current tools / workflow</label>
                <Input
                  value={onboardingTools}
                  onChange={(event) => setOnboardingTools(event.target.value)}
                  placeholder="Obsidian, Anki, lecture PDFs, Blackboard, handwritten notes, etc."
                  className="rounded-none border-secondary bg-black font-terminal"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="font-terminal text-[11px] text-muted-foreground max-w-lg">
                  Completing setup saves these answers locally and starts a Scholar investigation so the system has a grounded first hypothesis.
                </div>
                <Button
                  onClick={() => {
                    void completeOnboarding();
                  }}
                  disabled={onboardingBusy}
                  className="rounded-none font-arcade"
                >
                  {onboardingBusy ? "INITIALIZING..." : "INITIALIZE SYSTEM"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showDataRights} onOpenChange={setShowDataRights}>
          <DialogContent className="bg-black border-2 border-primary rounded-none max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-arcade">DATA_RIGHTS</DialogTitle>
              <DialogDescription className="font-terminal text-xs text-muted-foreground">
                Export what Brain and Scholar know, and see how personalization works before you trust it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="border border-primary/20 bg-black/40 p-3 rounded-none space-y-2">
                  <div className="font-arcade text-xs text-primary">BRAIN EXPORT</div>
                  <div className="font-terminal text-xs text-muted-foreground">
                    Profile summary, claims, open calibration questions, and profile history.
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-none font-arcade text-xs border-primary/40"
                    onClick={() => {
                      void downloadJson("brain-profile-export.json", api.brain.exportProfile);
                    }}
                  >
                    EXPORT BRAIN JSON
                  </Button>
                </div>
                <div className="border border-primary/20 bg-black/40 p-3 rounded-none space-y-2">
                  <div className="font-arcade text-xs text-primary">SCHOLAR EXPORT</div>
                  <div className="font-terminal text-xs text-muted-foreground">
                    Investigations, learner questions, findings, and citation-backed research history.
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-none font-arcade text-xs border-primary/40"
                    onClick={() => {
                      void downloadJson("scholar-research-export.json", api.scholar.exportResearch);
                    }}
                  >
                    EXPORT SCHOLAR JSON
                  </Button>
                </div>
                <div className="border border-primary/20 bg-black/40 p-3 rounded-none space-y-2">
                  <div className="font-arcade text-xs text-primary">OUTCOME REPORT</div>
                  <div className="font-terminal text-xs text-muted-foreground">
                    Learner-facing Brain / Scholar / Tutor proof report with engagement and trust metrics.
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-none font-arcade text-xs border-primary/40"
                    disabled={!outcomeReportsEnabled}
                    onClick={() => {
                      void downloadJson("brain-scholar-tutor-outcome-report.json", api.product.getOutcomeReport);
                    }}
                  >
                    EXPORT OUTCOME JSON
                  </Button>
                </div>
              </div>
              <div className="border border-primary/20 bg-black/40 p-3 rounded-none space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-arcade text-xs text-primary">PRIVACY + RETENTION</div>
                    <div className="font-terminal text-xs text-muted-foreground">
                      Configure how much secondary evidence can shape Brain and Scholar in this workspace.
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-none font-arcade text-xs border-primary/40"
                    onClick={() => updatePrivacyMutation.mutate()}
                    disabled={updatePrivacyMutation.isPending}
                  >
                    {updatePrivacyMutation.isPending ? "SAVING..." : "SAVE SETTINGS"}
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="border border-primary/10 bg-black/30 p-3 rounded-none flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-terminal text-xs text-white">Tier 2 personalization</div>
                      <div className="font-terminal text-[11px] text-muted-foreground">
                        Allow Brain to use supporting vault, library, and calendar signals.
                      </div>
                    </div>
                    <Switch
                      checked={privacyDraft.allowTier2Signals}
                      onCheckedChange={(checked) =>
                        setPrivacyDraft((prev) => ({ ...prev, allowTier2Signals: checked }))
                      }
                    />
                  </label>
                  <label className="border border-primary/10 bg-black/30 p-3 rounded-none flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-terminal text-xs text-white">Vault signals</div>
                      <div className="font-terminal text-[11px] text-muted-foreground">
                        Let Brain use note-quality and vault evidence as a secondary signal.
                      </div>
                    </div>
                    <Switch
                      checked={privacyDraft.allowVaultSignals}
                      onCheckedChange={(checked) =>
                        setPrivacyDraft((prev) => ({ ...prev, allowVaultSignals: checked }))
                      }
                    />
                  </label>
                  <label className="border border-primary/10 bg-black/30 p-3 rounded-none flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-terminal text-xs text-white">Calendar signals</div>
                      <div className="font-terminal text-[11px] text-muted-foreground">
                        Let Brain use follow-through timing and schedule adherence as context.
                      </div>
                    </div>
                    <Switch
                      checked={privacyDraft.allowCalendarSignals}
                      onCheckedChange={(checked) =>
                        setPrivacyDraft((prev) => ({ ...prev, allowCalendarSignals: checked }))
                      }
                    />
                  </label>
                  <label className="border border-primary/10 bg-black/30 p-3 rounded-none flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-terminal text-xs text-white">Scholar personalization</div>
                      <div className="font-terminal text-[11px] text-muted-foreground">
                        Let Scholar use Brain evidence and learner answers for research strategy.
                      </div>
                    </div>
                    <Switch
                      checked={privacyDraft.allowScholarPersonalization}
                      onCheckedChange={(checked) =>
                        setPrivacyDraft((prev) => ({ ...prev, allowScholarPersonalization: checked }))
                      }
                    />
                  </label>
                  <label className="border border-primary/10 bg-black/30 p-3 rounded-none flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-terminal text-xs text-white">Outcome reports</div>
                      <div className="font-terminal text-[11px] text-muted-foreground">
                        Allow export of learner-facing Brain / Scholar / Tutor proof reports.
                      </div>
                    </div>
                    <Switch
                      checked={privacyDraft.allowOutcomeReports}
                      onCheckedChange={(checked) =>
                        setPrivacyDraft((prev) => ({ ...prev, allowOutcomeReports: checked }))
                      }
                    />
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-center">
                  <div className="space-y-1">
                    <div className="font-terminal text-xs text-white">Retention window (days)</div>
                    <div className="font-terminal text-[11px] text-muted-foreground">
                      Sets how long this workspace should keep premium personalization settings before review.
                    </div>
                  </div>
                  <Input
                    type="number"
                    min={30}
                    max={3650}
                    value={privacyDraft.retentionDays}
                    onChange={(e) =>
                      setPrivacyDraft((prev) => ({
                        ...prev,
                        retentionDays: Math.max(30, Number(e.target.value || 180)),
                      }))
                    }
                    className="rounded-none border-secondary bg-black font-terminal"
                  />
                </div>
              </div>
              <div className="border border-secondary/20 bg-black/40 p-3 rounded-none space-y-2">
                <div className="font-arcade text-xs text-primary">WHAT PERSONALIZATION USES</div>
                <ul className="font-terminal text-xs text-muted-foreground space-y-1">
                  <li>- Brain uses study telemetry, mastery evidence, and calibration feedback to build claims about how you learn.</li>
                  <li>- Scholar uses Brain evidence plus cited research and your answers to design better study strategies.</li>
                  <li>- Tutor only consumes a bounded Scholar strategy envelope. It does not rewrite chain rules or truth policy.</li>
                </ul>
              </div>
              <div className="border border-destructive/20 bg-black/40 p-3 rounded-none space-y-2">
                <div className="font-arcade text-xs text-primary">RESET PERSONALIZATION</div>
                <div className="font-terminal text-xs text-muted-foreground">
                  Clear Brain profile snapshots, Scholar research workspace history, and stored Tutor strategy feedback so the learner model can rebuild from raw study evidence.
                </div>
                <Button
                  variant="outline"
                  className="rounded-none font-arcade text-xs border-destructive/40 text-destructive"
                  disabled={resetPersonalizationMutation.isPending}
                  onClick={() => {
                    if (window.confirm("Reset Brain + Scholar personalization data for this workspace?")) {
                      resetPersonalizationMutation.mutate();
                    }
                  }}
                >
                  {resetPersonalizationMutation.isPending ? "RESETTING..." : "RESET PERSONALIZATION"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
          <DialogContent className="bg-black border-2 border-primary rounded-none">
            <DialogHeader>
              <DialogTitle className="font-arcade">EDIT_TASK</DialogTitle>
              <DialogDescription className="sr-only">Edit the selected task.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="font-terminal text-xs text-muted-foreground block mb-1">Title</label>
                <Input
                  placeholder="Task title"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  className="rounded-none border-secondary bg-black font-terminal"
                  autoFocus
                />
              </div>
              <div>
                <label className="font-terminal text-xs text-muted-foreground block mb-1">Notes</label>
                <Input
                  placeholder="Add notes..."
                  value={editTaskNotes}
                  onChange={(e) => setEditTaskNotes(e.target.value)}
                  className="rounded-none border-secondary bg-black font-terminal"
                />
              </div>
              <div>
                <label className="font-terminal text-xs text-muted-foreground block mb-1">Due Date</label>
                <Input
                  type="date"
                  value={editTaskDue}
                  onChange={(e) => setEditTaskDue(e.target.value)}
                  className="rounded-none border-secondary bg-black font-terminal"
                />
              </div>
              <div>
                <label className="font-terminal text-xs text-muted-foreground block mb-1">Add to Deadlines</label>
                <Select
                  value={editTaskDeadlineType}
                  onValueChange={(value) => setEditTaskDeadlineType(value as "none" | "assignment" | "quiz" | "exam")}
                >
                  <SelectTrigger className="rounded-none border-secondary bg-black font-terminal">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-secondary rounded-none">
                    <SelectItem value="none">NONE - Don't add to deadlines</SelectItem>
                    <SelectItem value="assignment">📋 ASSIGNMENT</SelectItem>
                    <SelectItem value="quiz">❓ QUIZ</SelectItem>
                    <SelectItem value="exam">📝 EXAM</SelectItem>
                  </SelectContent>
                </Select>
                {editTaskDeadlineType !== "none" && !editTaskDue && (
                  <p className="font-terminal text-xs text-orange-400 mt-1">⚠ Set a due date to add to deadlines</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingTask(null)}
                  className="flex-1 rounded-none font-arcade border-secondary"
                >
                  CANCEL
                </Button>
                <Button
                  onClick={handleEditTask}
                  disabled={!editTaskTitle.trim() || updateGoogleTaskMutation.isPending}
                  className="flex-1 rounded-none font-arcade"
                >
                  SAVE
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
