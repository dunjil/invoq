import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface RecentActivityProps {
    activities: any[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
    return (
        <Card className="shadow-sm border-[#E8E6E0] bg-white rounded-xl">
            <CardHeader className="pb-4">
                <CardTitle className="text-xs font-bold text-[#1A1A18] uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#D4A017]" /> Activity Feed
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {activities && activities.length > 0 ? activities.map((log: any, idx: number) => (
                    <div key={idx} className="relative pl-6 pb-6 border-l border-[#F5F3EE] last:pb-0">
                        <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-[#D4A017] ring-4 ring-white" />
                        <p className="text-xs font-medium text-[#1A1A18] mb-0.5">{log.action.replace(/_/g, ' ').replace(/\b\w/g, (l: any) => l.toUpperCase())}</p>
                        <p className="text-[10px] text-[#8A8880] mb-2">{log.details}</p>
                        <p className="text-[9px] text-[#8A8880] font-mono">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.timestamp).toLocaleDateString()}</p>
                    </div>
                )) : (
                    <p className="text-xs text-[#8A8880] text-center py-8">No recent activity detected.</p>
                )}
            </CardContent>
        </Card>
    );
}
