"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";
import {
  Mic, MicOff, Download, FileText, CheckCircle2,
  ChevronDown, User, LogOut, Building, Crown, Clock,
  MessageSquare, Wand2, ArrowRight, Eye,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ═══════════════════════════════════════════════════════════
   ANIMATED INVOICE PREVIEW (Section 1)
   Fields appear one by one as if being typed
   ═══════════════════════════════════════════════════════════ */
const ANIM_STEPS = [
  { delay: 500 },   // from
  { delay: 1100 },  // to
  { delay: 1700 },  // item 1
  { delay: 2300 },  // item 2
  { delay: 2900 },  // item 3
  { delay: 3500 },  // total
  { delay: 4200 },  // signature
  { delay: 5000 },  // paid badge
];

function AnimatedInvoice() {
  const [step, setStep] = useState(-1);

  useEffect(() => {
    const run = () => {
      setStep(-1);
      ANIM_STEPS.forEach((s, i) => setTimeout(() => setStep(i), s.delay));
    };
    run();
    const id = setInterval(run, 8500);
    return () => clearInterval(id);
  }, []);

  const show = (i: number) =>
    step >= i ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5";

  return (
    <div className="bg-white rounded-xl shadow-2xl shadow-black/8 ring-1 ring-black/[0.04] w-full max-w-[340px] sm:max-w-[580px]">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 sm:px-8 sm:pt-8 sm:pb-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] sm:text-[13px] font-semibold tracking-[0.2em] uppercase" style={{ color: "#D4A017", fontFamily: "var(--font-body)" }}>
              Invoice
            </p>
            <p className="text-[10px] mt-1" style={{ fontFamily: "var(--font-mono)", color: "#8A8880" }}>
              INV-003847
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "#8A8880" }}>
              Feb 25, 2026
            </p>
            <p className="text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "#8A8880" }}>
              Due: Mar 12, 2026
            </p>
          </div>
        </div>

        {/* From / To */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className={`transition-all duration-500 ease-out ${show(0)}`}>
            <p className="text-[9px] uppercase tracking-[0.15em] mb-1" style={{ color: "#8A8880" }}>From</p>
            <p className="text-[12px] sm:text-[14px] font-medium" style={{ color: "#1A1A18" }}>Sarah Chen Studio</p>
            <p className="text-[11px] leading-relaxed" style={{ color: "#4A4A45" }}>
              hello@sarahchen.co<br />Portland, Oregon
            </p>
          </div>
          <div className={`transition-all duration-500 ease-out ${show(1)}`}>
            <p className="text-[9px] uppercase tracking-[0.15em] mb-1" style={{ color: "#8A8880" }}>Bill To</p>
            <p className="text-[12px] sm:text-[14px] font-medium" style={{ color: "#1A1A18" }}>Bloom & Co</p>
            <p className="text-[11px] leading-relaxed" style={{ color: "#4A4A45" }}>
              accounts@bloom.co<br />San Francisco, CA
            </p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-5 py-1 sm:px-8">
        <table className="w-full" style={{ fontSize: "12px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E8E6E0" }}>
              <th className="text-left py-2 font-medium uppercase" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#8A8880" }}>Description</th>
              <th className="text-right py-2 font-medium uppercase" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#8A8880" }}>Rate</th>
              <th className="text-right py-2 font-medium uppercase" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#8A8880" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className={`transition-all duration-500 ease-out ${show(2)}`} style={{ borderBottom: "1px solid #F5F3EE" }}>
              <td className="py-2.5" style={{ color: "#1A1A18" }}>Brand identity redesign</td>
              <td className="py-2.5 text-right" style={{ fontFamily: "var(--font-mono)", color: "#4A4A45" }}>$4,200</td>
              <td className="py-2.5 text-right font-medium" style={{ fontFamily: "var(--font-mono)", color: "#1A1A18" }}>$4,200</td>
            </tr>
            <tr className={`transition-all duration-500 ease-out ${show(3)}`} style={{ borderBottom: "1px solid #F5F3EE" }}>
              <td className="py-2.5" style={{ color: "#1A1A18" }}>Motion design package</td>
              <td className="py-2.5 text-right" style={{ fontFamily: "var(--font-mono)", color: "#4A4A45" }}>$1,800</td>
              <td className="py-2.5 text-right font-medium" style={{ fontFamily: "var(--font-mono)", color: "#1A1A18" }}>$1,800</td>
            </tr>
            <tr className={`transition-all duration-500 ease-out ${show(4)}`}>
              <td className="py-2.5" style={{ color: "#1A1A18" }}>Social media templates</td>
              <td className="py-2.5 text-right" style={{ fontFamily: "var(--font-mono)", color: "#4A4A45" }}>$950</td>
              <td className="py-2.5 text-right font-medium" style={{ fontFamily: "var(--font-mono)", color: "#1A1A18" }}>$950</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className={`px-5 pb-3 pt-3 sm:px-8 sm:pb-5 transition-all duration-600 ease-out ${show(5)}`}>
        <div className="flex justify-end">
          <div className="w-36 space-y-1">
            <div className="flex justify-between" style={{ fontSize: "11px" }}>
              <span style={{ color: "#8A8880" }}>Subtotal</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "#4A4A45" }}>$6,950</span>
            </div>
            <div className="flex justify-between font-semibold text-sm" style={{ borderTop: "1px solid #E8E6E0", paddingTop: "6px" }}>
              <span>Total</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "#D4A017" }}>$6,950.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature */}
      <div className={`px-5 pb-3 sm:px-8 transition-all duration-700 ease-out ${show(6)}`}>
        <div className="flex items-end gap-6">
          <div className="flex-1">
            <p className="text-[9px] uppercase tracking-[0.12em] mb-1" style={{ color: "#8A8880" }}>Authorized Signature</p>
            <div style={{ borderBottom: "1px solid #E8E6E0", paddingBottom: "4px", minHeight: "32px" }}>
              <svg viewBox="0 0 200 40" className="h-7 w-auto" style={{ opacity: 0.7 }}>
                <path
                  d="M10 30 C20 10, 35 10, 45 25 S65 35, 75 20 S95 5, 105 22 C110 28, 115 30, 125 25 S140 15, 150 20 C155 22, 160 28, 170 22 S180 15, 190 20"
                  fill="none" stroke="#1A1A18" strokeWidth="1.5" strokeLinecap="round"
                  style={{ strokeDasharray: 300, strokeDashoffset: 0, animation: "drawSignature 1s ease-out forwards" }}
                />
              </svg>
            </div>
          </div>
          <div style={{ width: "80px" }}>
            <p className="text-[9px] uppercase tracking-[0.12em] mb-1" style={{ color: "#8A8880" }}>Date</p>
            <p className="text-[10px] pb-1" style={{ fontFamily: "var(--font-mono)", color: "#4A4A45", borderBottom: "1px solid #E8E6E0" }}>02/25/2026</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`transition-all duration-700 ease-out ${show(7)}`}
        style={{ borderTop: "1px solid #E8E6E0", padding: "12px 20px", background: "#FAF9F6" }}>
        <div className="flex items-center justify-between">
          <p style={{ fontSize: "10px", color: "#8A8880" }}>Payment due upon receipt</p>
          <span style={{
            fontSize: "10px", fontWeight: 600, color: "#4A7C59",
            background: "rgba(74,124,89,0.08)", padding: "2px 10px",
            borderRadius: "99px", textTransform: "uppercase", letterSpacing: "0.08em"
          }}>Paid</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   INTERACTIVE DEMO (Section 3)
   Visitor types a description, sees extracted fields live
   ═══════════════════════════════════════════════════════════ */
