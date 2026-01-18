import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Metal Stat Card - Arcade Score Display
 * Ported from legacy dashboard.css stat card styling
 */

export interface MetalStatCardProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    className?: string;
}

function MetalStatCard({ label, value, icon, className }: MetalStatCardProps) {
    return (
        <div className={cn("metal-stat-card", className)}>
            {icon && <div className="stat-icon">{icon}</div>}
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
        </div>
    );
}

export { MetalStatCard };
