"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";

import { DashboardHeaderActions } from "@/components/features/dashboard/header-actions";
import { StatsOverview } from "@/components/features/dashboard/stats-overview";
import { RecentDocuments } from "@/components/features/dashboard/recent-documents";
import { RecentActivity } from "@/components/features/dashboard/recent-activity";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DashboardSummary {
    active_relationships: number;
    documents_awaiting_action: number;
    outstanding_invoices_total: number;
    confirmed_cash_flow_month: number;
    tax_position: {
        total_earned: number;
        estimated_tax: number;
    };
    trust_score?: number; // Added to backend optionally
    recent_documents?: any[];
    recent_activity?: any[];
}

export default function DashboardPage() {
    const { token, user } = useAuth();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/dashboard/portfolio`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const data = await res.json();
                if (data.success) {
                    setSummary(data.summary);
                }
            } catch (error) {
                console.error("Failed to load dashboard data.", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [token]);

    if (loading || !summary) {
        return (
            <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans">
                <AppHeader />
                <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex justify-center items-center">
                    <div className="text-[#8A8880] animate-pulse">Loading dashboard...</div>
                </main>
                <AppFooter />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans">
            <AppHeader />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-serif text-[#1A1A18] tracking-tight mb-2">Portfolio Dashboard</h1>
                        <p className="text-[#8A8880]">Welcome back, {user?.name || "Contractor"}. Here's an overview of your active professional relationships.</p>
                    </div>
                    <DashboardHeaderActions />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left & Middle Column (Stats & Documents) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Stats Grid */}
                        <StatsOverview summary={summary} />

                        {/* Recent Documents */}
                        <RecentDocuments documents={summary.recent_documents || []} />
                    </div>

                    {/* Right Column (Activity & Side Panels) */}
                    <div className="space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-[#E8E6E0] shadow-sm">
                                <p className="text-[10px] font-bold text-[#8A8880] uppercase tracking-widest mb-1">Active</p>
                                <p className="text-xl font-serif text-[#1A1A18]">{summary.active_relationships}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-[#E8E6E0] shadow-sm">
                                <p className="text-[10px] font-bold text-[#8A8880] uppercase tracking-widest mb-1">Action</p>
                                <p className="text-xl font-serif text-[#D4A017]">{summary.documents_awaiting_action}</p>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <RecentActivity activities={summary.recent_activity || []} />
                    </div>
                </div>
            </main>

            <AppFooter />
        </div>
    );
}
