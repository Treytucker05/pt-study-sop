import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type TutorEmptyStateAction = {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "primary" | "ghost";
};

type TutorEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: TutorEmptyStateAction[];
};

export function TutorEmptyState({ icon: Icon, title, description, actions }: TutorEmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="rounded-none border-2 border-primary/20 bg-black/40 max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <Icon className="h-10 w-10 text-primary/60" />
          <h2 className="font-arcade text-lg text-primary tracking-wider">
            {title}
          </h2>
          <p className="font-terminal text-sm text-muted-foreground text-center">
            {description}
          </p>
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  type="button"
                  variant={action.variant === "ghost" ? "ghost" : "default"}
                  className={
                    action.variant === "ghost"
                      ? "rounded-none font-arcade text-ui-2xs border border-primary/20 text-muted-foreground hover:text-primary"
                      : "rounded-none font-arcade text-ui-2xs bg-primary text-primary-foreground hover:bg-primary/90"
                  }
                  onClick={action.onClick}
                >
                  {action.icon && <action.icon className="w-4 h-4 mr-1" />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
