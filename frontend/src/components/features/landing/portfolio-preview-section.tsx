import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, FileWarning, TrendingUp, ShieldCheck } from "lucide-react";

export function PortfolioPreviewSection() {
    return (
        <section className="py-16 sm:py-24" style={{ borderTop: "1px solid #E8E6E0", background: "#FFFFFF" }}>
            <div className="max-w-5xl mx-auto px-5 sm:px-6">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1">
                        <h2 className="text-3xl sm:text-4xl tracking-tight mb-6" style={{ fontFamily: "var(--font-heading)", fontWeight: 400 }}>
                            Every relationship, on the record
                        </h2>
                        <p className="text-base leading-relaxed mb-8" style={{ color: "#4A4A45" }}>
                            Whether you&rsquo;re a finance team tracking contractor spend or a freelancer proving their track record — the dashboard gives both sides a single, clear view of every active relationship, document status, and payment.
                        </p>
                        <Link href="/dashboard">
                            <Button variant="outline" className="h-12 border-[#E8E6E0]">Explore Dashboard Demo</Button>
                        </Link>
                    </div>
                    <div className="flex-1 bg-[#FAF9F6] p-4 rounded-2xl ring-1 ring-[#E8E6E0] shadow-xl rotate-1 group hover:rotate-0 transition-transform duration-500">
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Active Rel.', val: '12', icon: <Users className="h-3 w-3" /> },
                                { label: 'Needs Action', val: '4', icon: <FileWarning className="h-3 w-3 text-[#D4A017]" /> },
                                { label: 'Confirmed Rev.', val: '$14.2k', icon: <TrendingUp className="h-3 w-3 text-[#4A7C59]" /> },
                                { label: 'Trust Badge', val: '99%', icon: <ShieldCheck className="h-3 w-3 text-[#D4A017]" /> }
                            ].map(card => (
                                <div key={card.label} className="bg-white p-4 rounded-xl border border-[#E8E6E0] shadow-sm">
                                    <div className="flex items-center gap-1.5 text-[10px] text-[#8A8880] font-medium mb-1 uppercase tracking-tight">
                                        {card.icon} {card.label}
                                    </div>
                                    <div className="text-xl font-bold">{card.val}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
