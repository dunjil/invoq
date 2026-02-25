"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Clock, MessageSquare, Send, CheckCircle2, AlertCircle, FileText, Download, User, Calendar, ExternalLink, Mail, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface QuoteItem {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface QuoteComment {
    id: string;
    author_name: string;
    content: string;
    is_from_creator: boolean;
    created_at: string;
}

interface QuoteData {
    id: string;
    status: string;
    quote_number: string;
    quote_date: string;
    due_date?: string;
    from_name: string;
    to_name: string;
    subtotal: number;
    total: number;
    currency_symbol: string;
    tracked_link_token?: string; // Added for the request review functionality
}

export default function QuotePage() {
    const { token: authToken } = useAuth();
    const { token } = useParams();
    const [quote, setQuote] = useState<QuoteData | null>(null);
    const [items, setItems] = useState<QuoteItem[]>([]);
    const [comments, setComments] = useState<QuoteComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [signModalOpen, setSignModalOpen] = useState(false);
    const [approving, setApproving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const [newComment, setNewComment] = useState("");
    const [authorName, setAuthorName] = useState("");
    const [postingComment, setPostingComment] = useState(false);

    const [isOwner, setIsOwner] = useState(false); // Placeholder for owner check
    const [isRequestingReview, setIsRequestingReview] = useState(false);

    // Signature Canvas Ref & State
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);

    useEffect(() => {
        if (!token) return;
        const fetchQuote = async () => {
            try {
                const res = await fetch(`${API_URL}/api/quotes/track/${token}`);
                const data = await res.json();
                if (data.success) {
                    setQuote(data.quote);
                    setItems(data.items || []);
                    setComments(data.comments || []);
                    setAuthorName(data.quote.to_name); // Default comment author to the recipient
                    setIsOwner(data.quote.status === 'draft');
                } else {
                    setMessage(data.detail || "Unable to load document");
                }
            } catch (err: any) {
                setMessage(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchQuote();
    }, [token]);

    // Canvas Drawing Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx?.beginPath();
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ("touches" in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#1A1A18";

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        setHasSigned(true);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
    };

    const handleApprove = async () => {
        if (!hasSigned) {
            toast.error("Please provide a signature");
            return;
        }

        const canvas = canvasRef.current;
        const signatureData = canvas?.toDataURL("image/png");

        setApproving(true);
        try {
            const res = await fetch(`${API_URL}/api/quotes/${token}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signature_data: signatureData })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                setQuote((prev) => prev ? { ...prev, status: "converted" } : null);
                setSignModalOpen(false);
            } else {
                toast.error(data.error || "Failed to approve quote");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setApproving(false);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || !authorName.trim()) return;
        setPostingComment(true);
        try {
            const res = await fetch(`${API_URL}/api/quotes/${token}/comments`, {
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
        if (!quote || !authToken) return;
        setIsRequestingReview(true);
        try {
            const res = await fetch(`${API_URL}/api/quotes/${quote.tracked_link_token}/request-review`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`
                },
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || "Review requested successfully!");
                setQuote((prev) => prev ? { ...prev, status: "sent" } : null); // Update status to sent
                setIsOwner(false); // No longer owner's view once sent
            } else {
                toast.error(data.detail || "Failed to request review.");
            }
        } catch (err: any) {
            toast.error("Network error requesting review.");
        } finally {
            setIsRequestingReview(false);
        }
    };

    const handleDownloadOriginal = () => {
        const link = document.createElement("a");
        link.href = `${API_URL}/api/quotes/${token}/pdf`;
        link.download = `Quote_${quote?.quote_number || 'download'}.pdf`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen bg-[#FAF9F6]">Loading...</div>;
    if (message || !quote) return <div className="flex justify-center items-center min-h-screen font-mono text-red-500 bg-[#FAF9F6]">{message || "Document not found"}</div>;

    return (
        <div className="min-h-screen bg-[#FAF9F6] py-4 sm:py-12 px-0 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto bg-white shadow-2xl rounded-none sm:rounded-xl ring-1 ring-black/[0.04] p-6 sm:p-12 relative overflow-hidden">
                {/* Status Badge */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                    <span className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider ${quote.status === 'converted' ? 'bg-green-100 text-green-800' :
                        quote.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            quote.status === 'viewed' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                        }`}>
                        {quote.status}
                    </span>
                </div>

                {/* Header */}
                <div className="mb-10 pt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-light text-[#D4A017] mb-2 tracking-wide font-serif">QUOTE</h1>
                        <div className="text-xs sm:text-sm text-[#8A8880] space-y-1">
                            <p><strong>Quote #:</strong> {quote.quote_number}</p>
                            <p><strong>Date:</strong> {quote.quote_date}</p>
                            {quote.due_date && <p><strong>Valid Until:</strong> {quote.due_date}</p>}
                        </div>
                    </div>
                    {quote && (
                        <Button variant="outline" size="sm" onClick={handleDownloadOriginal} className="text-[#8A8880] hover:text-[#1A1A18] w-full sm:w-auto">
                            Download PDF
                        </Button>
                    )}
                </div>

                {/* Parties */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-10 text-sm">
                    <div>
                        <h3 className="text-[10px] font-semibold text-[#D4A017] uppercase tracking-wider mb-2 border-b border-[#E8E6E0] pb-1">From</h3>
                        <p className="font-medium text-[#1A1A18] whitespace-pre-wrap">{quote.from_name}</p>
                    </div>
                    <div>
                        <h3 className="text-[10px] font-semibold text-[#D4A017] uppercase tracking-wider mb-2 border-b border-[#E8E6E0] pb-1">Quote For</h3>
                        <p className="font-medium text-[#1A1A18] whitespace-pre-wrap">{quote.to_name}</p>
                    </div>
                </div>

                {/* Request Review Button for Owners */}
                {isOwner && quote?.status === "draft" && (
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
                                <th className="pb-3 font-semibold text-[#8A8880] uppercase text-xs tracking-wider">Description</th>
                                <th className="pb-3 text-center font-semibold text-[#8A8880] uppercase text-xs tracking-wider">Qty</th>
                                <th className="pb-3 text-right font-semibold text-[#8A8880] uppercase text-xs tracking-wider">Unit Price</th>
                                <th className="pb-3 text-right font-semibold text-[#8A8880] uppercase text-xs tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E6E0]/50">
                            {items.map((item, i) => (
                                <tr key={i} className="group hover:bg-black/[0.01] transition-colors">
                                    <td className="py-4 text-[#4A4A45]">{item.description}</td>
                                    <td className="py-4 text-center text-[#8A8880]">{item.quantity}</td>
                                    <td className="py-4 text-right text-[#8A8880]">{quote.currency_symbol}{item.unit_price.toFixed(2)}</td>
                                    <td className="py-4 text-right font-medium text-[#1A1A18]">{quote.currency_symbol}{item.total.toFixed(2)}</td>
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
                            <span>{quote.currency_symbol}{quote.subtotal?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between text-lg sm:text-xl font-medium text-[#D4A017] pt-3 border-t border-[#E8E6E0]">
                            <span>Total</span>
                            <span>{quote.currency_symbol}{quote.total?.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                {quote.status !== "converted" && quote.status !== "approved" && (
                    <div className="flex justify-center border-t border-[#E8E6E0] pt-10">
                        <Button
                            size="lg"
                            className="w-full max-w-sm h-14 text-base font-medium shadow-xl shadow-[#D4A017]/10 bg-[#D4A017] hover:bg-[#B8860B] hover:-translate-y-0.5 transition-all duration-200 text-white"
                            onClick={() => setSignModalOpen(true)}
                        >
                            Approve & Sign Quote
                        </Button>
                    </div>
                )}

                {quote.status === "converted" && (
                    <div className="mt-8 p-4 bg-green-50 text-green-800 rounded-lg text-center text-sm border border-green-200">
                        This quote has been approved and successfully converted into an invoice.
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

            {/* Interactive Signature Modal */}
            <Dialog open={signModalOpen} onOpenChange={setSignModalOpen}>
                <DialogContent className="sm:max-w-md bg-white p-0 overflow-hidden border-[#E8E6E0]">
                    <DialogHeader className="p-6 bg-[#FAF9F6] border-b border-[#E8E6E0]">
                        <DialogTitle className="text-xl font-medium text-[#1A1A18]">Digital Signature</DialogTitle>
                    </DialogHeader>
                    <div className="p-8">
                        <div className="relative">
                            <canvas
                                ref={canvasRef}
                                width={400}
                                height={200}
                                onMouseDown={startDrawing}
                                onMouseUp={stopDrawing}
                                onMouseMove={draw}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchEnd={stopDrawing}
                                onTouchMove={draw}
                                className="border-2 border-dashed border-[#D5D3CC] rounded-xl w-full h-48 bg-[#FAF9F6] cursor-crosshair touch-none"
                            />
                            {hasSigned && (
                                <button
                                    onClick={clearSignature}
                                    className="absolute top-2 right-2 text-[10px] text-[#8A8880] uppercase tracking-widest font-bold hover:text-red-500 transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                            {!hasSigned && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[#8A8880] text-sm italic">
                                    Sign here...
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-[#8A8880] text-center mt-6">By signing, you agree to the terms and authorize the generation of an invoice for the quoted amount.</p>
                    </div>
                    <DialogFooter className="p-6 bg-[#FAF9F6] border-t border-[#E8E6E0] flex gap-3">
                        <Button variant="outline" className="flex-1 border-[#D5D3CC] text-[#4A4A45] hover:bg-white hover:text-[#1A1A18]" onClick={() => setSignModalOpen(false)}>Cancel</Button>
                        <Button className="flex-1 bg-[#D4A017] hover:bg-[#B8860B] text-white shadow-sm" onClick={handleApprove} disabled={approving || !hasSigned}>
                            {approving ? "Approving..." : "Accept & Sign"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
