import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Brain = lazy(() => import("@/pages/brain"));
const CalendarPage = lazy(() => import("@/pages/calendar"));
const Scholar = lazy(() => import("@/pages/scholar"));
const Tutor = lazy(() => import("@/pages/tutor"));
const Methods = lazy(() => import("@/pages/methods"));
const NotFound = lazy(() => import("@/pages/not-found"));

const LoadingFallback = () => (
  <div className="p-4 font-terminal text-xs text-muted-foreground">
    Loading...
  </div>
);

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/" component={Dashboard}/>
        <Route path="/brain" component={Brain}/>
        <Route path="/calendar" component={CalendarPage}/>
        <Route path="/scholar" component={Scholar}/>
        <Route path="/tutor" component={Tutor}/>
        <Route path="/methods" component={Methods}/>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
