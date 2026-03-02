"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { ChevronDown, FileText, LayoutDashboard, Building, LogOut } from "lucide-react";

import { HeroSection } from "@/components/features/landing/hero-section";
import { FeaturesSection } from "@/components/features/landing/features-section";
import { TwoPathsSection } from "@/components/features/landing/two-paths-section";
import { InteractiveDemo } from "@/components/features/landing/interactive-demo";
import { PortfolioPreviewSection } from "@/components/features/landing/portfolio-preview-section";
import { TrustConnectionSection } from "@/components/features/landing/trust-connection-section";
import { PricingSection } from "@/components/features/landing/pricing-section";
import { CTASection } from "@/components/features/landing/cta-section";

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#FAF9F6" }}>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50" style={{ background: "rgba(250,249,246,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid #E8E6E0" }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative h-7 w-28 transition-transform group-hover:scale-105">
              <Image
                src="/images/invoq-logo-transparent.png"
                alt="INVOQ"
                fill
                className="object-contain object-left drop-shadow-sm"
              />
            </div>
          </Link>
          <div className="flex items-center gap-5">
            <a href="#features" className="text-sm hidden sm:inline" style={{ color: "#4A4A45" }}>Features</a>
            <a href="#pricing" className="text-sm hidden sm:inline" style={{ color: "#4A4A45" }}>Pricing</a>
            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ color: "#4A4A45" }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: "#F5F3EE", color: "#1A1A18" }}>
                    {(user.name || user.email)[0]?.toUpperCase()}
                  </div>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-xl shadow-xl z-50 py-1.5 animate-fade-in-scale" style={{ borderColor: "#E8E6E0" }}>
                      <Link href="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F5F3EE] rounded-md mx-1" style={{ color: "#4A4A45" }}><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
                      <Link href="/create" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F5F3EE] rounded-md mx-1" style={{ color: "#4A4A45" }}><FileText className="h-4 w-4" /> Create Document</Link>
                      <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F5F3EE] rounded-md mx-1" style={{ color: "#4A4A45" }}><Building className="h-4 w-4" /> Profile</Link>
                      <hr className="my-1 mx-3" style={{ borderColor: "#E8E6E0" }} />
                      <button onClick={() => { logout(); setUserMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F5F3EE] rounded-md mx-1 w-full text-left" style={{ color: "#C0392B" }}><LogOut className="h-4 w-4" /> Sign out</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm px-3 py-2" style={{ color: "#4A4A45" }}>Sign in</Link>
                <Link href="/create"><Button size="sm" className="text-sm h-9 px-4" style={{ background: "#1A1A18", color: "#fff" }}>Get started</Button></Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <HeroSection />
      <FeaturesSection />
      <TwoPathsSection />

      {/* ══════════════   SECTION 4 — THE DEMO   ══════════════ */}
      <section className="py-16 sm:py-28 relative" style={{
        borderTop: "1px solid #E8E6E0",
        background: "#F7F6F2",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E\")",
      }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl tracking-tight mb-3" style={{ fontFamily: "var(--font-heading)", fontWeight: 400 }}>
              Try it yourself
            </h2>
            <p className="text-sm sm:text-base" style={{ color: "#4A4A45" }}>
              Toggle between a Quote or Invoice. Speak or type your request. Watch it build live.
            </p>
          </div>
          <InteractiveDemo />
        </div>
      </section>

      <PortfolioPreviewSection />
      <TrustConnectionSection />
      <PricingSection />
      <CTASection />

      {/* ══════════════   FOOTER   ══════════════ */}
      <footer className="py-10 border-t" style={{ borderColor: "#E8E6E0" }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs" style={{ color: "#8A8880" }}>
            © 2026 INVOQ. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs" style={{ color: "#6B6B63" }}>
            <Link href="/terms" className="hover:text-black">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-black">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
