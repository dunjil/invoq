"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    ArrowLeft, Users, FileText, DollarSign, Crown,
    TrendingUp, Calendar, UserPlus, Activity, Zap, CheckCircle2, XCircle, Globe, Search, Filter
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Overview {
    total_users: number;
    total_invoices: number;
    total_quotes: number;
    total_clients: number;
    total_revenue: number;
    pro_users: number;
    free_users: number;
    users_today: number;
    users_this_week: number;
    users_this_month: number;
    invoices_today: number;
    invoices_this_week: number;
    invoices_this_month: number;
    quotes_this_month: number;
    total_extractions: number;
    successful_extractions: number;
    failed_extractions: number;
    avg_extraction_time_ms: number;
    active_users_today: number;
    active_users_week: number;
    dau: number;
    mau: number;
    arr: number;
    churn_rate: number;
    retention_rate: number;
}

interface GrowthPoint { date: string; count: number; }
interface RevenuePoint { date: string; amount: number; count: number; }
interface UserRow {
    id: string; email: string; name: string;
    subscription_status: string; invoices_this_month: number;
    invoice_count: number; created_at: string; last_active: string | null;
    country_code: string | null; country_name: string | null;
}
interface InvoiceRow {
    id: string; invoice_number: string; from_name: string; to_name: string;
    total: number; currency_symbol: string; user_email: string | null; created_at: string;
}
interface QuoteRow {
    id: string; quote_number: string; from_name: string; to_name: string;
    total: number; currency_symbol: string; user_email: string | null; status: string; created_at: string;
}
interface ClientRowGlobal {
    id: string; name: string; email: string | null; phone: string | null;
    user_email: string | null; created_at: string;
}
interface ActivityRow {
    action: string; user_email: string | null; details: string | null;
    created_at: string; country_code: string | null; country_name: string | null;
}
interface ExtractionRow {
    success: boolean; items_extracted: number; response_time_ms: number;
    error_message: string | null; created_at: string;
}

interface DashboardData {
    overview: Overview;
    user_growth: GrowthPoint[];
    invoice_growth: GrowthPoint[];
    quote_growth: GrowthPoint[];
    revenue_growth: RevenuePoint[];
    recent_users: UserRow[];
    top_users: UserRow[];
    recent_invoices: InvoiceRow[];
    recent_quotes: QuoteRow[];
    recent_clients: ClientRowGlobal[];
    recent_activity: ActivityRow[];
    recent_extractions: ExtractionRow[];
}

// ── Mini Sparkline ──────────────────────────────────────────
function Sparkline({ data, color = "#D4A017", height = 40 }: { data: number[]; color?: string; height?: number }) {
    if (!data.length) return null;
    const max = Math.max(...data, 1);
    const w = 200;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - (v / max) * (height - 4)}`).join(" ");
    return (
        <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
            <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
            <polyline fill={`${color}15`} stroke="none" points={`0,${height} ${points} ${w},${height}`} />
        </svg>
    );
}

// ── Bar Chart ───────────────────────────────────────────────
function BarChart({ data, color = "#D4A017", height = 120 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
    if (!data.length) return null;
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="flex items-end gap-[2px] w-full" style={{ height }}>
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-6 bg-[#1A1A18] text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-mono z-10">
                        {d.value.toLocaleString()} · {d.label}
                    </div>
                    <div className="w-full rounded-t-sm transition-all hover:opacity-80" style={{
                        height: `${Math.max((d.value / max) * 100, 2)}%`,
                        background: color,
                        minHeight: "2px",
                    }} />
                </div>
            ))}
        </div>
    );
}

function CountryFlag({ code, name }: { code: string | null; name: string | null }) {
    if (!code) return <span className="text-[#8A8880] text-[10px]">—</span>;
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#E8E6E0] bg-white text-[10px] text-[#4A4A45]" title={name || "Unknown"}>
            <img src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`} alt={code} className="w-3" />
            {code}
        </span>
    );
}

