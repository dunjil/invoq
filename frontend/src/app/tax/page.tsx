"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { ArrowRight, Download, Landmark, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TaxData {
    total_earned: number;
    total_tax_collected: number;
    q1_q4_json: Record<string, number>;
    per_relationship_json: Record<string, number>;
}

export default function TaxPage() {
    const { token, user } = useAuth();
    const [taxData, setTaxData] = useState<TaxData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        const fetchTaxData = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/tax/ledger`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    setTaxData(data);
                    setIsPro(true);
                } else if (res.status === 403) {
                    setIsPro(false);
                } else {
                    toast.error("Failed to load tax data");
                }
            } catch (error) {
                console.error("Failed to load tax data.", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTaxData();
    }, [token]);

    const handleExportCSV = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/tax/export/csv`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tax_ledger_${new Date().getFullYear()}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                toast.success("Tax ledger exported successfully.");
            } else {
                toast.error("Failed to export tax ledger.");
            }
        } catch (err) {
            toast.error("Network error during export.");
        }
    };

    const handleExportPDF = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/tax/export/pdf`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tax_ledger_${new Date().getFullYear()}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                toast.success("Tax report PDF exported successfully.");
            } else {
                toast.error("Failed to export tax PDF.");
            }
        } catch (err) {
            toast.error("Network error during PDF export.");
        }
    };

    const handleExportExcel = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/tax/export/excel`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tax_ledger_${new Date().getFullYear()}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                toast.success("Excel report exported successfully.");
            } else {
                toast.error("Failed to export Excel.");
            }
        } catch (err) {
            toast.error("Network error during Excel export.");
        }
    };

    const handleExportDocx = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/tax/export/docx`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tax_ledger_${new Date().getFullYear()}.docx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                toast.success("Word report exported successfully.");
            } else {
                toast.error("Failed to export Word doc.");
            }
        } catch (err) {
            toast.error("Network error during Word export.");
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans">
                <AppHeader />
                <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex justify-center items-center">
                    <div className="text-[#8A8880] animate-pulse">Loading tax ledger...</div>
                </main>
                <AppFooter />
            </div>
        );
    }

    if (!isPro) {
        return (
            <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans">
                <AppHeader />
                <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex justify-center items-center">
                    <div className="text-center p-10 bg-white border border-[#E8E6E0] rounded-2xl shadow-sm max-w-md">
                        <div className="mx-auto w-16 h-16 bg-[#F5F3EE] rounded-full flex items-center justify-center mb-6">
                            <Landmark className="h-8 w-8 text-[#D4A017]" />
                        </div>
                        <h2 className="text-2xl font-serif text-[#1A1A18] mb-3">Tax Ledger Locked</h2>
                        <p className="text-[#8A8880] text-sm mb-8 leading-relaxed">
                            The Tax Awareness Ledger is a <strong>Network Pro</strong> feature. Automatically track earnings, estimate tax liabilities, and generate quarter-end reports seamlessly.
                        </p>
                        <Button
                            className="w-full h-11 bg-[#D4A017] hover:bg-[#B8860B] text-white font-medium"
                            onClick={() => window.location.href = "/register"}
                        >
                            Upgrade to Network Pro
                        </Button>
                    </div>
                </main>
                <AppFooter />
            </div>
        );
    }

    // Default values if no data
    const displayData = taxData || {
        total_earned: 0,
        total_tax_collected: 0,
        q1_q4_json: { q1: 0, q2: 0, q3: 0, q4: 0 },
        per_relationship_json: {}
    };

    const estimatedTax = (displayData.total_earned * 0.25); // Placeholder 25% estimate

    return (
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans">
            <AppHeader />
            <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-serif text-[#1A1A18] mb-2">Tax Ledger</h1>
                        <p className="text-[#8A8880]">Track your earnings and estimated tax obligations.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2 border-[#E8E6E0] text-[#4A4A45]">
                            <FileDown className="h-4 w-4 text-[#4A7C59]" /> CSV
                        </Button>
                        <Button onClick={handleExportExcel} variant="outline" className="flex items-center gap-2 border-[#E8E6E0] text-[#4A4A45]">
                            <FileSpreadsheet className="h-4 w-4 text-[#4A7C59]" /> Excel
                        </Button>
                        <Button onClick={handleExportDocx} variant="outline" className="flex items-center gap-2 border-[#E8E6E0] text-[#4A4A45]">
                            <FileText className="h-4 w-4 text-[#2563EB]" /> DOCX
                        </Button>
                        <Button onClick={handleExportPDF} variant="outline" className="flex items-center gap-2 border-[#E8E6E0] text-[#4A4A45]">
                            <Download className="h-4 w-4 text-[#C0392B]" /> PDF
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <Card className="shadow-sm border-[#E8E6E0] bg-white rounded-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-[#8A8880] uppercase tracking-wider">Total Earned</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-[#1A1A18]">{formatCurrency(displayData.total_earned)}</div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-[#E8E6E0] bg-white rounded-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-[#8A8880] uppercase tracking-wider">Tax Collected</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-[#1A1A18]">{formatCurrency(displayData.total_tax_collected)}</div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-md border-[#D4A017]/30 bg-[#FAF9F6] rounded-xl relative overflow-hidden">
                        <CardHeader className="pb-2 relative z-10">
                            <CardTitle className="text-sm font-bold text-[#C0392B] uppercase tracking-wider">Estimated Tax Owed</CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-3xl font-bold text-[#C0392B]">{formatCurrency(estimatedTax)}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Quarterly Breakdown */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-[#1A1A18] border-b border-[#E8E6E0] pb-2">Quarterly Breakdown</h3>
                        {Object.entries(displayData.q1_q4_json || {}).map(([q, amount]) => (
                            <div key={q} className="flex justify-between items-center p-3 bg-white border border-[#E8E6E0] rounded-lg">
                                <span className="text-sm font-semibold text-[#8A8880] uppercase tracking-widest">{q}</span>
                                <span className="text-base font-medium text-[#1A1A18]">{formatCurrency(amount)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Client Breakdown */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-[#1A1A18] border-b border-[#E8E6E0] pb-2">Per-Client Breakdown</h3>
                        {Object.keys(displayData.per_relationship_json || {}).length === 0 ? (
                            <p className="text-sm text-[#8A8880] italic py-4">No client payment data captured yet.</p>
                        ) : (
                            Object.entries(displayData.per_relationship_json || {}).map(([clientId, amount]) => (
                                <div key={clientId} className="flex justify-between items-center p-3 bg-white border border-[#E8E6E0] rounded-lg">
                                    <span className="text-sm text-[#4A4A45] font-mono truncate max-w-[150px]">{clientId.split('-')[0]}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-base font-medium text-[#1A1A18]">{formatCurrency(amount)}</span>
                                        <ArrowRight className="h-4 w-4 text-[#E8E6E0]" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
            <AppFooter />
        </div>
    );
}
