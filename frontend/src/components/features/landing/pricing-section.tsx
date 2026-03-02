"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export function PricingSection() {
    const [annual, setAnnual] = useState(false);

    return (
        <section id="pricing" className="py-16 sm:py-28" style={{ borderTop: "1px solid #E8E6E0", background: "#FDFDFB" }}>
            <div className="max-w-3xl mx-auto px-5 sm:px-6">
                <h2 className="text-center text-3xl sm:text-4xl tracking-tight mb-3" style={{ fontFamily: "var(--font-heading)", fontWeight: 400 }}>
                    Start free. Grow with your work.
                </h2>
                <p className="text-center text-sm sm:text-base mb-8 sm:mb-10" style={{ color: "#4A4A45" }}>
                    Every engagement you document earns you a stronger professional reputation. No fluff — just results.
                </p>

                {/* Annual toggle */}
                <div className="flex items-center justify-center gap-3 mb-10">
                    <span className="text-sm" style={{ color: annual ? "#8A8880" : "#1A1A18" }}>Monthly</span>
                    <button
                        onClick={() => setAnnual(!annual)}
                        className="relative w-11 h-6 rounded-full transition-colors"
                        style={{ background: annual ? "#D4A017" : "#E8E6E0" }}
                    >
                        <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: annual ? "translateX(20px)" : "translateX(0)" }} />
                    </button>
                    <span className="text-sm" style={{ color: annual ? "#1A1A18" : "#8A8880" }}>
                        Annual
                        {annual && <span className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(212,160,23,0.1)", color: "#D4A017" }}>Save 27%</span>}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Free */}
                    <div className="rounded-xl p-7" style={{ border: "1px solid #E8E6E0" }}>
                        <h3 className="text-xl mb-1" style={{ fontFamily: "var(--font-heading)", fontWeight: 400 }}>Starter</h3>
                        <div className="mb-5">
                            <span className="text-4xl font-light" style={{ fontFamily: "var(--font-heading)" }}>$0</span>
                            <span className="text-sm ml-1" style={{ color: "#8A8880" }}>forever</span>
                        </div>
                        <ul className="space-y-2.5 mb-6">
                            {["Unlimited invoices", "NDA & Contract drafting", "AI-powered text extraction", "Basic Trust Profile", "Watermarked documents"].map((f) => (
                                <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "#4A4A45" }}>
                                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#4A7C59" }} />{f}
                                </li>
                            ))}
                        </ul>
                        <Link href="/create">
                            <Button variant="outline" className="w-full h-10 text-sm" style={{ borderColor: "#E8E6E0", color: "#4A4A45" }}>
                                Get started free
                            </Button>
                        </Link>
                    </div>

                    {/* Pro */}
                    <div className="rounded-xl p-7 relative" style={{ border: "1px solid rgba(212,160,23,0.3)" }}>
                        <span className="absolute -top-3 left-7 text-[10px] font-semibold uppercase tracking-[0.15em] px-3 py-1 rounded-full" style={{ background: "#FAF9F6", color: "#D4A017", border: "1px solid rgba(212,160,23,0.3)" }}>
                            Elite / Agency
                        </span>
                        <h3 className="text-xl mb-1" style={{ fontFamily: "var(--font-heading)", fontWeight: 400 }}>Network Pro</h3>
                        <div className="mb-5">
                            <span className="text-4xl font-light" style={{ fontFamily: "var(--font-heading)" }}>
                                ${annual ? "79" : "9"}
                            </span>
                            <span className="text-sm ml-1" style={{ color: "#8A8880" }}>
                                / {annual ? "year" : "month"}
                            </span>
                        </div>
                        <ul className="space-y-2.5 mb-6">
                            {["No watermarks", "Saved Premium Profiles", "Company Onboarding Bundles", "Verified Trust Badge", "Tax Awareness Ledger", "Network Priority Support"].map((f) => (
                                <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "#4A4A45" }}>
                                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#4A7C59" }} />{f}
                                </li>
                            ))}
                        </ul>
                        <Link href="/register">
                            <Button className="w-full h-10 text-sm font-medium" style={{ background: "#D4A017", color: "#fff" }}>
                                Upgrade to Pro
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
