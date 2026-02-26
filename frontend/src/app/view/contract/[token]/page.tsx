"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "@/components/signature-pad";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building, Send, Plus, Fingerprint } from "lucide-react";

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
}

export default function ContractPublicView() {
    const { token } = useParams();
    const [contract, setContract] = useState<ContractData | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isApproving, setIsApproving] = useState(false);
    const [signature, setSignature] = useState<string | null>(null);
    const [showSignModal, setShowSignModal] = useState(false);

    // Comments
    const [commentText, setCommentText] = useState("");
    const [commentName, setCommentName] = useState("");
    const [isCommenting, setIsCommenting] = useState(false);

    useEffect(() => {
        if (!token) return;
        fetchContract();
    }, [token]);

    const fetchContract = async () => {
        try {
            const res = await fetch(`${API_URL}/api/contracts/track/${token}`);
            const data = await res.json();
            if (data.success) {
                setContract(data.contract);
            } else {
                toast.error("Contract not found");
            }
        } catch {
            toast.error("Error loading Contract");
        } finally {
            setIsLoading(false);
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
                body: JSON.stringify({ author_name: commentName, body: commentText, author_role: "client" })
            });
            if (res.ok) {
                toast.success("Feedback submitted!");
                setCommentText("");
                setContract(prev => prev ? { ...prev, status: "needs_revision" } : null);
            }
        } catch {
            toast.error("Failed to submit feedback");
        } finally {
            setIsCommenting(false);
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
                            <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                                {contract.title}
                            </h1>
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

                    {/* Header / Meta */}
                    <div className="px-10 py-12 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex justify-between items-start">
                            <div className="max-w-[60%]">
                                <h2 className="text-3xl font-serif text-gray-900 mb-2">{contract.title}</h2>
                                <p className="text-gray-600 font-serif leading-relaxed">
                                    This agreement ensures clear terms and conditions between <br />
                                    <strong className="text-gray-900 font-medium">{contract.from_name}</strong> and <strong className="text-gray-900 font-medium">{contract.to_name}</strong>.
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm">
                                <div className="text-gray-500 mb-1 font-mono text-xs uppercase tracking-wider">Ref Number</div>
                                <div className="font-semibold text-gray-900 tabular-nums">{contract.contract_number}</div>

                                <div className="border-t border-gray-100 my-3" />

                                <div className="text-gray-500 mb-1 font-mono text-xs uppercase tracking-wider">Effective Date</div>
                                <div className="font-semibold text-gray-900">{contract.effective_date || "Upon Signature"}</div>
                            </div>
                        </div>
                    </div>

                    {/* Contract Body formatted elegantly */}
                    <div className="px-10 py-12">
                        <div className="prose prose-gray max-w-none font-serif text-gray-800 leading-loose prose-h2:font-normal prose-h2:text-xl">
                            {contract.body_text.split('\n').map((paragraph, idx) => (
                                <p key={idx} className="mb-6 whitespace-pre-wrap">{paragraph}</p>
                            ))}
                        </div>
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

                {/* Client Response Actions (if not signed) */}
                {!isSigned && (
                    <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x border-t-4 border-t-orange-400">
                        <div className="p-6 md:w-1/2 flex flex-col items-center justify-center text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to align?</h3>
                            <p className="text-sm text-gray-500 mb-6">Sign digitally below to bind this agreement.</p>
                            <Button onClick={() => setShowSignModal(true)} className="bg-[#D4A017] hover:bg-[#B8860B] text-white w-full max-w-xs">
                                Sign Contract
                            </Button>
                        </div>
                        <div className="p-6 md:w-1/2 bg-orange-50/30">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Questions or Revisions?</h3>
                            <div className="space-y-3">
                                <Input placeholder="Your Name" value={commentName} onChange={e => setCommentName(e.target.value)} className="bg-white" />
                                <Textarea placeholder="Request a change or add a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} className="bg-white h-20" />
                                <Button onClick={submitComment} variant="outline" disabled={isCommenting} className="w-full">
                                    {isCommenting ? "Sending..." : "Send Feedback"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
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
        </div>
    );
}
