"use client";

import { ShieldCheck, Target, Clock, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TrustBadgeProps {
    score: number;
    totalEngagements: number;
    invoiceAccuracy: number;
    onTimeRate: number;
    size?: "sm" | "md" | "lg";
}

export function TrustBadge({ score, totalEngagements, invoiceAccuracy, onTimeRate, size = "md" }: TrustBadgeProps) {
    const iconSize = size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : "h-6 w-6";
    const textSize = size === "sm" ? "text-[10px]" : size === "md" ? "text-xs" : "text-sm";

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-[#D4A017]/10 border border-[#D4A017]/20 rounded-full cursor-help hover:bg-[#D4A017]/20 transition-colors`}>
                        <ShieldCheck className={`${iconSize} text-[#D4A017]`} />
                        <span className={`${textSize} font-bold text-[#D4A017] uppercase tracking-wider`}>
                            Verified {score}%
                        </span>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="w-64 p-4 bg-white border border-[#E8E6E0] shadow-xl rounded-xl">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-[#E8E6E0] pb-2 mb-2">
                            <span className="text-xs font-bold uppercase tracking-tight text-[#1A1A18]">Professional Reliability</span>
                            <span className="text-xs font-mono text-[#D4A017]">{totalEngagements} Records</span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-[#8A8880] flex items-center gap-1"><Target className="h-3 w-3" /> Accuracy</span>
                                <span className="text-[10px] font-bold">{invoiceAccuracy.toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-[#8A8880] flex items-center gap-1"><Clock className="h-3 w-3" /> On-Time</span>
                                <span className="text-[10px] font-bold">{onTimeRate.toFixed(0)}%</span>
                            </div>
                        </div>

                        <p className="text-[9px] text-[#8A8880] leading-tight mt-2 italic">
                            Generated from verified INVOQ transaction history.
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
