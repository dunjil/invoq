import { ArrowRight, PenTool, Building } from "lucide-react";

export function TwoPathsSection() {
    return (
        <section className="py-16 sm:py-28" style={{ borderTop: "1px solid #E8E6E0" }}>
            <div className="max-w-4xl mx-auto px-5 sm:px-6">
                <h2 className="text-center text-3xl sm:text-4xl tracking-tight mb-10 sm:mb-16" style={{ fontFamily: "var(--font-heading)", fontWeight: 400 }}>
                    One platform. Two perspectives.
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-16 relative">
                    <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <ArrowRight className="h-8 w-8 text-[#E8E6E0]" />
                    </div>

                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-6" style={{ background: "#F5F3EE", border: "1px solid #E8E6E0" }}>
                            <PenTool className="h-6 w-6" style={{ color: "#4A7C59" }} />
                        </div>
                        <h3 className="text-[22px] mb-3" style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>For Independent Contractors</h3>
                        <p className="text-sm leading-relaxed max-w-[280px] mx-auto mb-6" style={{ color: "#4A4A45" }}>
                            Draft NDAs, Contracts, and <strong>Unlimited Invoices</strong> in minutes. Share a live link your client can comment on, negotiate, and sign — then track your tax set-asides automatically.
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-6" style={{ background: "#F5F3EE", border: "1px solid #E8E6E0" }}>
                            <Building className="h-6 w-6" style={{ color: "#D4A017" }} />
                        </div>
                        <h3 className="text-[22px] mb-3" style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>For Companies & Agencies</h3>
                        <p className="text-sm leading-relaxed max-w-[300px] mx-auto mb-6" style={{ color: "#4A4A45" }}>
                            <strong>Passive:</strong> Review and sign documents sent from contractors without an account.<br /><br />
                            <strong>Pro Agency:</strong> Upload your standard NDAs & MSAs, create Onboarding Bundles, and trigger automated signing flows for every new hire.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
