"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "@/components/shared/signature-pad";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building, Send, Plus, Fingerprint, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { RegistrationModal } from "@/components/features/registration-modal";
import { TrustBadge } from "@/components/features/trust-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea as UITextarea } from "@/components/ui/textarea";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ContractData {
    id: string;
    contract_number: string;
    title: string;
    type: string;
    status: string;
    effective_date: string | null;
    expiry_date: string | null;
    from_name: string;
    to_name: string;
    body_text: string;
    client_signature_data: string | null;
    signed_at: string | null;
    show_watermark?: boolean;
    signature_data?: string | null;
    issuer_signature_base64?: string | null;
    rendered_html?: string;
    editable_fields_json?: any;
}

interface ContractComment {
    id: string;
    author_name: string;
    body: string;
    author_role: string;
    created_at: string;
    element_reference?: string | null;
}

export default function ContractPublicView() {
    const { token: authToken } = useAuth();
    const { token } = useParams();
    const [contract, setContract] = useState<ContractData | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isApproving, setIsApproving] = useState(false);
    const [signature, setSignature] = useState<string | null>(null);
    const [showSignModal, setShowSignModal] = useState(false);
    const [regModalOpen, setRegModalOpen] = useState(false);

    // Comments
    const [commentText, setCommentText] = useState("");
    const [commentName, setCommentName] = useState("");
    const [isCommenting, setIsCommenting] = useState(false);
    const [comments, setComments] = useState<ContractComment[]>([]);
    const [selectedClause, setSelectedClause] = useState<number | null>(null);
    const [editableFields, setEditableFields] = useState<Record<string, any>>({});
    const [isUpdatingFields, setIsUpdatingFields] = useState(false);
    const [showWatermark, setShowWatermark] = useState(false);

    // V8: Trust & Rejection
    const [trustData, setTrustData] = useState<any>(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("pricing");
    const [rejectDetails, setRejectDetails] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'CLAUSE_SELECTED') {
                setSelectedClause(event.data.clauseId);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const fetchContract = async (silently = false) => {
        if (!token) return;
        if (!silently) setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/contracts/track/${token}?_t=${Date.now()}`);
            const data = await res.json();
            if (data.success) {
                setContract(data.document);
                setComments(data.comments || []);
                setEditableFields(data.document.editable_fields_json || {});
                setShowWatermark(data.show_watermark || false);

                if (data.trust) {
                    setTrustData(data.trust);
                }

                // V8: Prompt registration if not logged in
                if (!authToken) {
                    setRegModalOpen(true);
                }
            } else {
                toast.error("Contract not found");
            }
        } catch {
            toast.error("Error loading Contract");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchContract();
    }, [token]);

    const handleUpdateFields = async () => {
        if (!contract) return;
        setIsUpdatingFields(true);
        try {
            const res = await fetch(`${API_URL}/api/contracts/${token}/fields`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fields: editableFields })
            });
            if (res.ok) {
                toast.success("Changes applied to contract");
                fetchContract();
            } else {
                toast.error("Failed to update fields");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setIsUpdatingFields(false);
        }
    };

    const handleApprove = async () => {
        if (!signature) {
            toast.error("Please draw your signature to agree.");
            return;
        }
        setIsApproving(true);
        try {
            const res = await fetch(`${API_URL}/api/contracts/${token}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // For a real app, you'd extract IP or UA on the backend from the request context, 
                // but we can pass basic UA from frontend if backend isn't capturing it correctly yet.
                body: JSON.stringify({
                    signature_data: signature,
                    user_agent: window.navigator.userAgent,
                })
            });
            const data = await res.json();

            if (data.success) {
                toast.success("Contract successfully signed!");
                setContract(prev => prev ? { ...prev, status: "signed", client_signature_data: signature, signed_at: new Date().toISOString() } : null);
                setShowSignModal(false);
            } else {
                toast.error(data.error || "Approval failed");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setIsApproving(false);
        }
    };

    const submitComment = async () => {
        if (!commentText.trim() || !commentName.trim()) {
            toast.error("Please fill your name and the comment.");
            return;
        }
        setIsCommenting(true);
        try {
            const res = await fetch(`${API_URL}/api/contracts/${token}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    author_name: commentName,
                    body: commentText,
                    author_role: "client",
                    element_reference: selectedClause !== null ? `clause_${selectedClause}` : null
                })
            });
            if (res.ok) {
                toast.success("Feedback submitted!");
                const newC: ContractComment = {
                    id: Math.random().toString(),
                    author_name: commentName,
                    body: commentText,
                    author_role: "client",
                    created_at: new Date().toISOString(),
                    element_reference: selectedClause !== null ? `clause_${selectedClause}` : null
                };
                setComments([newC, ...comments]);
                setCommentText("");
                setContract(prev => prev ? { ...prev, status: "needs_revision" } : null);
            }
        } catch {
            toast.error("Failed to submit feedback");
        } finally {
            setIsCommenting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectDetails.trim() || !commentName.trim()) {
            toast.error("Please provide your name and some details for the rejection.");
            return;
        }

        setIsRejecting(true);
        try {
            const res = await fetch(`${API_URL}/api/contracts/${token}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reason_code: rejectReason,
                    details: rejectDetails.trim(),
                    author_name: commentName.trim()
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Feedback sent. Document status updated.");
                setContract((prev) => prev ? { ...prev, status: "needs_revision" } : null);
                setRejectModalOpen(false);
                fetchContract(true);
            } else {
                toast.error(data.error || "Failed to send rejection");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setIsRejecting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
                <div className="w-8 h-8 rounded-full border-2 border-[#D4A017] border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!contract) return <div className="p-12 text-center text-gray-500">Document not found or link expired.</div>;

    const isSigned = contract.status === "signed";

    return (
        <div className="min-h-screen bg-[#FAF9F6] pb-24">
            {/* ── Client Header Strip ── */}
            <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
                <div className="max-w-4xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F5F3EE] flex items-center justify-center text-[#D4A017]">
                            <Building className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">From: {contract.from_name}</p>
                            <div className="flex items-center gap-3">
                                <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                                    {contract.title}
                                </h1>
                                {trustData && (
                                    <TrustBadge
                                        score={trustData.score}
                                        totalEngagements={trustData.total_engagements}
                                        invoiceAccuracy={trustData.invoice_accuracy}
                                        onTimeRate={trustData.on_time_rate}
                                        size="sm"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isSigned ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
                                <Fingerprint className="w-4 h-4" />
                                Digitally Signed
                            </div>
                        ) : (
                            <Button
                                onClick={() => setShowSignModal(true)}
                                className="bg-[#1A1A18] hover:bg-[#333] text-white rounded-full px-6"
                            >
                                Review & Sign
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-5 py-12 space-y-8">

                {/* Document Container */}
                <div className="bg-white rounded-xl shadow-xl shadow-black/5 border border-gray-100 overflow-hidden print:shadow-none print:border-none">

                    {/* Professional Document View */}
                    <div className="bg-white min-h-[800px] flex flex-col">
                        {contract.rendered_html ? (
                            <iframe
                                key={contract.status} // Force reload on status change
                                srcDoc={contract.rendered_html}
                                className="w-full flex-1 border-none min-h-[800px]"
                                title="Contract Document"
                            />
                        ) : (
                            <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
                                <div className="p-20 text-center text-gray-400 font-serif italic text-lg">
                                    Generating professional view...
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchContract()}
                                    className="text-xs text-gray-400 border-gray-200"
                                >
                                    Still generating? Click to Refresh
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Signatures */}
                    <div className="px-10 py-12 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-12">
                        {/* Party 1 */}
                        <div>
                            <div className="text-sm font-semibold text-gray-900 mb-1">{contract.from_name}</div>
                            <div className="text-xs text-gray-500 mb-4 uppercase tracking-widest">Disclosing Party / Provider</div>
                            <div className="border-b-2 border-gray-300 pb-2 h-20 flex items-end">
                                {/* If provider signed, show here. For now, empty placeholder */}
                                <span className="text-gray-400 italic text-sm">Provider Signature on File</span>
                            </div>
                        </div>

                        {/* Party 2 */}
                        <div>
                            <div className="text-sm font-semibold text-gray-900 mb-1">{contract.to_name}</div>
                            <div className="text-xs text-gray-500 mb-4 uppercase tracking-widest">Receiving Party / Client</div>
                            <div className="border-b-2 border-gray-300 pb-2 h-20 flex items-end">
                                {contract.client_signature_data ? (
                                    <img src={contract.client_signature_data} alt="Client Signature" className="h-16 w-auto object-contain Mix-blend-multiply" />
                                ) : (
                                    <span className="text-gray-300 italic text-sm">Awaiting Signature</span>
                                )}
                            </div>
                            {contract.signed_at && (
                                <div className="text-[10px] text-gray-400 mt-2 font-mono">
                                    Digitally Signed: {new Date(contract.signed_at).toLocaleString()}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {!isSigned && contract.status !== "needs_revision" && (
                    <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x border-t-4 border-t-orange-400">
                        <div className="p-6 md:w-1/2 flex flex-col items-center justify-center text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to align?</h3>
                            <p className="text-sm text-gray-500 mb-6">Sign digitally below to bind this agreement.</p>
                            <div className="flex flex-col gap-3 w-full max-w-xs">
                                <Button onClick={() => setShowSignModal(true)} className="bg-[#D4A017] hover:bg-[#B8860B] text-white w-full">
                                    Sign Contract
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setRejectModalOpen(true)}
                                    className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
                                >
                                    Request Changes
                                </Button>
                            </div>
                        </div>
                        <div className="p-6 md:w-1/2 bg-orange-50/30 relative">
                            {selectedClause !== null && (
                                <div className="absolute -top-3 left-6 bg-orange-400 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 shadow-sm">
                                    Commenting on Clause {selectedClause + 1}
                                    <button onClick={() => setSelectedClause(null)} className="ml-1 hover:text-white/80">×</button>
                                </div>
                            )}
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Questions?</h3>
                            <div className="space-y-3">
                                <Input placeholder="Your Name" value={commentName} onChange={e => setCommentName(e.target.value)} className="bg-white" />
                                <UITextarea placeholder="Ask a question..." value={commentText} onChange={e => setCommentText(e.target.value)} className="bg-white h-20" />
                                <Button onClick={submitComment} variant="outline" disabled={isCommenting} className="w-full">
                                    {isCommenting ? "Sending..." : "Send Question"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {Object.keys(editableFields).length > 0 && !isSigned && (
                    <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 mb-8 flex items-center justify-between">
                        <p className="text-sm text-orange-800 font-medium">Recipient editable fields enabled.</p>
                        <Button
                            onClick={handleUpdateFields}
                            disabled={isUpdatingFields}
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            {isUpdatingFields ? "Updating..." : "Apply Term Changes"}
                        </Button>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-serif text-gray-900">Discussion</h3>
                        {selectedClause !== null && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedClause(null)}
                                className="text-xs text-[#D4A017] hover:text-[#B8860B] hover:bg-[#D4A017]/5"
                            >
                                Show General Discussion
                            </Button>
                        )}
                    </div>

                    {comments.length === 0 ? (
                        <p className="text-gray-400 italic text-sm py-4 border-t border-gray-100">
                            No comments yet.
                        </p>
                    ) : (
                        comments
                            .filter(c => selectedClause !== null ? c.element_reference === `clause_${selectedClause}` : true)
                            .map((c) => (
                                <div key={c.id} className={`bg-white p-4 rounded-lg border shadow-sm transition-all ${c.element_reference ? 'border-[#D4A017]/20 bg-[#D4A017]/5' : 'border-gray-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-900 text-sm">{c.author_name}</span>
                                            {c.element_reference && (
                                                <span className="text-[9px] font-bold text-[#D4A017] uppercase tracking-widest mt-0.5">
                                                    Ref: Clause {parseInt(c.element_reference.split('_')[1]) + 1}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-mono">{new Date(c.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed">{c.body}</p>
                                </div>
                            ))
                    )}
                </div>
            </main>

            {/* Signature Modal */}
            <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Sign Agreement</DialogTitle>
                        <p className="text-sm text-gray-500">By signing below, you agree to the terms listed in the {contract?.title}.</p>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 relative group">
                            {/* @ts-ignore */}
                            <SignaturePad onEnd={(data: any) => setSignature(data)} />
                            {!signature && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-300">
                                    Draw your signature
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500 px-1 font-mono">
                            <div className="flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5" /> IP Logged</div>
                            <div>UA Tracked</div>
                        </div>
                        <Button onClick={handleApprove} disabled={isApproving || !signature} className="w-full bg-[#1A1A18] hover:bg-[#333]">
                            {isApproving ? "Processing Server Side..." : "Agree & Submit Signature"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Structured Rejection Modal */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent className="sm:max-w-md bg-white p-0 overflow-hidden border-[#E8E6E0]">
                    <DialogHeader className="p-6 bg-[#FAF9F6] border-b border-[#E8E6E0]">
                        <DialogTitle className="text-xl font-medium text-[#1A1A18]">Request Revisions</DialogTitle>
                    </DialogHeader>
                    <div className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-[#8A8880]">Recipient Name</label>
                                <Input value={commentName} onChange={(e) => setCommentName(e.target.value)} placeholder="Your full name" className="bg-[#FAF9F6]" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-[#8A8880]">Category</label>
                                <Select value={rejectReason} onValueChange={setRejectReason}>
                                    <SelectTrigger className="w-full bg-[#FAF9F6]">
                                        <SelectValue placeholder="Select a reason" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        <SelectItem value="pricing">Pricing/Budget Mismatch</SelectItem>
                                        <SelectItem value="timeline">Timeline/Deadline Issue</SelectItem>
                                        <SelectItem value="scope">Scope of Work Unclear</SelectItem>
                                        <SelectItem value="typo">Errors/Typos in Document</SelectItem>
                                        <SelectItem value="other">Other Reason</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-[#8A8880]">Feedback Details</label>
                                <UITextarea
                                    placeholder="Tell the contractor what needs to change..."
                                    value={rejectDetails}
                                    onChange={(e) => setRejectDetails(e.target.value)}
                                    className="h-32 bg-[#FAF9F6]"
                                />
                            </div>
                        </div>

                        <p className="text-xs text-[#8A8880] italic leading-relaxed pt-4 border-t border-[#E8E6E0]">
                            Formally rejecting this document will mark it as "Needs Revision" and alert the sender.
                        </p>
                    </div>
                    <DialogFooter className="p-6 bg-[#FAF9F6] border-t border-[#E8E6E0] flex gap-3">
                        <Button variant="outline" className="flex-1 border-[#D5D3CC] text-[#4A4A45]" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
                        <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleReject} disabled={isRejecting}>
                            {isRejecting ? "Sending..." : "Send Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Registration Modal */}
            <RegistrationModal
                open={regModalOpen}
                onOpenChange={setRegModalOpen}
                claimToken={token as string}
                onSuccess={() => {
                    // Auth state will update automatically via useAuth
                }}
            />

            {/* Invoq Watermark Banner for Free Tier */}
            {showWatermark && (
                <div className="fixed bottom-0 left-0 right-0 bg-[#1A1A18] text-white text-center py-3 z-50 flex items-center justify-center gap-3 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] print:hidden">
                    <span className="text-sm font-medium">Powered by INVOQ</span>
                    <span className="text-[#8A8880] text-sm hidden sm:inline">—</span>
                    <span className="text-sm text-[#D8D5CE]">Create professional documents that get you paid.</span>
                    <Button variant="outline" size="sm" className="ml-2 h-8 bg-transparent border-[#4A4A45] hover:bg-white hover:text-[#1A1A18]" onClick={() => window.open('/', '_blank')}>
                        Build your own
                    </Button>
                </div>
            )}
        </div>
    );
}
