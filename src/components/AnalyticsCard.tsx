// src/components/AnalyticsCard.tsx
// Simple reusable card component for analytics dashboard
// Uses Tailwind for styling and subtle hover animation.

import React from "react";

interface AnalyticsCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon?: React.ReactNode;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
    title,
    value,
    description,
    icon,
}) => {
    return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 hover:border-teal-500/30 transition-all shadow-lg hover:shadow-teal-900/30">
            <div className="flex items-center gap-3 mb-2">
                {icon && <div className="text-teal-400">{icon}</div>}
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    {title}
                </h3>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{value}</p>
            {description && (
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                    {description}
                </p>
            )}
        </div>
    );
};
