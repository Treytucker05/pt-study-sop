import { useLocation } from "wouter";
import { Suspense, lazy, useState, useEffect } from "react";
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
const Library = lazy(() => import("@/pages/library"));
const NotFound = lazy(() => import("@/pages/not-found"));

const ROUTES = [
  { path: "/", Component: Dashboard },
  { path: "/brain", Component: Brain },
  { path: "/calendar", Component: CalendarPage },
  { path: "/scholar", Component: Scholar },
  { path: "/tutor", Component: Tutor },
  { path: "/methods", Component: Methods },
  { path: "/library", Component: Library },
];

const LoadingFallback = () => (
  <div className="p-4 font-terminal text-xs text-muted-foreground">
    Loading...
  </div>
);

function KeepAliveRouter() {
  const [location] = useLocation();
  const [visited, setVisited] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const match = ROUTES.find((r) => r.path === location);
    if (match && !visited.has(match.path)) {
      setVisited((prev) => new Set([...prev, match.path]));
    }
  }, [location, visited]);

  const isKnownRoute = ROUTES.some((r) => r.path === location);

  return (
    <>
      {ROUTES.map(({ path, Component }) => {
        if (!visited.has(path)) return null;
        const isActive = path === location;
        return (
          <div
            key={path}
            className="contents"
            style={isActive ? undefined : { display: "none" }}
          >
            <Suspense fallback={<LoadingFallback />}>
              <Component />
            </Suspense>
          </div>
        );
      })}
      {!isKnownRoute && (
        <Suspense fallback={<LoadingFallback />}>
          <NotFound />
        </Suspense>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <KeepAliveRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
