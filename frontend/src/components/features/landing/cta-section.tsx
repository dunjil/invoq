import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
    return (
        <section className="py-16 sm:py-28" style={{ borderTop: "1px solid #E8E6E0" }}>
            <div className="max-w-2xl mx-auto px-5 sm:px-6 text-center">
                <h2 className="text-[2.2rem] sm:text-5xl leading-[1.1] tracking-tight mb-6" style={{ fontFamily: "var(--font-heading)", fontWeight: 300 }}>
                    The network where<br />
                    <em style={{ fontStyle: "italic", color: "#D4A017" }}>business gets done right.</em>
                </h2>
                <p className="text-sm sm:text-base leading-relaxed mb-8 sm:mb-10 max-w-lg mx-auto" style={{ color: "#4A4A45" }}>
                    Join the early access list and start bringing structure, trust, and simplicity to your professional engagements.
                </p>
                <Link href="/register">
                    <Button size="lg" className="h-12 w-full sm:w-auto px-8 text-[15px] font-medium shadow-sm hover:scale-[1.02] transition-transform" style={{ background: "#1A1A18", color: "#fff" }}>
                        Join the Early Access Network
                    </Button>
                </Link>
            </div>
        </section>
    );
}
