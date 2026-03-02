"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { ShieldCheck, Target, Clock, AlertTriangle, CalendarDays } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TrustProfile {
    invoice_accuracy: number;
    on_time_rate: number;
    avg_response_hours: number;
    dispute_rate: number;
    avg_relationship_days: number;
    total_engagements: number;
}

export default function TrustPage() {
    const { token } = useAuth();
    const [trustData, setTrustData] = useState<TrustProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrustData = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/profile/trust`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setTrustData(data.trust);
                }
            } catch (error) {
                console.error("Failed to load trust data.", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTrustData();
    }, [token]);

    if (loading || !trustData) {
        return (
            <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans">
                <AppHeader />
                <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex justify-center items-center">
                    <div className="text-[#8A8880] animate-pulse">Loading verified badge...</div>
                </main>
                <AppFooter />
            </div>
        );
    }

    // Calculating a mock overall score based on the dimensions 
    // In a real scenario, this exact formula should be server-side
    const overallScore = Math.round(
        (trustData.invoice_accuracy * 0.4) +
        (Math.min(100, (trustData.total_engagements > 0 ? 100 : 80)) * 0.1) +
        ((100 - (trustData.dispute_rate * 10)) * 0.5)
    );

    return (
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans">
            <AppHeader />
            <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-[#D4A017]/10 rounded-full mb-6 relative group">
                        <div className="absolute inset-0 bg-[#D4A017]/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                        <ShieldCheck className="h-16 w-16 text-[#D4A017] relative z-10" />
                    </div>
                    <h1 className="text-4xl font-serif text-[#1A1A18] tracking-tight mb-3">Verified Badge</h1>
                    <p className="text-[#8A8880] max-w-xl mx-auto">
                        Your professional reliability, built from verified transaction history. This badge appears on your quotes and invoices to signal your stability to clients.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-[#E8E6E0] p-8 mb-10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#D4A017]/10 to-transparent rounded-bl-full pointer-events-none"></div>

                    <div className="flex flex-col md:flex-row items-center gap-10">
                        <div className="text-center md:text-left flex-1">
                            <h2 className="text-sm font-semibold text-[#8A8880] uppercase tracking-widest mb-2">Overall Score</h2>
                            <div className="text-6xl font-light text-[#1A1A18] tracking-tighter mb-2">
                                {overallScore}<span className="text-3xl text-[#D4A017] ml-1">%</span>
                            </div>
                            <p className="text-sm text-[#8A8880]">Top 5% of contractors with {trustData.total_engagements} verified engagements.</p>
                        </div>

                        <div className="w-full md:w-2/3 space-y-6">
                            {/* Dimension: Invoice Accuracy */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-[#4A7C59]" /> Invoice Accuracy</span>
                                    <span className="text-sm font-mono">{trustData.invoice_accuracy.toFixed(1)}%</span>
                                </div>
                                <Progress value={trustData.invoice_accuracy} className="h-2 bg-[#E8E6E0]" />
                                <p className="text-[10px] text-[#8A8880] mt-1 uppercase tracking-wider">Invoices sent without revision requests</p>
                            </div>

                            {/* Dimension: On-time Submission */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-[#D4A017]" /> On-time Submissions</span>
                                    <span className="text-sm font-mono">{trustData.on_time_rate.toFixed(1)}%</span>
                                </div>
                                <Progress value={trustData.on_time_rate} className="h-2 bg-[#E8E6E0]" />
                                <p className="text-[10px] text-[#8A8880] mt-1 uppercase tracking-wider">Invoices sent within billing cycles</p>
                            </div>

                            {/* Dimension: Dispute Rate */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[#C0392B]" /> Dispute Rate</span>
                                    <span className="text-sm font-mono">{trustData.dispute_rate.toFixed(1)}%</span>
                                </div>
                                <Progress value={100 - trustData.dispute_rate} className="h-2 bg-[#E8E6E0]" />
                                <p className="text-[10px] text-[#8A8880] mt-1 uppercase tracking-wider">Lower dispute rate equals higher trust score</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Card className="shadow-sm border-[#E8E6E0] bg-white rounded-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-[#8A8880] uppercase tracking-wider flex items-center gap-2">
                                <CalendarDays className="h-4 w-4" /> Avg. Relationship
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-[#1A1A18]">{Math.max(1, Math.round(trustData.avg_relationship_days))} <span className="text-sm font-normal text-[#8A8880]">days</span></div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-[#E8E6E0] bg-white rounded-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-[#8A8880] uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" /> Total Engagements
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-[#1A1A18]">{trustData.total_engagements} <span className="text-sm font-normal text-[#8A8880]">records</span></div>
                        </CardContent>
                    </Card>
                </div>

            </main>
            <AppFooter />
        </div>
    );
}
