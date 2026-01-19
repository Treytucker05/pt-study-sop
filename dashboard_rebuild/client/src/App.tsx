import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Brain from "@/pages/brain";
import CalendarPage from "@/pages/calendar";
import Scholar from "@/pages/scholar";
import Tutor from "@/pages/tutor";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/brain" component={Brain}/>
      <Route path="/calendar" component={CalendarPage}/>
      <Route path="/scholar" component={Scholar}/>
      <Route path="/tutor" component={Tutor}/>
      <Route component={NotFound} />
    </Switch>
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