export default function AdminDashboard() {
    const { user, token, loading: authLoading } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"overview" | "users" | "invoices" | "quotes" | "clients_global" | "activity" | "ai">("overview");
    const [searchTerm, setSearchTerm] = useState("");
    const [days, setDays] = useState<7 | 30 | 90>(30);

    useEffect(() => {
        if (authLoading) return;
        if (!user || !token) { router.push("/login"); return; }
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/admin/dashboard?days=${days}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.status === 403) { setError("Admin access required"); setLoading(false); return; }
                if (!res.ok) { setError("Failed to load dashboard"); setLoading(false); return; }
                const d: DashboardData = await res.json();
                setData(d);
            } catch { setError("Network error"); }
            finally { setLoading(false); }
        };
        load();
    }, [user, token, authLoading, router, days]);

    if (authLoading || loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <p className="text-lg text-[#C0392B] mb-4">{error}</p>
                <Link href="/"><Button variant="outline">Back to Home</Button></Link>
            </div>
        </div>
    );

    if (!data) return null;
    const o = data.overview;

    // Computed metrics
    const mrr = o.pro_users * 9; // assuming $9/mo
    const conversionRate = o.total_users > 0 ? ((o.pro_users / o.total_users) * 100).toFixed(1) : "0";
    const avgInvoicesPerUser = o.total_users > 0 ? (o.total_invoices / o.total_users).toFixed(1) : "0";
    const aiSuccessRate = o.total_extractions > 0 ? ((o.successful_extractions / o.total_extractions) * 100).toFixed(0) : "0";

    return (
        <div className="min-h-screen bg-[#FAF9F6]">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <div className="relative h-7 w-28">
                                <Image
                                    src="/images/invoq-logo-transparent.png"
                                    alt="INVOQ"
                                    fill
                                    className="object-contain object-left"
                                />
                            </div>
                        </Link>
                        <span className="text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded bg-[#1A1A18] text-white">Admin</span>
                    </div>
                    <Link href="/create"><Button variant="outline" size="sm" className="text-sm text-[#4A4A45]"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> App</Button></Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-5 py-8 space-y-6 animate-fade-in">
                {/* Title + Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                    <h1 className="text-3xl font-normal shrink-0" style={{ fontFamily: "var(--font-heading)" }}>Dashboard</h1>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        {activeTab !== "overview" && (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8880]" />
                                <Input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9 w-full sm:w-64 bg-white"
                                />
                            </div>
                        )}
                        {activeTab === "overview" && (
                            <div className="flex items-center gap-2 bg-white rounded-lg p-1 border">
                                <Filter className="h-4 w-4 text-[#8A8880] ml-2" />
                                <select
                                    className="bg-transparent text-sm text-[#4A4A45] font-medium p-1 outline-none cursor-pointer"
                                    value={days}
                                    onChange={(e) => setDays(Number(e.target.value) as 7 | 30 | 90)}
                                >
                                    <option value={7}>Last 7 Days</option>
                                    <option value={30}>Last 30 Days</option>
                                    <option value={90}>Last 90 Days</option>
                                </select>
                            </div>
                        )}
                        <div className="flex gap-1 bg-white rounded-lg p-1 border border-[#E8E6E0] shrink-0 overflow-x-auto no-scrollbar">
                            {(["overview", "users", "invoices", "quotes", "clients_global", "activity", "ai"] as const).map((tab) => (
                                <button key={tab} onClick={() => { setActiveTab(tab); setSearchTerm(""); }}
                                    className={`px-4 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab ? "bg-[#1A1A18] text-white shadow-sm" : "text-[#8A8880] hover:text-[#1A1A18]"}`}>
                                    {tab === "ai" ? "AI Stats" : tab === "clients_global" ? "Address Book" : tab}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {activeTab === "overview" && (
                    <>
                        {/* ── KPI Cards ──────────────────────────────── */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            {[
                                { label: "Total Quotes", value: o.total_quotes.toString(), icon: FileText, sub: `${o.quotes_this_month} this month`, color: "#10b981" },
                                { label: "Total Invoices", value: o.total_invoices.toString(), icon: FileText, sub: `${o.invoices_this_month} this month`, color: "#4A7C59" },
                                { label: "Saved Clients", value: o.total_clients.toString(), icon: Users, sub: "Address Book", color: "#6366f1" },
                                { label: "AI Success", value: `${aiSuccessRate}%`, icon: Zap, sub: `${o.total_extractions} total (${o.avg_extraction_time_ms}ms avg)`, color: "#9333ea" },
                            ].map((kpi, i) => (
                                <Card key={i} className="overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="p-1.5 rounded-lg" style={{ background: `${kpi.color}10` }}>
                                                <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
                                            </div>
                                        </div>
                                        <p className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-mono)" }}>{kpi.value}</p>
                                        <p className="text-xs text-[#4A4A45] mt-0.5">{kpi.label}</p>
                                        <p className="text-[10px] mt-1.5" style={{ color: kpi.color }}>{kpi.sub}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: "Active Users (DAU / MAU)", value: `${o.dau} / ${o.mau}`, icon: Activity, sub: `${o.active_users_week} active this week`, color: "#2563eb" },
                                { label: "MRR / ARR", value: `$${mrr.toLocaleString()} / $${o.arr.toLocaleString()}`, icon: DollarSign, sub: `${o.pro_users} pro users`, color: "#D4A017" },
                                { label: "Churn / Retention", value: `${o.churn_rate.toFixed(1)}% / ${o.retention_rate.toFixed(1)}%`, icon: TrendingUp, sub: `over last ${days} days`, color: "#ea580c" },
                            ].map((kpi, i) => (
                                <Card key={i} className="overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="p-1.5 rounded-lg" style={{ background: `${kpi.color}10` }}>
                                                <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
                                            </div>
                                        </div>
                                        <p className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-mono)" }}>{kpi.value}</p>
                                        <p className="text-xs text-[#4A4A45] mt-0.5">{kpi.label}</p>
                                        <p className="text-[10px] mt-1.5" style={{ color: kpi.color }}>{kpi.sub}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* ── Growth Charts ──────────────────────────── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <UserPlus className="h-4 w-4 text-[#2563eb]" />
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A18]">User Growth <span className="text-[#8A8880] font-medium ml-1">({days}d)</span></p>
                                    </div>
                                    <BarChart data={data.user_growth.map(g => ({ label: g.date.slice(5), value: g.count }))} color="#2563eb" height={100} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Activity className="h-4 w-4 text-[#4A7C59]" />
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A18]">Invoice Volume <span className="text-[#8A8880] font-medium ml-1">({days}d)</span></p>
                                    </div>
                                    <BarChart data={data.invoice_growth.map(g => ({ label: g.date.slice(5), value: g.count }))} color="#4A7C59" height={100} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <FileText className="h-4 w-4 text-[#D4A017]" />
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A18]">Quote Volume <span className="text-[#8A8880] font-medium ml-1">({days}d)</span></p>
                                    </div>
                                    <BarChart data={data.quote_growth.map(g => ({ label: g.date.slice(5), value: g.count }))} color="#D4A017" height={100} />
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardContent className="p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp className="h-4 w-4 text-[#D4A017]" />
                                    <p className="text-sm font-medium">Revenue <span className="text-[#8A8880] font-normal">({days} days)</span></p>
                                    <span className="ml-auto text-sm font-mono text-[#D4A017]">${o.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <Sparkline data={data.revenue_growth.map(g => g.amount)} color="#D4A017" height={60} />
                            </CardContent>
                        </Card>

                        {/* Status Breakdown Section (Future implementation or mini indicators) */}
                    </>
                )}

                {activeTab === "quotes" && (
                    <Card>
                        <CardContent className="p-0">
                            <div className="p-4 border-b bg-[#FDFCFA]">
                                <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><FileText className="h-4 w-4 text-[#D4A017]" /> System Quotes</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-[#F5F3EE]/50">
                                            <th className="text-left px-4 py-3 text-[10px] font-bold text-[#8A8880] uppercase tracking-widest">Quote #</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-bold text-[#8A8880] uppercase tracking-widest">Creator</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-bold text-[#8A8880] uppercase tracking-widest">Recipient</th>
                                            <th className="text-center px-4 py-3 text-[10px] font-bold text-[#8A8880] uppercase tracking-widest">Status</th>
                                            <th className="text-right px-4 py-3 text-[10px] font-bold text-[#8A8880] uppercase tracking-widest">Amount</th>
                                            <th className="text-right px-4 py-3 text-[10px] font-bold text-[#8A8880] uppercase tracking-widest">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recent_quotes.filter(q =>
                                            !searchTerm ||
                                            q.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            q.to_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (q.user_email || "").toLowerCase().includes(searchTerm.toLowerCase())
                                        ).map((q) => (
                                            <tr key={q.id} className="border-b border-[#F5F3EE] hover:bg-white transition-colors">
                                                <td className="px-4 py-3 font-mono text-[11px] font-bold text-[#1A1A18]">{q.quote_number}</td>
                                                <td className="px-4 py-3 text-xs text-[#8A8880]">{q.user_email || "Anonymous"}</td>
                                                <td className="px-4 py-3 text-xs font-medium">{q.to_name}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${q.status === 'converted' ? 'bg-green-100 text-green-700' :
                                                        q.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {q.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-xs">{q.currency_symbol}{q.total.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right text-[10px] text-[#8A8880] font-medium">{new Date(q.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === "clients_global" && (
                    <Card>
                        <CardContent className="p-0">
                            <div className="p-4 border-b bg-[#FDFCFA]">
                                <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Users className="h-4 w-4 text-[#6366f1]" /> Global Address Book</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-[#F5F3EE]/50">
                                            <th className="text-left px-4 py-3 text-[10px] font-bold text-[#8A8880] uppercase tracking-widest">Client Name</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-bold text-[#8A8880] uppercase tracking-widest">Client Email</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-bold text-[#8A8880] uppercase tracking-widest">Saved By</th>
                                            <th className="text-right px-4 py-3 text-[10px] font-bold text-[#8A8880] uppercase tracking-widest">Date Saved</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recent_clients.filter(c =>
                                            !searchTerm ||
                                            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (c.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (c.user_email || "").toLowerCase().includes(searchTerm.toLowerCase())
                                        ).map((c) => (
                                            <tr key={c.id} className="border-b border-[#F5F3EE] hover:bg-white transition-colors">
                                                <td className="px-4 py-3 font-bold text-[#1A1A18]">{c.name}</td>
                                                <td className="px-4 py-3 text-xs text-[#8A8880]">{c.email || "—"}</td>
                                                <td className="px-4 py-3 text-xs font-medium text-[#4A4A45]">{c.user_email || "System"}</td>
                                                <td className="px-4 py-3 text-right text-[10px] text-[#8A8880] font-medium">{new Date(c.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === "users" && (
                    <Card>
                        <CardContent className="p-0">
                            <div className="p-4 border-b bg-[#FAF9F6]">
                                <h2 className="text-base font-medium flex items-center gap-2"><Users className="h-4 w-4" /> All Users</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-[#F5F3EE]/50">
                                            <th className="text-left px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">User</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Geo</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Plan</th>
                                            <th className="text-right px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Invoices</th>
                                            <th className="text-right px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Joined</th>
                                            <th className="text-right px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Last Active</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recent_users.filter(u =>
                                            !searchTerm ||
                                            (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            u.email.toLowerCase().includes(searchTerm.toLowerCase())
                                        ).map((u) => (
                                            <tr key={u.id} className="border-b border-[#F5F3EE] hover:bg-[#FDFCFA] transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-[#F5F3EE] flex items-center justify-center text-xs font-medium shrink-0">
                                                            {(u.name || u.email)[0]?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-[#1A1A18]"><a href={`mailto:${u.email}`} className="hover:underline">{u.name || "—"}</a></p>
                                                            <p className="text-xs text-[#8A8880]">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <CountryFlag code={u.country_code} name={u.country_name} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    {u.subscription_status === "pro" ? (
                                                        <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-[#D4A017]/10 text-[#D4A017]">PRO</span>
                                                    ) : (
                                                        <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-[#F5F3EE] text-[#4A4A45]">FREE</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono">{u.invoice_count}</td>
                                                <td className="px-4 py-3 text-right text-xs text-[#4A4A45]">{new Date(u.created_at).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-right text-xs text-[#8A8880]">{u.last_active ? new Date(u.last_active).toLocaleDateString() : "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === "invoices" && (
                    <Card>
                        <CardContent className="p-0">
                            <div className="p-4 border-b bg-[#FAF9F6]">
                                <h2 className="text-base font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Recent Invoices</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-[#F5F3EE]/50">
                                            <th className="text-left px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Inv #</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Creator</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">From → To</th>
                                            <th className="text-right px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Amount</th>
                                            <th className="text-right px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recent_invoices.filter(inv =>
                                            !searchTerm ||
                                            inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (inv.user_email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            inv.from_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            inv.to_name.toLowerCase().includes(searchTerm.toLowerCase())
                                        ).map((inv) => (
                                            <tr key={inv.id} className="border-b border-[#F5F3EE] hover:bg-[#FDFCFA] transition-colors">
                                                <td className="px-4 py-3 font-mono font-medium text-xs">{inv.invoice_number}</td>
                                                <td className="px-4 py-3 text-xs text-[#4A4A45]">{inv.user_email || "Anonymous"}</td>
                                                <td className="px-4 py-3">
                                                    <span className="font-medium text-[#1A1A18]">{inv.from_name}</span>
                                                    <span className="mx-2 text-[#8A8880]">→</span>
                                                    <span>{inv.to_name}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-medium">
                                                    {inv.currency_symbol}{inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs text-[#8A8880]">{new Date(inv.created_at).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === "activity" && (
                    <Card>
                        <CardContent className="p-0">
                            <div className="p-4 border-b bg-[#FAF9F6]">
                                <h2 className="text-base font-medium flex items-center gap-2"><Activity className="h-4 w-4" /> Activity Feed</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-[#F5F3EE]/50">
                                            <th className="text-left px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Action</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">User</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Geo</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Details</th>
                                            <th className="text-right px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recent_activity.filter(a =>
                                            !searchTerm ||
                                            a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (a.user_email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (a.details || "").toLowerCase().includes(searchTerm.toLowerCase())
                                        ).map((a, i) => (
                                            <tr key={i} className="border-b border-[#F5F3EE] hover:bg-[#FDFCFA] transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#E8E6E0] text-[#4A4A45] uppercase">
                                                        {a.action}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-[#1A1A18]">{a.user_email || "Anonymous"}</td>
                                                <td className="px-4 py-3 text-xs">
                                                    <CountryFlag code={a.country_code} name={a.country_name} />
                                                </td>
                                                <td className="px-4 py-3 text-xs text-[#8A8880] truncate max-w-xs">{a.details || "—"}</td>
                                                <td className="px-4 py-3 text-right text-xs text-[#8A8880]">{new Date(a.created_at).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === "ai" && (
                    <Card>
                        <CardContent className="p-0">
                            <div className="p-4 border-b bg-[#FAF9F6] grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-[#8A8880] uppercase tracking-wider font-medium">Extractions</p>
                                    <p className="text-2xl font-semibold font-mono">{o.total_extractions}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#8A8880] uppercase tracking-wider font-medium">Success Rate</p>
                                    <p className="text-2xl font-semibold font-mono text-[#4A7C59]">{aiSuccessRate}%</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#8A8880] uppercase tracking-wider font-medium">Avg Latency</p>
                                    <p className="text-2xl font-semibold font-mono">{o.avg_extraction_time_ms}ms</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-[#F5F3EE]/50">
                                            <th className="text-center px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Status</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Metrics</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Error Details</th>
                                            <th className="text-right px-4 py-3 text-xs font-medium text-[#4A4A45] uppercase tracking-wider">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recent_extractions.filter(e =>
                                            !searchTerm ||
                                            (e.error_message || "").toLowerCase().includes(searchTerm.toLowerCase())
                                        ).map((e, i) => (
                                            <tr key={i} className="border-b border-[#F5F3EE] hover:bg-[#FDFCFA] transition-colors">
                                                <td className="px-4 py-3 text-center">
                                                    {e.success ? (
                                                        <CheckCircle2 className="h-4 w-4 text-[#4A7C59] inline-block" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-[#C0392B] inline-block" />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    <span className="font-mono">{e.response_time_ms}ms</span>
                                                    <span className="mx-2 text-[#E8E6E0]">|</span>
                                                    {e.items_extracted} items
                                                </td>
                                                <td className="px-4 py-3 text-xs text-[#C0392B] truncate max-w-md">{e.error_message || "—"}</td>
                                                <td className="px-4 py-3 text-right text-xs text-[#8A8880]">{new Date(e.created_at).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
