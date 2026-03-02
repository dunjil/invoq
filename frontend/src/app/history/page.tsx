"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Plus, Eye, Download, Loader2, ChevronDown, PenTool } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { Package } from "lucide-react";

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
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewHtml, setPreviewHtml] = useState("");
    const [isFetchingPreview, setIsFetchingPreview] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [selectedDocForTemplate, setSelectedDocForTemplate] = useState<DocumentSummary | null>(null);
    const [templateName, setTemplateName] = useState("");
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    const handlePreview = async (doc: DocumentSummary) => {
        setIsPreviewOpen(true);
        setIsFetchingPreview(true);
        setPreviewHtml("");

        let endpoint = "";
        const type = doc.type.toUpperCase();
        if (['CONTRACT', 'NDA', 'MSA', 'SOW'].includes(type)) {
            endpoint = `${API_URL}/api/contracts/track/${doc.token}`;
        } else if (type === 'INVOICE') {
            endpoint = `${API_URL}/api/invoice/track/${doc.token}`;
        } else if (type === 'QUOTE') {
            endpoint = `${API_URL}/api/quotes/track/${doc.token}`;
        }

        try {
            const res = await fetch(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.rendered_html) {
                setPreviewHtml(data.rendered_html);
            } else {
                setPreviewHtml("<div class='p-12 text-center text-[#8A8880]'>Failed to load preview.</div>");
            }
        } catch (err) {
            setPreviewHtml("<div class='p-12 text-center text-[#8A8880]'>Error connecting to server.</div>");
        } finally {
            setIsFetchingPreview(false);
        }
    };

    const handleDownload = async (doc: DocumentSummary, format: 'pdf' | 'docx' = 'pdf') => {
        setDownloadingId(`${doc.id}_${format}`);

        let endpoint = "";
        const type = doc.type.toUpperCase();
        if (['CONTRACT', 'NDA', 'MSA', 'SOW'].includes(type)) {
            endpoint = `${API_URL}/api/contracts/${doc.token}/${format}`;
        } else if (type === 'INVOICE') {
            endpoint = `${API_URL}/api/invoice/${doc.token}/${format}`;
        } else if (type === 'QUOTE') {
            endpoint = `${API_URL}/api/quotes/${doc.token}/${format}`;
        }

        try {
            const res = await fetch(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.download_url) {
                window.open(`${API_URL}${data.download_url}`, '_blank');
            }
        } catch (err) {
            console.error("Download failed", err);
        } finally {
            setDownloadingId(null);
        }
    };

    const handleSaveAsTemplate = async () => {
        if (!selectedDocForTemplate || !templateName) return;
        setIsSavingTemplate(true);
        try {
            const res = await fetch(`${API_URL}/api/onboarding/templates/${selectedDocForTemplate.id}/save-as-template?template_name=${encodeURIComponent(templateName)}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Document saved as template!");
                setIsTemplateDialogOpen(false);
                setTemplateName("");
            } else {
                toast.error(data.detail || "Failed to save template");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setIsSavingTemplate(false);
        }
    };

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
            <AppHeader />

            <main className="max-w-3xl mx-auto px-5 py-10 animate-fade-in flex-1 w-full">
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-[#8A8880] uppercase tracking-widest mb-2">Type</label>
                        <div className="flex bg-[#F5F3EE] p-1 rounded-lg flex-wrap gap-1">
                            {["all", "QUOTE", "INVOICE", "CONTRACT", "NDA", "MSA"].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTypeFilter(t)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${typeFilter === t ? "bg-white text-[#1A1A18] shadow-sm" : "text-[#8A8880] hover:text-[#1A1A18]"}`}
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
                            let linkHref = `/view/${doc.token}`;

                            if (doc.type.toLowerCase() === 'invoice') {
                                linkHref = `/view/invoice/${doc.token}`;
                            } else if (['contract', 'nda', 'msa'].includes(doc.type.toLowerCase())) {
                                linkHref = `/view/contract/${doc.token}`;
                            }

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
                                            <CardContent className="py-4 px-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-start md:items-center gap-4">
                                                    <div className="w-12 h-12 bg-[#F5F3EE] rounded-xl flex items-center justify-center shrink-0 border border-[#E8E6E0]/50 shadow-sm">
                                                        <FileText className="h-5 w-5 text-[#8A8880]" />
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <p className="text-base font-medium font-mono text-[#1A1A18] leading-none">{doc.document_number}</p>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${doc.type === "QUOTE" ? "bg-[#D4A017]/10 text-[#D4A017]" : ['CONTRACT', 'NDA', 'MSA'].includes(doc.type) ? "bg-purple-100 text-purple-700" : "bg-[#1A1A18]/5 text-[#1A1A18]"}`}>
                                                                {doc.type}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${statusColors[doc.status] || "bg-[#F5F3EE] text-[#8A8880]"}`}>
                                                                {doc.status}
                                                            </span>
                                                            {doc.comment_count > 0 && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold tracking-widest uppercase">
                                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                                                    {doc.comment_count}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-[#8A8880] flex items-center gap-1.5">
                                                            <span className="font-medium text-[#4A4A45]">{doc.to_name}</span>
                                                            <span className="w-1 h-1 rounded-full bg-[#E8E6E0]" />
                                                            <span>{new Date(doc.document_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0 border-[#F5F3EE]">
                                                    <div className="text-left md:text-right shrink-0">
                                                        {['CONTRACT', 'NDA', 'MSA'].includes(doc.type) ? (
                                                            <p className="text-lg font-serif text-[#8A8880]">--</p>
                                                        ) : (
                                                            <p className="text-lg font-serif text-[#1A1A18]">{doc.currency_symbol}{doc.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                        )}
                                                        <p className="text-[10px] text-[#8A8880] font-mono mt-0.5 uppercase tracking-wider">Created {new Date(doc.created_at).toLocaleDateString()}</p>
                                                    </div>

                                                    {/* Consistently Styled "More" Dropdown to De-noise UI */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#8A8880] hover:text-[#1A1A18] hover:bg-[#F5F3EE]">
                                                                <ChevronDown className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48 bg-white border-[#E8E6E0] shadow-xl">
                                                            <DropdownMenuItem onClick={(e) => { e.preventDefault(); handlePreview(doc); }} className="text-xs font-medium py-2 focus:bg-[#FAF9F6]">
                                                                <Eye className="h-3.5 w-3.5 mr-2 text-[#8A8880]" /> Preview Document
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleDownload(doc, 'pdf'); }} className="text-xs font-medium py-2 focus:bg-[#FAF9F6]">
                                                                <Download className="h-3.5 w-3.5 mr-2 text-[#8A8880]" /> Download PDF
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleDownload(doc, 'docx'); }} className="text-xs font-medium py-2 focus:bg-[#FAF9F6]">
                                                                <FileText className="h-3.5 w-3.5 mr-2 text-[#8A8880]" /> Download Word (.docx)
                                                            </DropdownMenuItem>
                                                            <div className="h-px bg-[#F5F3EE] my-1" />
                                                            <DropdownMenuItem asChild className="text-xs font-medium py-2 focus:bg-[#FAF9F6]">
                                                                <Link href={`/create/${doc.type.toLowerCase()}?edit=${doc.token}`}>
                                                                    <PenTool className="h-3.5 w-3.5 mr-2 text-[#8A8880]" /> Edit Details
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild className="text-xs font-medium py-2 focus:bg-[#FAF9F6]">
                                                                <Link href={`/create/${doc.type.toLowerCase()}?duplicate=${doc.type.toLowerCase()}_${doc.token}`}>
                                                                    <Plus className="h-3.5 w-3.5 mr-2 text-[#8A8880]" /> Duplicate Base
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <div className="h-px bg-[#F5F3EE] my-1" />
                                                            <DropdownMenuItem onClick={(e) => {
                                                                e.preventDefault();
                                                                setSelectedDocForTemplate(doc);
                                                                setTemplateName(doc.document_number);
                                                                setIsTemplateDialogOpen(true);
                                                            }} className="text-xs font-medium py-2 focus:bg-orange-50 text-[#D4A017]">
                                                                <Package className="h-3.5 w-3.5 mr-2" /> Save as Template
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                </div>
                            )

                        })}
                    </div>
                )}
            </main>
            <AppFooter maxWidth="max-w-3xl" />

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-[#FAF9F6] border-[#E8E6E0]">
                    <DialogHeader className="p-4 border-b border-[#E8E6E0] bg-white">
                        <DialogTitle className="text-sm font-bold uppercase tracking-widest text-[#4A4A45] flex items-center gap-2">
                            <Eye className="h-4 w-4 text-[#D4A017]" /> Document Preview
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto p-6 md:p-10 scrollbar-hide">
                        {isFetchingPreview ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <Loader2 className="h-8 w-8 animate-spin text-[#D4A017]" />
                                <p className="text-xs font-bold uppercase tracking-widest text-[#8A8880]">Reconstructing document...</p>
                            </div>
                        ) : (
                            <div className="bg-white shadow-xl mx-auto rounded-lg overflow-hidden ring-1 ring-black/5 flex-1 flex flex-col" style={{ maxWidth: "800px", minHeight: "600px" }}>
                                <iframe
                                    srcDoc={previewHtml}
                                    className="w-full flex-1 border-none"
                                    title="Document Preview"
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-[#D4A017] mb-1">
                            <Package className="h-5 w-5" />
                            <DialogTitle className="text-lg font-bold">Save as Template</DialogTitle>
                        </div>
                        <p className="text-xs text-[#8A8880]">This will make the document available to use in onboarding bundles.</p>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#8A8880]">Template Name</Label>
                            <Input
                                placeholder="e.g. Standard NDA 2026"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                className="h-10 border-[#E8E6E0]"
                            />
                        </div>
                        <Button
                            onClick={handleSaveAsTemplate}
                            disabled={isSavingTemplate || !templateName}
                            className="w-full bg-[#1A1A18] hover:bg-[#333] h-10 rounded-full font-bold uppercase tracking-widest text-xs"
                        >
                            {isSavingTemplate ? "Saving..." : "Create Template"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