function InteractiveDemo() {
  const [input, setInput] = useState("");
  const [extracted, setExtracted] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleExtract = async () => {
    if (!input.trim()) return;
    setIsExtracting(true);
    try {
      const res = await fetch(`${API_URL}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      if (data.success && data.data) setExtracted(data.data);
      else toast.error("Couldn't extract — try being more specific");
    } catch {
      toast.error("Connection failed");
    } finally {
      setIsExtracting(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("file", new Blob(chunksRef.current, { type: "audio/webm" }), "rec.webm");
          const res = await fetch(`${API_URL}/api/whisper/transcribe`, { method: "POST", body: fd });
          const data = await res.json();
          if (data.success && data.transcript) setInput((p) => p ? `${p} ${data.transcript}` : data.transcript);
        } catch { } finally { setIsTranscribing(false); }
      };
      mr.start();
      setIsRecording(true);
    } catch { toast.error("Microphone access denied"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); setIsRecording(false); }
  };

  const total = extracted?.items?.reduce((s: number, i: any) => s + (i.quantity || 1) * (i.unit_price || 0), 0) || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
      {/* Left — input */}
      <div>
        <p className="text-xs uppercase tracking-[0.15em] mb-3" style={{ color: "#8A8880", fontFamily: "var(--font-body)" }}>
          Try it now
        </p>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Designed a logo for Maple Coffee Co., 3 revisions, $850, due in 15 days"
          rows={4}
          disabled={isTranscribing}
          className="resize-none text-[15px] bg-white border-[#E8E6E0] placeholder:text-[#C5C3BC]"
        />
        <div className="flex gap-3 mt-4">
          <Button
            onClick={handleExtract}
            disabled={isExtracting || !input.trim()}
            className="flex-1 h-11 bg-[#D4A017] hover:bg-[#B8860B] text-white font-medium"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {isExtracting ? "Working its magic…" : "Invoq it ✦"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
            className={`h-11 w-11 shrink-0 ${isRecording ? "border-[#C0392B] text-[#C0392B] animate-recording" : ""}`}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : isTranscribing
              ? <div className="h-4 w-4 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
              : <Mic className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs mt-3" style={{ color: "#8A8880" }}>
          {isRecording ? "Recording — tap mic to stop" : isTranscribing ? "Transcribing…" : "Type or speak. AI extracts the details."}
        </p>
      </div>

      {/* Right — extracted preview */}
      <div className="bg-white rounded-xl ring-1 ring-black/[0.04] shadow-lg shadow-black/5 overflow-hidden min-h-[280px]">
        {extracted ? (
          <div className="p-6 animate-fade-in" style={{ fontFamily: "var(--font-body)" }}>
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: "#D4A017" }}>Invoice</p>
              </div>
            </div>

            {extracted.client_name && (
              <div className="mb-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
                <p className="text-[9px] uppercase tracking-[0.15em] mb-0.5" style={{ color: "#8A8880" }}>Bill To</p>
                <p className="text-sm font-medium" style={{ color: "#1A1A18" }}>{extracted.client_name}</p>
                {extracted.client_email && <p className="text-xs" style={{ color: "#4A4A45" }}>{extracted.client_email}</p>}
              </div>
            )}

            {extracted.items?.length > 0 && (
              <div className="mb-4">
                <table className="w-full" style={{ fontSize: "12px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E8E6E0" }}>
                      <th className="text-left py-1.5 font-medium" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#8A8880", textTransform: "uppercase" }}>Item</th>
                      <th className="text-right py-1.5 font-medium" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#8A8880", textTransform: "uppercase" }}>Qty</th>
                      <th className="text-right py-1.5 font-medium" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#8A8880", textTransform: "uppercase" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extracted.items.map((item: any, i: number) => (
                      <tr key={i} className="animate-fade-in" style={{ animationDelay: `${200 + i * 100}ms`, borderBottom: "1px solid #F5F3EE" }}>
                        <td className="py-2" style={{ color: "#1A1A18" }}>{item.description}</td>
                        <td className="py-2 text-right" style={{ fontFamily: "var(--font-mono)", color: "#4A4A45" }}>{item.quantity || 1}</td>
                        <td className="py-2 text-right font-medium" style={{ fontFamily: "var(--font-mono)", color: "#1A1A18" }}>
                          ${((item.quantity || 1) * (item.unit_price || 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end animate-fade-in" style={{ animationDelay: "400ms" }}>
              <div className="flex justify-between w-32 font-semibold text-sm" style={{ borderTop: "1px solid #E8E6E0", paddingTop: "8px" }}>
                <span>Total</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "#D4A017" }}>
                  ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4" style={{ borderTop: "1px solid #F5F3EE" }}>
              <Link href="/create">
                <Button className="w-full h-10 bg-[#D4A017] hover:bg-[#B8860B] text-white font-medium text-sm">
                  Get your invoice <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] p-8 text-center">
            <FileText className="h-8 w-8 mb-3" style={{ color: "#E8E6E0" }} />
            <p className="text-sm" style={{ color: "#8A8880" }}>Your invoice will appear here</p>
            <p className="text-xs mt-1" style={{ color: "#D5D3CC" }}>Type a description and click Invoq it</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#FAF9F6" }}>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50" style={{ background: "rgba(250,249,246,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid #E8E6E0" }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-[26px] font-light tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Inv<span style={{ color: "#D4A017" }} className="font-medium">oq</span>
          </Link>
          <div className="flex items-center gap-5">
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
                      <Link href="/create" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F5F3EE] rounded-md mx-1" style={{ color: "#4A4A45" }}><FileText className="h-4 w-4" /> Create Invoice</Link>
                      <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F5F3EE] rounded-md mx-1" style={{ color: "#4A4A45" }}><Building className="h-4 w-4" /> Profile</Link>
                      <Link href="/history" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F5F3EE] rounded-md mx-1" style={{ color: "#4A4A45" }}><Clock className="h-4 w-4" /> History</Link>
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

      {/* ══════════════   SECTION 1 — THE HOOK   ══════════════ */}
      <section className="min-h-[100dvh] flex items-center pt-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 w-full py-12 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left — Copy */}
            <div className="animate-fade-in">
              <h2 className="text-[2.6rem] sm:text-[3.5rem] lg:text-[4.2rem] leading-[1.05] tracking-tight" style={{ fontFamily: "var(--font-heading)", fontWeight: 300 }}>
                Your invoice,<br />
                <em className="not-italic" style={{ fontStyle: "italic" }}>in 60 seconds.</em>
              </h2>
              <p className="text-base sm:text-lg mt-6 sm:mt-8 leading-relaxed max-w-sm" style={{ color: "#4A4A45", fontFamily: "var(--font-body)" }}>
                Describe what you did. We handle the rest.
              </p>
              <div className="mt-8 sm:mt-10">
                <Link href="/create">
                  <Button size="lg" className="h-12 sm:h-[52px] px-6 sm:px-8 text-sm sm:text-[15px] font-medium shadow-sm w-full sm:w-auto" style={{ background: "#D4A017", color: "#fff" }}>
                    Create your first invoice free
                  </Button>
                </Link>
              </div>
              <p className="text-[13px] mt-4" style={{ color: "#8A8880" }}>
                No credit card required. 5 free invoices every month.
              </p>
            </div>

            {/* Right — Animated Invoice */}
            <div className="flex justify-center lg:justify-end animate-slide-up" style={{ animationDelay: "200ms" }}>
              <div className="transform sm:rotate-[1.5deg] sm:hover:rotate-0 transition-transform duration-700 ease-out">
                <AnimatedInvoice />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════   SECTION 2 — HOW IT WORKS   ══════════ */}
      <section className="py-16 sm:py-28" style={{ borderTop: "1px solid #E8E6E0" }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-6">
          <h2 className="text-center text-3xl sm:text-4xl tracking-tight mb-10 sm:mb-16" style={{ fontFamily: "var(--font-heading)", fontWeight: 400 }}>
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-14">
            {[
              {
                icon: MessageSquare,
                title: "Speak or type",
                desc: "Tell Invoq what you did in plain language. Voice note or text, your choice.",
              },
              {
                icon: Eye,
                title: "Review",
                desc: "We extract every detail. You confirm before anything is generated.",
              },
              {
                icon: Download,
                title: "Download",
                desc: "Professional PDF, ready to send. Signed, branded, done.",
              },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5" style={{ border: "1px solid #E8E6E0" }}>
                  <step.icon className="h-5 w-5" style={{ color: "#D4A017" }} />
                </div>
                <h3 className="text-[22px] mb-2" style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>{step.title}</h3>
                <p className="text-sm leading-relaxed max-w-[240px] mx-auto" style={{ color: "#4A4A45" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════   SECTION 3 — THE DEMO   ══════════════ */}
      <section className="py-16 sm:py-28 relative" style={{
        borderTop: "1px solid #E8E6E0",
        borderBottom: "1px solid #E8E6E0",
        background: "#F7F6F2",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E\")",
      }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl tracking-tight mb-3" style={{ fontFamily: "var(--font-heading)", fontWeight: 400 }}>
              Try it yourself
            </h2>
            <p className="text-sm sm:text-base" style={{ color: "#4A4A45" }}>
              No account needed. Describe your work and watch the invoice appear.
            </p>
          </div>
          <InteractiveDemo />
        </div>
      </section>

      {/* ══════════════   SECTION 4 — SOCIAL PROOF (coming soon) ══════════
      <section className="py-16 sm:py-28">
        <div className="max-w-4xl mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            ...testimonials...
          </div>
        </div>
      </section>
      ══════════════════════════════════════════════════════════ */}

      {/* ══════════════   SECTION 5 — PRICING   ══════════════ */}
      <section id="pricing" className="py-16 sm:py-28" style={{ borderTop: "1px solid #E8E6E0", background: "#FFFFFF" }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <h2 className="text-center text-3xl sm:text-4xl tracking-tight mb-3" style={{ fontFamily: "var(--font-heading)", fontWeight: 400 }}>
            Simple pricing
          </h2>
          <p className="text-center text-sm sm:text-base mb-8 sm:mb-10" style={{ color: "#4A4A45" }}>
            Start free. Upgrade when you&apos;re ready.
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
              <h3 className="text-xl mb-1" style={{ fontFamily: "var(--font-heading)", fontWeight: 400 }}>Free</h3>
              <div className="mb-5">
                <span className="text-4xl font-light" style={{ fontFamily: "var(--font-heading)" }}>$0</span>
                <span className="text-sm ml-1" style={{ color: "#8A8880" }}>forever</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {["5 invoices per month", "AI text extraction", "PDF download", "Watermarked output"].map((f) => (
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
                Most popular
              </span>
              <h3 className="text-xl mb-1" style={{ fontFamily: "var(--font-heading)", fontWeight: 400 }}>Pro</h3>
              <div className="mb-5">
                <span className="text-4xl font-light" style={{ fontFamily: "var(--font-heading)" }}>
                  ${annual ? "79" : "9"}
                </span>
                <span className="text-sm ml-1" style={{ color: "#8A8880" }}>
                  / {annual ? "year" : "month"}
                </span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {["Unlimited invoices", "No watermark", "Voice input", "Saved business profile", "Invoice history", "Priority support"].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "#4A4A45" }}>
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#4A7C59" }} />{f}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="w-full h-10 text-sm font-medium" style={{ background: "#D4A017", color: "#fff" }}>
                  Start Pro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════   SECTION 6 — THE CLOSE   ══════════════ */}
      <section className="py-16 sm:py-28" style={{ borderTop: "1px solid #E8E6E0" }}>
        <div className="max-w-2xl mx-auto px-5 sm:px-6 text-center">
          <h2 className="text-[2.2rem] sm:text-5xl leading-[1.1] tracking-tight mb-6" style={{ fontFamily: "var(--font-heading)", fontWeight: 300 }}>
            Stop chasing.<br />
            <em style={{ fontStyle: "italic" }}>Start getting paid.</em>
          </h2>
          <p className="text-base leading-relaxed mb-10 max-w-md mx-auto" style={{ color: "#4A4A45" }}>
            Every minute you spend formatting invoices is a minute you&apos;re not spending on the work that actually earns you money. Invoq gives you that time back.
          </p>
          <Link href="/create">
            <Button size="lg" className="h-12 sm:h-[52px] px-6 sm:px-8 text-sm sm:text-[15px] font-medium shadow-sm w-full sm:w-auto" style={{ background: "#D4A017", color: "#fff" }}>
              Create your first invoice free
            </Button>
          </Link>
          <p className="text-[13px] mt-4" style={{ color: "#8A8880" }}>
            No credit card required. 5 free invoices every month.
          </p>
        </div>
      </section>

      {/* ══════════════   FOOTER   ════════════════════════════ */}
      <footer className="py-10" style={{ borderTop: "1px solid #E8E6E0" }}>
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-lg font-light tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              Inv<span style={{ color: "#D4A017" }} className="font-medium">oq</span>
            </p>
            <p className="text-xs mt-1" style={{ color: "#8A8880" }}>Made with care for freelancers.</p>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: "#8A8880" }}>
            <Link href="#" className="hover:text-[#4A4A45] transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-[#4A4A45] transition-colors">Terms</Link>
            <Link href="#" className="hover:text-[#4A4A45] transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
