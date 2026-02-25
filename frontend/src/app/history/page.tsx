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

interface DocumentSummary {
    id: string;
    token: string;
    type: string;
    document_number: string;
    document_date: string;
    to_name: string;
    total: number;
    currency_symbol: string;
    status: string;
    created_at: string;
    comment_count: number;
}

export default function HistoryPage() {
    const { user, token, loading: authLoading } = useAuth();
    const router = useRouter();
    const [documents, setDocuments] = useState<DocumentSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const filteredDocuments = documents.filter(doc => {
        const typeMatch = typeFilter === "all" || doc.type === typeFilter;
        const statusMatch = statusFilter === "all" || doc.status === statusFilter;
        return typeMatch && statusMatch;
    });

    useEffect(() => {
        if (authLoading) return;
        if (!user || !token) { router.push("/login"); return; }
        const fetchHistory = async () => {
            try {
                const res = await fetch(`${API_URL}/api/history`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) setDocuments(await res.json());
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
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-[#8A8880] uppercase tracking-widest mb-2">Type</label>
                        <div className="flex bg-[#F5F3EE] p-1 rounded-lg">
                            {["all", "QUOTE", "INVOICE"].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTypeFilter(t)}
                                    className={`flex-1 px-4 py-1.5 text-xs font-medium rounded-md transition-all ${typeFilter === t ? "bg-white text-[#1A1A18] shadow-sm" : "text-[#8A8880] hover:text-[#1A1A18]"}`}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-[#8A8880] uppercase tracking-widest mb-2">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-[#F5F3EE] border-none rounded-lg px-4 py-2 text-xs font-medium focus:ring-1 focus:ring-[#D4A017] transition-all"
                        >
                            <option value="all">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="viewed">Viewed</option>
                            <option value="approved">Approved</option>
                            <option value="converted">Converted</option>
                            <option value="acknowledged">Acknowledged</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                </div>

                {filteredDocuments.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <FileText className="h-10 w-10 text-[#E8E6E0] mb-4" />
                            <p className="text-[#4A4A45] mb-1">No documents yet</p>
                            <p className="text-sm text-[#8A8880] mb-5">Your generated quotes and invoices will appear here.</p>
                            <Link href="/create"><Button size="sm" className="bg-[#D4A017] hover:bg-[#B8860B] text-white">Create your first document</Button></Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2 stagger">
                        {filteredDocuments.map((doc) => {
                            const linkHref = doc.type.toLowerCase() === 'invoice'
                                ? `/view/invoice/${doc.token}`
                                : `/view/${doc.token}`;

                            const statusColors: Record<string, string> = {
                                "draft": "bg-slate-100 text-slate-600",
                                "sent": "bg-blue-50 text-blue-600",
                                "viewed": "bg-orange-50 text-orange-600",
                                "approved": "bg-emerald-50 text-emerald-600",
                                "converted": "bg-purple-50 text-purple-600",
                                "acknowledged": "bg-blue-50 text-blue-600",
                                "paid": "bg-emerald-50 text-emerald-600"
                            };

                            return (
                                <div key={`${doc.type}-${doc.id}`} className="group relative">
                                    <Link href={linkHref} className="block">
                                        <Card className="hover:border-[#D5D3CC] transition-colors overflow-hidden">
                                            <CardContent className="py-4 px-5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-[#F5F3EE] rounded-lg flex items-center justify-center shrink-0">
                                                            <FileText className="h-4 w-4 text-[#4A4A45]" />
                                                        </div>
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="text-sm font-medium font-mono">{doc.document_number}</p>
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${doc.type === "QUOTE" ? "bg-[#D4A017]/10 text-[#D4A017]" : "bg-[#1A1A18]/5 text-[#1A1A18]"}`}>
                                                                    {doc.type}
                                                                </span>
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${statusColors[doc.status] || "bg-[#F5F3EE] text-[#8A8880]"}`}>
                                                                    {doc.status}
                                                                </span>
                                                                {doc.comment_count > 0 && (
                                                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold tracking-widest uppercase">
                                                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                                                        {doc.comment_count}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-[#8A8880] mt-0.5">{doc.to_name} · {doc.document_date}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-semibold font-mono">{doc.currency_symbol}{doc.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                        <p className="text-[10px] text-[#8A8880] font-mono mt-0.5">{new Date(doc.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>

                                                {/* Mobile Actions */}
                                                <div className="mt-4 pt-4 border-t border-[#F5F3EE] flex gap-2 md:hidden">
                                                    <Link href={`/create?edit=${doc.token}`} className="flex-1">
                                                        <Button variant="outline" size="sm" className="w-full h-9 text-xs border-[#E8E6E0] hover:border-[#D5D3CC] hover:bg-[#F5F3EE]">
                                                            Edit
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/create?duplicate=${doc.type.toLowerCase()}_${doc.token}`} className="flex-1">
                                                        <Button variant="outline" size="sm" className="w-full h-9 text-xs border-[#E8E6E0] hover:border-[#D5D3CC] hover:bg-[#F5F3EE]">
                                                            Duplicate
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                    {/* Desktop Hover Actions */}
                                    <div className="absolute right-[-150px] top-[50%] -translate-y-[50%] opacity-0 lg:group-hover:opacity-100 transition-opacity hidden lg:flex gap-2">
                                        <Link href={`/create?edit=${doc.token}`}>
                                            <Button variant="outline" size="sm" className="h-8 text-xs border-[#E8E6E0] hover:border-[#D5D3CC] hover:bg-[#F5F3EE]">
                                                Edit
                                            </Button>
                                        </Link>
                                        <Link href={`/create?duplicate=${doc.type.toLowerCase()}_${doc.token}`}>
                                            <Button variant="outline" size="sm" className="h-8 text-xs border-[#E8E6E0] hover:border-[#D5D3CC] hover:bg-[#F5F3EE]">
                                                Duplicate
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
            <AppFooter maxWidth="max-w-3xl" />
        </div>
    );
}
