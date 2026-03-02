import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RelationshipVisual } from "@/components/features/landing/relationship-visual";

export function HeroSection() {
    return (
        <section className="min-h-[100dvh] flex items-center pt-16">
            <div className="max-w-5xl mx-auto px-5 sm:px-6 w-full py-12 sm:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Left — Copy */}
                    <div className="animate-fade-in">
                        <h1 className="text-[2.6rem] sm:text-[3.5rem] lg:text-[4.2rem] leading-[1.05] tracking-tight" style={{ fontFamily: "var(--font-heading)", fontWeight: 300 }}>
                            Professional relationships,<br />
                            <em className="not-italic" style={{ fontStyle: "italic", color: "#D4A017" }}>properly documented.</em>
                        </h1>
                        <p className="text-base sm:text-lg mt-6 sm:mt-8 leading-relaxed max-w-sm" style={{ color: "#4A4A45", fontFamily: "var(--font-body)" }}>
                            Whether you&rsquo;re a company hiring contractors or a professional delivering great work — Invoq gives both sides a shared, verified record of every agreement, invoice, and payment.
                        </p>
                        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-4">
                            <Link href="/create">
                                <Button size="lg" className="h-12 sm:h-[52px] px-6 sm:px-8 text-sm sm:text-[15px] font-medium shadow-sm w-full sm:w-auto hover:scale-[1.02] transition-transform" style={{ background: "#D4A017", color: "#fff" }}>
                                    Start for Free
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button variant="outline" size="lg" className="h-12 sm:h-[52px] px-6 sm:px-8 text-sm sm:text-[15px] font-medium w-full sm:w-auto border-[#E8E6E0]">
                                    See How It Works
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Right — Animated Relationship Visual */}
                    <div className="flex justify-center lg:justify-end animate-slide-up" style={{ animationDelay: "200ms" }}>
                        <div className="transform sm:rotate-[1.5deg] sm:hover:rotate-0 transition-transform duration-700 ease-out">
                            <RelationshipVisual />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
