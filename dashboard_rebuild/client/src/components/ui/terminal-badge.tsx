import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Terminal Badge - Neo-Retro Label
 * Ported from legacy dashboard.css terminal badge styling
 */

export interface TerminalBadgeProps {
    children: React.ReactNode;
    label?: string;
    wide?: boolean;
    className?: string;
}

function TerminalBadge({ children, label, wide, className }: TerminalBadgeProps) {
    return (
        <div className={cn("terminal-badge", wide && "wide", className)}>
            {label && <span className="terminal-badge-label">{label}</span>}
            {children}
        </div>
    );
}

export { TerminalBadge };
