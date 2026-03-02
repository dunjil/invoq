"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Crown, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PricingPage() {
    const { user, token, loading: authLoading } = useAuth();
    const [loadingCheckout, setLoadingCheckout] = useState(false);
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        if (!token) return;
        const fetchStatus = async () => {
            try {
                const res = await fetch(`${API_URL}/api/billing/status`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) setStatus(await res.json());
            } catch { }
        };
        fetchStatus();
    }, [token]);

    const handleUpgrade = async () => {
        if (!token) { window.location.href = "/register"; return; }
        setLoadingCheckout(true);
        try {
            const res = await fetch(`${API_URL}/api/billing/checkout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else if (data.error) alert(data.error);
        } catch { alert("Failed to start checkout"); }
        finally { setLoadingCheckout(false); }
    };

    const isPro = user?.subscription_status === "pro";

    return (
        <div className="min-h-screen flex flex-col">
            <AppHeader />

            <main className="max-w-3xl mx-auto px-5 py-16 animate-fade-in flex-1 w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-normal mb-3" style={{ fontFamily: "var(--font-heading)" }}>Simple, honest pricing</h1>
                    <p className="text-[#4A4A45] text-lg">Start free. Upgrade when your business needs it.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {/* Free */}
                    <Card className={!isPro ? "ring-1 ring-[#E8E6E0]" : ""}>
                        <CardHeader className="pb-3 pt-6 px-6">
                            <CardTitle className="text-xl font-normal" style={{ fontFamily: "var(--font-heading)" }}>Free</CardTitle>
                            <div className="mt-3">
                                <span className="text-4xl font-light" style={{ fontFamily: "var(--font-heading)" }}>$0</span>
                                <span className="text-[#8A8880] text-sm ml-2">forever</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 px-6 pb-6">
                            <ul className="space-y-2.5 text-sm text-[#4A4A45]">
                                {["5 invoices per month", "AI text extraction", "PDF download", "Preview & sign", "\"Made with Invoq\" watermark"].map((f) => (
                                    <li key={f} className="flex items-start gap-2.5"><Check className="h-4 w-4 text-[#4A7C59] shrink-0 mt-0.5" />{f}</li>
                                ))}
                            </ul>
                            {!isPro && !authLoading && (
                                <Button variant="outline" className="w-full h-10 text-sm" disabled>{user ? "Current plan" : "Get started"}</Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pro */}
                    <Card className={isPro ? "ring-1 ring-[#D4A017]" : "border-[#D4A017]/30"}>
                        <CardHeader className="pb-3 pt-6 px-6">
                            <CardTitle className="text-xl font-normal flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                                Pro <Crown className="h-4 w-4 text-[#D4A017]" />
                            </CardTitle>
                            <div className="mt-3">
                                <span className="text-4xl font-light" style={{ fontFamily: "var(--font-heading)" }}>$9</span>
                                <span className="text-[#8A8880] text-sm ml-2">/ month</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 px-6 pb-6">
                            <ul className="space-y-2.5 text-sm text-[#4A4A45]">
                                {["Unlimited invoices", "AI text extraction", "Voice input (Whisper)", "No watermark", "Saved business profile", "Invoice history", "Priority support"].map((f) => (
                                    <li key={f} className="flex items-start gap-2.5"><Check className="h-4 w-4 text-[#4A7C59] shrink-0 mt-0.5" />{f}</li>
                                ))}
                            </ul>
                            {isPro ? (
                                <Button variant="outline" className="w-full h-10 text-sm" disabled>Current plan ✓</Button>
                            ) : (
                                <Button onClick={handleUpgrade} disabled={loadingCheckout}
                                    className="w-full h-10 bg-[#D4A017] hover:bg-[#B8860B] text-white font-medium text-sm">
                                    {loadingCheckout ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…</> : "Upgrade to Pro"}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {status && user && (
                    <div className="text-center mt-10">
                        <span className="text-[#4A4A45]">Current Plan: </span>
                        <span className="text-sm">
                            <span className="font-semibold text-[#1A1A18]">Free Tier</span> · Unlimited invoices
                        </span>
                    </div>
                )}
            </main>
            <AppFooter maxWidth="max-w-3xl" />
        </div>
    );
}
