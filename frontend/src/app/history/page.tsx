"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface InvoiceSummary {
    id: string;
    invoice_number: string;
    invoice_date: string;
    to_name: string;
    total: number;
    currency_symbol: string;
    created_at: string;
}

export default function HistoryPage() {
    const { user, token, loading: authLoading } = useAuth();
    const router = useRouter();
    const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user || !token) { router.push("/login"); return; }
        const fetchHistory = async () => {
            try {
                const res = await fetch(`${API_URL}/api/history`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) setInvoices(await res.json());
            } catch { } finally { setLoading(false); }
        };
        fetchHistory();
    }, [user, token, authLoading, router]);

    if (authLoading || loading) {
        return <div className="min-h-screen flex items-center justify-center"><p className="text-[#8A8880] text-sm">Loading…</p></div>;
    }

    return (
        <div className="min-h-screen flex flex-col">
            <AppHeader>
                <Link href="/create"><Button size="sm" className="bg-[#1A1A18] hover:bg-[#333] text-white text-sm"><Plus className="h-3.5 w-3.5 mr-1.5" /> New Invoice</Button></Link>
            </AppHeader>

            <main className="max-w-3xl mx-auto px-5 py-10 animate-fade-in flex-1 w-full">
                <h1 className="text-3xl font-normal mb-6" style={{ fontFamily: "var(--font-heading)" }}>Invoice History</h1>

                {invoices.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <FileText className="h-10 w-10 text-[#E8E6E0] mb-4" />
                            <p className="text-[#4A4A45] mb-1">No invoices yet</p>
                            <p className="text-sm text-[#8A8880] mb-5">Your generated invoices will appear here.</p>
                            <Link href="/create"><Button size="sm" className="bg-[#D4A017] hover:bg-[#B8860B] text-white">Create your first invoice</Button></Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2 stagger">
                        {invoices.map((inv) => (
                            <Card key={inv.id} className="hover:border-[#D5D3CC] transition-colors">
                                <CardContent className="flex items-center justify-between py-4 px-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#F5F3EE] rounded-lg flex items-center justify-center">
                                            <FileText className="h-4 w-4 text-[#4A4A45]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium font-mono">{inv.invoice_number}</p>
                                            <p className="text-xs text-[#8A8880]">{inv.to_name} · {inv.invoice_date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold font-mono">{inv.currency_symbol}{inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        <p className="text-[10px] text-[#8A8880] font-mono">{new Date(inv.created_at).toLocaleDateString()}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
            <AppFooter maxWidth="max-w-3xl" />
        </div>
    );
}
