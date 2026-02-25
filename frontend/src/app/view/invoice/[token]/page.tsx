"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { ArrowLeft, Clock, MessageSquare, Send, CheckCircle2, AlertCircle, FileText, Download, User, Calendar, ExternalLink, Mail, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface InvoiceItem {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface InvoiceComment {
    id: string;
    author_name: string;
    content: string;
    is_from_creator: boolean;
    created_at: string;
}

interface InvoiceData {
    id: string;
    status: string;
    invoice_number: string;
    invoice_date: string;
    due_date?: string;
    from_name: string;
    from_details?: string;
    to_name: string;
    to_details?: string;
    subtotal: number;
    total: number;
    currency_symbol: string;
    pdf_filename?: string;
    tracked_link_token?: string; // Added for owner view
}

export default function InvoicePage() {
    const { token: authToken } = useAuth();
    const { token } = useParams();
    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [comments, setComments] = useState<InvoiceComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [acknowledging, setAcknowledging] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const [newComment, setNewComment] = useState("");
    const [authorName, setAuthorName] = useState("");
    const [postingComment, setPostingComment] = useState(false);

    // New states for owner functionality
    const [isOwner, setIsOwner] = useState(false); // This would typically be determined by authentication/authorization
    const [isRequestingReview, setIsRequestingReview] = useState(false);

    useEffect(() => {
        if (!token) return;
        const fetchInvoice = async () => {
            try {
                const res = await fetch(`${API_URL}/api/invoice/track/${token}`);
                const data = await res.json();
                if (data.success) {
                    setInvoice(data.invoice);
                    setItems(data.items || []);
                    setComments(data.comments || []);
                    setAuthorName(data.invoice.to_name); // Default comment author
                    // Determine if the current user is the owner based on authToken and if the invoice has a tracked_link_token
                    if (authToken && data.invoice.tracked_link_token) {
                        setIsOwner(true);
                    }
                } else {
                    setMessage(data.detail || "Unable to load document");
                }
            } catch (err: any) {
                setMessage(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [token, authToken]);

    const handleAcknowledge = async () => {
        if (!invoice?.tracked_link_token) return;
        setAcknowledging(true);
        try {
            const res = await fetch(`${API_URL}/api/invoice/${invoice.tracked_link_token}/acknowledge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payment_method: "cc" }) // Extensible for later Stripe
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message || "Invoice Acknowledged");
                setInvoice((prev) => prev ? { ...prev, status: "acknowledged" } : null);
            } else {
                toast.error(data.error || "Failed to acknowledge");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setAcknowledging(false);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || !authorName.trim() || !invoice?.tracked_link_token) return;
        setPostingComment(true);
        try {
            const res = await fetch(`${API_URL}/api/invoice/${invoice.tracked_link_token}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    author_name: authorName.trim(),
                    body: newComment.trim(),
                    author_role: "client"
                })
            });
            const data = await res.json();
            if (data.success) {
                setComments([...comments, {
                    id: String(Date.now()),
                    author_name: authorName.trim(),
                    content: newComment.trim(),
                    is_from_creator: false,
                    created_at: new Date().toISOString()
                }]);
                setNewComment("");
                toast.success("Comment posted");
            } else {
                toast.error(data.error || "Failed to post comment");
            }
        } catch (err: any) {
            toast.error("Network error");
        } finally {
            setPostingComment(false);
        }
    };

    const handleRequestReview = async () => {
        if (!invoice || !authToken) return;
        setIsRequestingReview(true);
        try {
            const res = await fetch(`${API_URL}/api/invoice/${invoice.tracked_link_token}/request-review`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`
                }
            });
            const data = await res.json();
            if (res.ok) {
                setInvoice({ ...invoice, status: "sent" });
                toast.success("Review requested!");
                setIsOwner(false); // Owner view is typically for draft/editing, once sent, it's a client view
            } else {
                toast.error(data.detail || "Failed to request review");
            }
        } catch {
            toast.error("Failed to request review");
        } finally {
            setIsRequestingReview(false);
        }
    };

    const handleDownloadOriginal = () => {
        const link = document.createElement("a");
        link.href = `${API_URL}/api/invoices/${token}/pdf`;
        link.download = `Invoice_${invoice?.invoice_number || "Draft"}.pdf`;
        link.click();
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen bg-[#FAF9F6]">Loading...</div>;
    if (message || !invoice) return <div className="flex justify-center items-center min-h-screen font-mono text-red-500 bg-[#FAF9F6]">{message || "Document not found"}</div>;

    return (
        <div className="min-h-screen bg-[#F5F4EF] py-4 sm:py-12 px-0 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-none sm:rounded-xl ring-1 ring-black/[0.04] p-6 sm:p-12 relative overflow-hidden">
                {/* Status Badge */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                    <span className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'acknowledged' ? 'bg-blue-100 text-blue-800' :
                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                invoice.status === 'viewed' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                        }`}>
                        {invoice.status}
                    </span>
                </div>

                {/* Header */}
                <div className="mb-10 pt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-light text-[#1A1A18] mb-2 tracking-wide font-serif">INVOICE</h1>
                        <div className="text-xs sm:text-sm text-[#8A8880] space-y-1">
                            <p><strong>Nº:</strong> {invoice.invoice_number}</p>
                            <p><strong>Issued:</strong> {invoice.invoice_date}</p>
                            {invoice.due_date && <p><strong>Due Date:</strong> {invoice.due_date}</p>}
                        </div>
                    </div>
                    {invoice && (
                        <Button variant="outline" size="sm" onClick={handleDownloadOriginal} className="text-[#8A8880] hover:text-[#1A1A18] w-full sm:w-auto">
                            Download PDF
                        </Button>
                    )}
                </div>

                {/* Parties */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-10 text-sm">
                    <div>
                        <h3 className="text-[10px] font-semibold text-[#8A8880] uppercase tracking-wider mb-2 border-b border-[#E8E6E0] pb-1">From</h3>
                        <p className="font-medium text-[#1A1A18] whitespace-pre-wrap">{invoice.from_name}</p>
                        {invoice.from_details && <p className="text-[#4A4A45] mt-1 whitespace-pre-wrap text-xs">{invoice.from_details}</p>}
                    </div>
                    <div>
                        <h3 className="text-[10px] font-semibold text-[#8A8880] uppercase tracking-wider mb-2 border-b border-[#E8E6E0] pb-1">Billed To</h3>
                        <p className="font-medium text-[#1A1A18] whitespace-pre-wrap">{invoice.to_name}</p>
                        {invoice.to_details && <p className="text-[#4A4A45] mt-1 whitespace-pre-wrap text-xs">{invoice.to_details}</p>}
                    </div>
                </div>

                {/* Request Review Button for Owners */}
                {isOwner && invoice?.status === "draft" && (
                    <div className="mb-6">
                        <Button
                            onClick={handleRequestReview}
                            disabled={isRequestingReview}
                            className="w-full bg-[#D4A017] hover:bg-[#B8860B] text-white py-6 text-base font-medium shadow-lg shadow-[#D4A017]/20"
                        >
                            {isRequestingReview ? (
                                "Requesting..."
                            ) : (
                                <>
                                    <Send className="h-5 w-5 mr-2" /> Request Review
                                </>
                            )}
                        </Button>
                        <p className="text-[10px] text-center text-[#8A8880] mt-2 uppercase tracking-widest font-bold">
                            Mark as sent and notify your client
                        </p>
                    </div>
                )}

                {/* Line Items */}
                <div className="mb-10 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#E8E6E0] text-left">
                                <th className="pb-3 font-semibold text-[#1A1A18] uppercase text-xs tracking-wider">Description</th>
                                <th className="pb-3 text-center font-semibold text-[#1A1A18] uppercase text-xs tracking-wider">Qty</th>
                                <th className="pb-3 text-right font-semibold text-[#1A1A18] uppercase text-xs tracking-wider">Unit Price</th>
                                <th className="pb-3 text-right font-semibold text-[#1A1A18] uppercase text-xs tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E6E0]/50">
                            {items.map((item, i) => (
                                <tr key={i} className="group hover:bg-[#FAF9F6] transition-colors">
                                    <td className="py-4 text-[#1A1A18]">{item.description}</td>
                                    <td className="py-4 text-center text-[#8A8880]">{item.quantity}</td>
                                    <td className="py-4 text-right text-[#8A8880]">{invoice.currency_symbol}{item.unit_price.toFixed(2)}</td>
                                    <td className="py-4 text-right font-medium text-[#1A1A18]">{invoice.currency_symbol}{item.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-full sm:w-64 space-y-3">
                        <div className="flex justify-between text-sm text-[#8A8880]">
                            <span>Subtotal</span>
                            <span>{invoice.currency_symbol}{invoice.subtotal?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between text-lg sm:text-xl font-medium text-[#D4A017] pt-3 border-t border-[#E8E6E0]">
                            <span>Balance Due</span>
                            <span>{invoice.currency_symbol}{invoice.total?.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                {invoice.status !== "acknowledged" && invoice.status !== "paid" && (
                    <div className="flex justify-center border-t border-[#E8E6E0] pt-10">
                        <div className="w-full max-w-sm flex flex-col gap-3">
                            <Button
                                size="lg"
                                className="w-full h-14 text-base font-medium shadow-xl shadow-[#1A1A18]/10 bg-[#1A1A18] hover:bg-[#333] hover:-translate-y-0.5 transition-all duration-200 text-white"
                                onClick={handleAcknowledge}
                                disabled={acknowledging}
                            >
                                {acknowledging ? "Processing..." : "Acknowledge & Schedule Payment"}
                            </Button>
                            <p className="text-center text-xs text-[#8A8880]">This notifies the sender that you have received and approved this invoice for payment.</p>
                        </div>
                    </div>
                )}

                {invoice.status === "acknowledged" && (
                    <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-lg text-center text-sm border border-blue-200">
                        You have acknowledged this invoice. The freelancer has been notified.
                    </div>
                )}
            </div>

            {/* Comments Thread */}
            <div className="max-w-3xl mx-auto mt-4 sm:mt-8 bg-white shadow-lg rounded-none sm:rounded-xl ring-1 ring-black/[0.04] p-6 sm:p-8">
                <h3 className="text-base sm:text-lg font-medium text-[#1A1A18] mb-6 font-serif tracking-wide border-b border-[#E8E6E0] pb-2">Discussion & Revision</h3>

                <div className="space-y-6 mb-8">
                    {comments.length === 0 ? (
                        <p className="text-sm text-[#8A8880] text-center italic py-4">No comments yet. Have a question or request a change?</p>
                    ) : (
                        comments.map((c, i) => (
                            <div key={i} className={`flex flex-col ${c.is_from_creator ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${c.is_from_creator ? 'bg-[#F2EFE9] text-[#1A1A18] rounded-tr-sm' : 'bg-[#1A1A18] text-white rounded-tl-sm'}`}>
                                    <div className="flex items-baseline justify-between gap-4 mb-1">
                                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${c.is_from_creator ? 'text-[#8A8880]' : 'text-[#E8E6E0]'}`}>{c.author_name}</span>
                                        <span className={`text-[10px] ${c.is_from_creator ? 'text-[#8A8880]' : 'text-[#A09E96]'}`}>{new Date(c.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{c.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E8E6E0]">
                    <div className="mb-3">
                        <label className="text-xs font-semibold text-[#8A8880] uppercase tracking-wider block mb-1">Your Name</label>
                        <input
                            type="text"
                            value={authorName}
                            onChange={e => setAuthorName(e.target.value)}
                            className="w-full sm:w-64 px-3 py-2 text-sm bg-white border border-[#E8E6E0] rounded-lg focus:outline-none focus:border-[#D4A017] transition-colors"
                        />
                    </div>
                    <div className="mb-3">
                        <label className="text-xs font-semibold text-[#8A8880] uppercase tracking-wider block mb-1">Message</label>
                        <textarea
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Add a comment or ask a question..."
                            rows={3}
                            className="w-full px-3 py-2 text-sm bg-white border border-[#E8E6E0] rounded-lg focus:outline-none focus:border-[#D4A017] transition-colors resize-none"
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            onClick={handlePostComment}
                            disabled={postingComment || !newComment.trim() || !authorName.trim()}
                            className="bg-[#1A1A18] hover:bg-[#333] text-white"
                        >
                            {postingComment ? "Posting..." : "Post Comment"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
