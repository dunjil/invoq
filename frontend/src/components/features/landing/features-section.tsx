import { ShieldCheck, Landmark, MessageSquare } from "lucide-react";

export function FeaturesSection() {
    return (
        <section id="features" className="py-16 sm:py-28" style={{ borderTop: "1px solid #E8E6E0", background: "#FFFFFF" }}>
            <div className="max-w-5xl mx-auto px-5 sm:px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl tracking-tight mb-4" style={{ fontFamily: "var(--font-heading)", fontWeight: 400 }}>
                        Built for both sides of the table
                    </h2>
                    <p className="text-sm sm:text-base leading-relaxed max-w-2xl mx-auto" style={{ color: "#6B6B63" }}>
                        Companies get a clean, auditable record of every contractor relationship. Contractors build a verified reputation that speaks for itself. Together, every engagement becomes a shared asset.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="p-8 rounded-xl ring-1 ring-[#E8E6E0] bg-[#FAF9F6] relative overflow-hidden">
                        <ShieldCheck className="h-8 w-8 mb-5" style={{ color: "#D4A017" }} />
                        <h3 className="text-lg font-medium mb-3">Mutual Verified Trust</h3>
                        <p className="text-sm leading-relaxed" style={{ color: "#6B6B63" }}>
                            Contractors earn a trust score based on delivery and accuracy. Companies build a verified record of partners they can rely on. Both sides benefit from the history.
                        </p>
                        <div className="mt-6 pt-6 border-t border-[#E8E6E0] flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8880]">Trust Score</span>
                            <span className="text-sm font-bold text-[#D4A017]">98.5%</span>
                        </div>
                    </div>

                    <div className="p-8 rounded-xl ring-1 ring-[#E8E6E0] bg-[#FAF9F6]">
                        <Landmark className="h-8 w-8 mb-5" style={{ color: "#D4A017" }} />
                        <h3 className="text-lg font-medium mb-3">Tax, Already Sorted</h3>
                        <p className="text-sm leading-relaxed" style={{ color: "#6B6B63" }}>
                            Every invoice automatically updates your running tax position. No spreadsheet panic at year-end — for contractors or finance teams.
                        </p>
                    </div>

                    <div className="p-8 rounded-xl ring-1 ring-[#E8E6E0] bg-[#FAF9F6]">
                        <MessageSquare className="h-8 w-8 mb-5" style={{ color: "#D4A017" }} />
                        <h3 className="text-lg font-medium mb-3">Contracts That Close</h3>
                        <p className="text-sm leading-relaxed" style={{ color: "#6B6B63" }}>
                            Editable clauses, inline comments, and e-signatures — all inside the document. Both parties negotiate and sign without ever leaving the platform.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
