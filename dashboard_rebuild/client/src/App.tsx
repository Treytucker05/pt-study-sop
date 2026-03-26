import { useLocation } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";

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

function AppRouter() {
  const [location] = useLocation();
  const normalizedLocation = normalizeRoutePath(location);
  const match = ROUTES.find((route) => route.path === normalizedLocation);

  if (!match) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <NotFound />
      </Suspense>
    );
  }

  const Component = match.Component;
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component />
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Layout>
          <AppRouter />
        </Layout>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
