import { useLocation } from "wouter";
import { Suspense, lazy, useState, useEffect } from "react";
import { queryClient } from "./queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const Brain = lazy(() => import("@/pages/brain"));
const CalendarPage = lazy(() => import("@/pages/calendar"));
const Scholar = lazy(() => import("@/pages/scholar"));
const Tutor = lazy(() => import("@/pages/tutor"));
const Methods = lazy(() => import("@/pages/methods"));
const Mastery = lazy(() => import("@/pages/mastery"));
const Library = lazy(() => import("@/pages/library"));
const VaultHealth = lazy(() => import("@/pages/vault-health"));
const NotFound = lazy(() => import("@/pages/not-found"));

const ROUTES = [
  { path: "/", Component: Brain },
  { path: "/calendar", Component: CalendarPage },
  { path: "/scholar", Component: Scholar },
  { path: "/tutor", Component: Tutor },
  { path: "/methods", Component: Methods },
  { path: "/mastery", Component: Mastery },
  { path: "/library", Component: Library },
  { path: "/vault-health", Component: VaultHealth },
];

function normalizeRoutePath(path: string) {
  if (path === "/brain") {
    return "/";
  }
  return path;
}

const LoadingFallback = () => (
  <div className="p-4 font-terminal text-xs text-muted-foreground">
    Loading...
  </div>
);

function KeepAliveRouter() {
  const [location] = useLocation();
  const normalizedLocation = normalizeRoutePath(location);
  const [visited, setVisited] = useState<Set<string>>(
    () =>
      new Set(
        ROUTES.some((route) => route.path === normalizedLocation)
          ? [normalizedLocation]
          : [],
      ),
  );

  useEffect(() => {
    const match = ROUTES.find((r) => r.path === normalizedLocation);
    if (match && !visited.has(match.path)) {
      setVisited((prev) => new Set([...prev, match.path]));
    }
  }, [normalizedLocation, visited]);

  const isKnownRoute = ROUTES.some((r) => r.path === normalizedLocation);

  return (
    <>
      {ROUTES.map(({ path, Component }) => {
        if (!visited.has(path)) return null;
        const isActive = path === normalizedLocation;
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
