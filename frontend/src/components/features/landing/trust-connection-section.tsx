import Image from "next/image";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export function TrustConnectionSection() {
    return (
        <section className="py-16 sm:py-24" style={{ borderTop: "1px solid #E8E6E0", background: "#1A1A18" }}>
            <div className="max-w-5xl mx-auto px-5 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Image Side */}
                    <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                        <Image
                            src="/images/handshake.png"
                            alt="Contractor and Company forming a secured agreement"
                            fill
                            className="object-cover object-center"
                            sizes="(max-width: 1024px) 100vw, 500px"
                        />
                        {/* Overlay Gradient for depth */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#1A1A18]/60 via-transparent to-transparent" />
                    </div>

                    {/* Copy Side */}
                    <div className="flex flex-col justify-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-6 bg-white/5 border border-white/10">
                            <ShieldCheck className="h-6 w-6 text-[#D4A017]" />
                        </div>
                        <h3 className="text-3xl sm:text-4xl text-white leading-tight mb-6" style={{ fontFamily: "var(--font-heading)" }}>
                            <span className="text-[#D4A017] inline-block animate-pulse duration-1000">Agreements that protect</span> <br className="hidden sm:block" /><span className="text-[#E8E6E0] font-light">both sides of the table.</span>
                        </h3>
                        <p className="text-[#A1A1AA] text-lg leading-relaxed mb-6">
                            A handshake starts the relationship, but INVOQ secures it. Every generated contract, NDA, and invoice becomes a legally binding, mutually accessible record of truth.
                        </p>
                        <ul className="space-y-3">
                            {[
                                "Immutable document history for both parties",
                                "Automated compliance and tax tracking",
                                "Verified professional reputation scores"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-white/90 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-[#4A7C59]" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
