import * as React from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Section Panel - Collapsible Neo-Retro Panel
 * Ported from legacy dashboard.css section-panel styling
 */

export interface SectionPanelProps {
    title: string;
    icon?: React.ReactNode;
    subtitle?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
    className?: string;
}

function SectionPanel({
    title,
    icon,
    subtitle,
    defaultOpen = false,
    children,
    className,
}: SectionPanelProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={cn("section-panel", className)}>
            <div
                className="section-panel-header"
                onClick={() => setIsOpen(!isOpen)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    {icon && <span className="text-xl">{icon}</span>}
                    <div>
                        <h3 className="text-sm font-arcade font-semibold text-white uppercase tracking-wider m-0">
                            {title}
                        </h3>
                        {subtitle && (
                            <p className="text-xs text-gray-400 mt-1 m-0">{subtitle}</p>
                        )}
                    </div>
                </div>
                <ChevronDown
                    className={cn(
                        "w-5 h-5 text-gray-400 transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            </div>
            {isOpen && <div className="section-panel-content">{children}</div>}
        </div>
    );
}

export { SectionPanel };
