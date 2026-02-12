import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-4 border-[3px] border-double border-primary bg-black/40 p-6 rounded-none">
        <div className="flex mb-4 gap-2 items-center">
          <AlertCircle className="h-8 w-8 text-primary" />
          <h1 className="font-arcade text-lg text-primary mb-0">404 PAGE NOT FOUND</h1>
        </div>
        <p className="mt-4 text-sm font-terminal text-muted-foreground">
          Did you forget to add the page to the router?
        </p>
      </div>
    </div>
  );
}
