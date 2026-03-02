
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Send, UserPlus, CheckCircle2, ChevronRight, Loader2, FileText, Package, Plus, Lock } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import toast from "react-hot-toast";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function OnboardingWizard() {
    const { token, user } = useAuth();
    const [bundles, setBundles] = useState<any[]>([]);
    const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isInvoking, setIsInvoking] = useState(false);
    const [isCreatingBundle, setIsCreatingBundle] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const [newBundleName, setNewBundleName] = useState("");
    const [newBundleDescription, setNewBundleDescription] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);

    const [recipientEmail, setRecipientEmail] = useState("");
    const [recipientName, setRecipientName] = useState("");
    const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);

    useEffect(() => {
        if (isOpen && token) {
            fetchBundles();
            fetchTemplates();
        }
    }, [isOpen, token]);

    const fetchBundles = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/onboarding/bundles`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setBundles(data.bundles);
                if (data.bundles.length > 0 && !selectedBundleId) {
                    setSelectedBundleId(data.bundles[0].id);
                }
            }
        } catch (error) {
            toast.error("Failed to load bundles");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await fetch(`${API_URL}/api/onboarding/templates`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setTemplates(data.templates);
            }
        } catch (error) {
            console.error("Failed to fetch templates");
        }
    };

    const handleCreateBundle = async () => {
        if (!newBundleName || selectedTemplateIds.length === 0) {
            toast.error("Enter name and select at least one template");
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/onboarding/bundles`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newBundleName,
                    description: newBundleDescription,
                    template_ids: selectedTemplateIds
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Bundle created!");
                setIsCreatingBundle(false);
                setNewBundleName("");
                setNewBundleDescription("");
                setSelectedTemplateIds([]);
                fetchBundles();
            }
        } catch (error) {
            toast.error("Failed to create bundle");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTemplateSelection = (id: string) => {
        setSelectedTemplateIds(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const handleInvoke = async () => {
        if (!selectedBundleId || !recipientEmail || !recipientName) {
            toast.error("Please fill all fields");
            return;
        }

        setIsInvoking(true);
        try {
            const res = await fetch(`${API_URL}/api/onboarding/bundles/${selectedBundleId}/invoke`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipient_email: recipientEmail,
                    recipient_name: recipientName,
                    effective_date: effectiveDate
                })
            });

            const data = await res.json();
            if (data.success) {
                toast.success(`Successfully sent ${data.documents.length} documents!`);
                setStep(3);
            } else {
                toast.error(data.detail || "Invocation failed");
            }
        } catch (error) {
            toast.error("Network error during invocation");
        } finally {
            setIsInvoking(false);
        }
    };

    const reset = () => {
        setStep(1);
        setRecipientEmail("");
        setRecipientName("");
        setIsOpen(false);
    };

    if (user && user.subscription_status !== "pro") {
        return (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-[#1A1A18] hover:bg-[#333] text-white rounded-full flex items-center gap-2 px-6">
                        <UserPlus className="h-4 w-4" />
                        Batch Onboard
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px] border-[#D4A017]/20 text-center py-10">
                    <div className="w-16 h-16 bg-[#D4A017]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#D4A017]">
                        <Lock className="h-8 w-8" />
                    </div>
                    <DialogTitle className="text-xl font-bold tracking-tight mb-2 text-[#1A1A18]">Pro Feature</DialogTitle>
                    <p className="text-sm text-[#8A8880] mb-8">Automated Onboarding Bundles require an active INVOQ Pro subscription. Upgrade to send grouped documents in one click.</p>
                    <Link href="/pricing" className="bg-[#D4A017] hover:bg-[#B8860B] text-white h-12 px-8 rounded-full inline-flex items-center justify-center text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#D4A017]/20 transition-all hover:-translate-y-0.5 w-full">
                        Upgrade to Pro
                    </Link>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#1A1A18] hover:bg-[#333] text-white rounded-full flex items-center gap-2 px-6">
                    <UserPlus className="h-4 w-4" />
                    Batch Onboard
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-[#D4A017]/20">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-[#D4A017] mb-1">
                        <Sparkles className="h-5 w-5" />
                        <DialogTitle className="text-xl font-bold tracking-tight">Onboarding Wizard</DialogTitle>
                    </div>
                </DialogHeader>

                {isCreatingBundle ? (
                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase tracking-widest text-[#8A8880]">Create New Bundle</Label>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-500">Bundle Name</Label>
                                <Input placeholder="e.g. Contractor Pack" value={newBundleName} onChange={e => setNewBundleName(e.target.value)} className="h-10" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-500">Select Templates to Include</Label>
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {templates.length === 0 ? (
                                        <p className="text-[10px] text-gray-400 italic">No templates available. Create a new template from the top "Create" menu, or save an existing document as a template in History.</p>
                                    ) : templates.map(t => (
                                        <div
                                            key={t.id}
                                            onClick={() => toggleTemplateSelection(t.id)}
                                            className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${selectedTemplateIds.includes(t.id) ? "bg-[#D4A017]/10 border-[#D4A017] text-[#1A1A18]" : "bg-white border-gray-100 text-gray-500"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-3 w-3" />
                                                <span className="font-medium">{t.template_name || t.document_number}</span>
                                            </div>
                                            {selectedTemplateIds.includes(t.id) && <CheckCircle2 className="h-3 w-3 text-[#D4A017]" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={() => setIsCreatingBundle(false)} className="flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest">Cancel</Button>
                            <Button
                                onClick={handleCreateBundle}
                                disabled={isLoading || !newBundleName || selectedTemplateIds.length === 0}
                                className="flex-[2] bg-[#1A1A18] hover:bg-[#333] h-10 rounded-full text-xs font-bold uppercase tracking-widest text-white"
                            >
                                {isLoading ? "Saving..." : "Save Bundle"}
                            </Button>
                        </div>
                    </div>
                ) : step === 1 && (
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-[#8A8880]">1. Select Bundle</Label>
                            {isLoading ? (
                                <div className="flex items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed border-[#E8E6E0]">
                                    <Loader2 className="h-6 w-6 animate-spin text-[#D4A017]" />
                                </div>
                            ) : bundles.length === 0 ? (
                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-center">
                                    <p className="text-sm text-orange-800">No bundles found.</p>
                                    <p className="text-[10px] text-orange-600 mt-1 uppercase tracking-tight font-bold">Create templates first to build bundles.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {bundles.map((bundle) => (
                                        <button
                                            key={bundle.id}
                                            onClick={() => setSelectedBundleId(bundle.id)}
                                            className={`p-4 rounded-xl border transition-all text-left flex items-start gap-4 ${selectedBundleId === bundle.id
                                                ? "bg-[#D4A017]/5 border-[#D4A017] shadow-sm"
                                                : "bg-white border-[#E8E6E0] hover:border-[#D4A017]/30"
                                                }`}
                                        >
                                            <div className={`p-2 rounded-lg ${selectedBundleId === bundle.id ? "bg-[#D4A017] text-white" : "bg-gray-100 text-gray-400"}`}>
                                                <Package className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-[#1A1A18]">{bundle.name}</p>
                                                {bundle.description && <p className="text-[10px] text-[#8A8880] mt-0.5">{bundle.description}</p>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCreatingBundle(true)}
                                className="w-full h-10 border-dashed border-[#D4A017] text-[#D4A017] hover:bg-orange-50 text-[10px] font-bold uppercase tracking-widest mt-2"
                            >
                                <Plus className="h-3.5 w-3.5 mr-2" />
                                Create New Onboarding Bundle
                            </Button>
                        </div>

                        <Button
                            disabled={!selectedBundleId}
                            onClick={() => setStep(2)}
                            className="w-full bg-[#1A1A18] hover:bg-[#333] h-12 rounded-full font-bold uppercase tracking-widest text-xs"
                        >
                            Recipient Details
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase tracking-widest text-[#8A8880]">2. Recipient Information</Label>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-500">Legal Full Name</Label>
                                <Input
                                    placeholder="e.g. John Doe"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className="h-12 border-[#E8E6E0]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-500">Email Address</Label>
                                <Input
                                    type="email"
                                    placeholder="john@example.com"
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    className="h-12 border-[#E8E6E0]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-500">Start / Effective Date</Label>
                                <Input
                                    type="date"
                                    value={effectiveDate}
                                    onChange={(e) => setEffectiveDate(e.target.value)}
                                    className="h-12 border-[#E8E6E0]"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-full font-bold uppercase tracking-widest text-xs">
                                Back
                            </Button>
                            <Button
                                onClick={handleInvoke}
                                disabled={isInvoking}
                                className="flex-[2] bg-[#D4A017] hover:bg-[#B8860B] text-white h-12 rounded-full font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                            >
                                {isInvoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                {isInvoking ? "Sending Bundle..." : "Invoke Bundle"}
                            </Button>
                        </div>
                        <p className="text-[10px] text-[#8A8880] text-center italic">
                            All documents in the bundle will be generated with replaced variables (e.g. Name, Date).
                        </p>
                    </div>
                )}

                {step === 3 && (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-2">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[#1A1A18]">Onboarding Sent!</h3>
                            <p className="text-sm text-[#8A8880] mt-2">The recipient will receive an email for each document in the bundle.</p>
                        </div>
                        <Button onClick={reset} className="w-full bg-[#1A1A18] hover:bg-[#333] h-12 rounded-full">
                            Done
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
