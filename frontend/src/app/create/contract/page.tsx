"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ChevronDown, Building, Crown, LogOut, Clock, Activity, Settings2, FileText
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ContractCreatePage() {
    const { user, token, logout } = useAuth();

    const [contractType, setContractType] = useState<"contract" | "nda" | "msa" | "sow">("nda");
    const [contractTitle, setContractTitle] = useState("Non-Disclosure Agreement");
    const [contractNumber, setContractNumber] = useState(`AGR-${Date.now().toString().slice(-6)}`);

    const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
    const [expiryDate, setExpiryDate] = useState("");

    const [fromName, setFromName] = useState("");
    const [toName, setToName] = useState("");

    const [bodyText, setBodyText] = useState("");
    const [notes, setNotes] = useState("");

    const [isSaving, setIsSaving] = useState(false);
    const [trackedLink, setTrackedLink] = useState<string | null>(null);

    const [userMenuOpen, setUserMenuOpen] = useState(false);

    // Load sample template based on type
    useEffect(() => {
        if (contractType === "nda") {
            setContractTitle("Non-Disclosure Agreement");
            setBodyText(`This Non-Disclosure Agreement (the "Agreement") is entered into on ${effectiveDate}, between ${fromName || "[Disclosing Party]"} and ${toName || "[Receiving Party]"}.\n\n1. Definition of Confidential Information\nFor purposes of this Agreement, "Confidential Information" shall include all information or material that has or could have commercial value or other utility in the business in which Disclosing Party is engaged.\n\n2. Exclusions from Confidential Information\nReceiving Party's obligations under this Agreement do not extend to information that is: (a) publicly known at the time of disclosure or subsequently becomes publicly known through no fault of the Receiving Party; (b) discovered or created by the Receiving Party before disclosure by Disclosing Party; (c) learned by the Receiving Party through legitimate means other than from the Disclosing Party or Disclosing Party's representatives; or (d) is disclosed by Receiving Party with Disclosing Party's prior written approval.\n\n3. Obligations of Receiving Party\nReceiving Party shall hold and maintain the Confidential Information in strictest confidence for the sole and exclusive benefit of the Disclosing Party.\n\n4. Term\nThe nondisclosure provisions of this Agreement shall survive the termination of this Agreement and Receiving Party's duty to hold Confidential Information in confidence shall remain in effect until the Confidential Information no longer qualifies as a trade secret or until Disclosing Party sends Receiving Party written notice releasing Receiving Party from this Agreement, whichever occurs first.`);
        } else if (contractType === "contract") {
            setContractTitle("Service Agreement");
            setBodyText(`This Service Agreement is effective as of ${effectiveDate}.\n\n1. Services Provided\nThe Provider agrees to supply the Client with the services as negotiated and outlined in accompanying scopes of work or quotes.\n\n2. Payment Terms\nInvoices will be issued corresponding to the milestones completed. Payment is due within the terms specified on each invoice.\n\n3. Intellectual Property\nUpon complete payment, the Client will own the rights to the final deliverables.`);
        }
    }, [contractType, effectiveDate, fromName, toName]);

    const handleSaveAndTrack = async () => {
        if (!token) {
            toast.error("Please login to save contracts.");
            return;
        }
        if (!fromName || !toName || !bodyText) {
            toast.error("Please fill out the parties and contract body.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                title: contractTitle,
                type: contractType,
                contract_number: contractNumber,
                effective_date: effectiveDate || undefined,
                expiry_date: expiryDate || undefined,
                from_name: fromName,
                to_name: toName,
                body_text: bodyText,
                notes: notes || undefined,
            };

            const res = await fetch(`${API_URL}/api/contracts`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (result.success) {
                toast.success("Contract saved & tracked link generated!");
                setTrackedLink(`${window.location.origin}/view/contract/${result.tracked_link_token}`);
            } else {
                toast.error(result.error || "Failed to save Contract");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF9F6] pb-24">
            {/* ── Header ── */}
            <header className="sticky top-0 z-50 border-b bg-[#FAF9F6]/80 backdrop-blur-lg">
                <div className="max-w-3xl mx-auto px-5 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-light tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                                Inv<span className="text-[#D4A017] font-medium">oq</span>
                            </h1>
                        </Link>

                        <div className="flex items-center gap-3">
                            <Link href="/create">
                                <Button variant="ghost" size="sm" className="text-[#4A4A45]">Draft Invoice</Button>
                            </Link>
                            {user && (
                                <div className="relative">
                                    <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#F5F3EE] transition-colors text-sm text-[#4A4A45]">
                                        <div className="w-7 h-7 rounded-full bg-[#F5F3EE] flex items-center justify-center text-xs font-medium text-[#1A1A18]">
                                            {(user.name || user.email)[0]?.toUpperCase()}
                                        </div>
                                        <span className="hidden sm:inline">{user.name || user.email.split("@")[0]}</span>
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                    {userMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                                            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white shadow-xl border rounded-xl z-50 py-1.5">
                                                <Link href="/history" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50"><Clock className="h-4 w-4" /> History</Link>
                                                <hr className="my-1.5 border-gray-100" />
                                                <button onClick={() => { logout(); setUserMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"><LogOut className="h-4 w-4" /> Sign out</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-5 py-8 space-y-6">

                {/* Document Type Selector */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-medium flex items-center gap-2">Drafting Contract / NDA</h2>
                        <p className="text-sm text-gray-500">Create a secure, trackable legal agreement.</p>
                    </div>
                    <div className="flex bg-[#F5F3EE] p-1 rounded-lg">
                        <button
                            onClick={() => setContractType("nda")}
                            className={cn("px-4 py-1.5 text-sm font-medium rounded-md", contractType === "nda" ? "bg-white text-[#D4A017] shadow-sm" : "text-gray-500")}
                        >
                            NDA
                        </button>
                        <button
                            onClick={() => setContractType("contract")}
                            className={cn("px-4 py-1.5 text-sm font-medium rounded-md", contractType === "contract" ? "bg-white text-[#1A1A18] shadow-sm" : "text-gray-500")}
                        >
                            Contract
                        </button>
                    </div>
                </div>

                {/* Form Container */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6 space-y-8">

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Document Title</Label>
                            <Input value={contractTitle} onChange={e => setContractTitle(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Agreement Reference #</Label>
                            <Input value={contractNumber} onChange={e => setContractNumber(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Effective Date</Label>
                            <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Expiry Date (Optional)</Label>
                            <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6 grid grid-cols-2 gap-8">
                        <div className="space-y-1.5">
                            <Label className="text-gray-500">Party 1 (You / Disclosing Party)</Label>
                            <Input placeholder="Your Full Legal Name or Company" value={fromName} onChange={e => setFromName(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-gray-500">Party 2 (Client / Receiving Party)</Label>
                            <Input placeholder="Client Legal Name or Company" value={toName} onChange={e => setToName(e.target.value)} />
                        </div>
                    </div>

                    {/* Contract Body */}
                    <div className="border-t border-gray-100 pt-6 space-y-2">
                        <Label className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#D4A017]" />
                            Agreement Terms & Clauses
                        </Label>
                        <p className="text-xs text-gray-500 mb-2">Modify the boilerplate text as needed. Variables like Party Names are automatically suggested.</p>
                        <Textarea
                            className="min-h-[400px] leading-relaxed font-serif resize-y"
                            value={bodyText}
                            onChange={(e) => setBodyText(e.target.value)}
                        />
                    </div>

                    {/* Notes */}
                    <div className="border-t border-gray-100 pt-6 space-y-2">
                        <Label>Private Notes</Label>
                        <Textarea
                            placeholder="Internal reference notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="h-20"
                        />
                    </div>

                </div>

                {/* Action Bar */}
                <div className="flex flex-col gap-4 sticky bottom-6 top-auto z-40 bg-white p-4 rounded-xl shadow-xl border border-gray-200">
                    {trackedLink ? (
                        <div className="flex flex-col gap-3">
                            <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800">
                                Contract saved successfully! Send this link to your client:
                            </div>
                            <div className="flex gap-2">
                                <Input readOnly value={trackedLink} className="bg-gray-50" />
                                <Button onClick={() => { navigator.clipboard.writeText(trackedLink); toast.success("Copied!"); }} variant="outline">
                                    Copy
                                </Button>
                                <Link href={trackedLink} target="_blank">
                                    <Button className="bg-[#1A1A18] hover:bg-[#333] text-white">View</Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <Button
                            onClick={handleSaveAndTrack}
                            disabled={isSaving}
                            className="w-full bg-[#1A1A18] hover:bg-[#333] text-white py-6 text-lg"
                        >
                            {isSaving ? "Saving..." : "Generate Tracked Final Agreement"}
                        </Button>
                    )}
                </div>

            </main>
        </div>
    );
}
