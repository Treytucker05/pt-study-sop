import { AlertCircle } from "lucide-react";

import { HudPanel } from "@/components/ui/HudPanel";
import {
  ICON_LG,
  PANEL_PADDING,
  TEXT_MUTED,
  TEXT_PAGE_TITLE,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center">
        <HudPanel
          variant="b"
          className={cn("w-full max-w-xl space-y-4", PANEL_PADDING, "md:p-6")}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className={cn(ICON_LG, "text-primary")} />
            <h1 className={TEXT_PAGE_TITLE}>404 Page Not Found</h1>
          </div>
          <p className={TEXT_MUTED}>
            The requested route is not part of the current study cockpit.
          </p>
          <p className={TEXT_MUTED}>
            Did you forget to add the page to the router?
          </p>
        </HudPanel>
      </div>
    </div>
  );
}
