"use client";

import { useEffect, useState } from "react";

const DOC_LABELS = ["Non-Disclosure Agreement", "Offer of Employment", "Invoice"];

export function RelationshipVisual() {
    const [docIndex, setDocIndex] = useState(0);
    const [visible, setVisible] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const interval = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setDocIndex(prev => (prev + 1) % 3);
                setVisible(true);
            }, 500);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) return <div className="w-[340px] sm:w-[480px] aspect-[3/4] sm:aspect-[4/5]" />;

    const fade = visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3";

    return (
        <div className="relative w-[340px] sm:w-[480px] mx-auto lg:ml-auto lg:mr-0 select-none">

            {/* Document Card */}
            <div className={`bg-white rounded-2xl shadow-2xl border border-[#E8E6E0] overflow-hidden transition-all duration-500 ease-out ${fade}`}>

                {/* ── NDA ── */}
                {docIndex === 0 && (
                    <div className="p-6 lg:p-8 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="inline-block px-2 py-0.5 rounded-full bg-[#1A1A18] text-white text-[8px] font-bold tracking-[0.15em] uppercase mb-2">NDA</span>
                                <p className="text-sm font-bold text-[#1A1A18] leading-snug">Non-Disclosure<br />Agreement</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-mono text-[#8A8880]">REF-NDA-2026-F3</p>
                                <p className="text-[8px] text-[#8A8880] mt-0.5">Effective: 1 Mar 2026</p>
                            </div>
                        </div>
                        <div className="h-px bg-[#F5F3EE]" />
                        <div className="grid grid-cols-2 gap-3 text-[9px]">
                            <div className="p-2 rounded-lg bg-[#FAF9F6] border border-[#E8E6E0]">
                                <p className="text-[7px] uppercase tracking-widest text-[#8A8880] font-bold mb-1">Disclosing Party</p>
                                <p className="font-semibold text-[#1A1A18]">Meridian Labs Ltd.</p>
                                <p className="text-[#8A8880]">Lagos, Nigeria</p>
                            </div>
                            <div className="p-2 rounded-lg bg-[#FAF9F6] border border-[#E8E6E0]">
                                <p className="text-[7px] uppercase tracking-widest text-[#8A8880] font-bold mb-1">Receiving Party</p>
                                <p className="font-semibold text-[#1A1A18]">Adaeze Okafor</p>
                                <p className="text-[#8A8880]">Independent Contractor</p>
                            </div>
                        </div>
                        <div className="space-y-2.5 text-[9px] text-[#4A4A45] leading-relaxed">
                            <p><strong className="text-[#1A1A18]">1. Confidential Information.</strong> The Receiving Party agrees to hold in strict confidence any and all proprietary information, trade secrets, business plans, client data, technical know-how, or financial information disclosed by the Disclosing Party.</p>
                            <p><strong className="text-[#1A1A18]">2. Term.</strong> Obligations of confidentiality shall remain in force for two (2) years from the Effective Date, unless terminated by mutual written consent.</p>
                            <p><strong className="text-[#1A1A18]">3. Permitted Disclosure.</strong> Disclosure is permitted solely on a &ldquo;need-to-know&rdquo; basis to employees bound by equivalent confidentiality duties.</p>
                        </div>
                        <div className="flex justify-between gap-4 pt-2 border-t border-[#F5F3EE]">
                            <div className="flex-1">
                                <svg viewBox="0 0 100 24" className="h-5 w-full opacity-70"><path d="M4 18 C18 4, 28 4, 38 14 S60 24, 72 10 T96 16" fill="none" stroke="#1A1A18" strokeWidth="1.4" strokeLinecap="round" /></svg>
                                <p className="text-[6px] uppercase tracking-widest text-[#8A8880] font-bold mt-1">Disclosing Party</p>
                            </div>
                            <div className="flex-1">
                                <svg viewBox="0 0 100 24" className="h-5 w-full opacity-70"><path d="M4 10 C16 20, 28 20, 40 8 S62 2, 74 14 T96 10" fill="none" stroke="#1A1A18" strokeWidth="1.4" strokeLinecap="round" /></svg>
                                <p className="text-[6px] uppercase tracking-widest text-[#8A8880] font-bold mt-1">Receiving Party</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── OFFER / CONTRACT ── */}
                {docIndex === 1 && (
                    <div className="p-6 lg:p-8 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="inline-block px-2 py-0.5 rounded-full bg-[#D4A017] text-white text-[8px] font-bold tracking-[0.15em] uppercase mb-2">Offer Letter</span>
                                <p className="text-sm font-bold text-[#1A1A18] leading-snug">Employment<br />Agreement</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-mono text-[#8A8880]">OFR-2026-E11</p>
                                <p className="text-[8px] text-[#8A8880] mt-0.5">28 Feb 2026</p>
                            </div>
                        </div>
                        <div className="h-px bg-[#F5F3EE]" />
                        <div className="rounded-xl bg-gradient-to-br from-[#D4A017]/10 to-[#4A7C59]/5 border border-[#D4A017]/20 p-3">
                            <p className="text-[9px] font-bold text-[#D4A017] uppercase tracking-widest mb-1">🎉 Congratulations</p>
                            <p className="text-[10px] font-semibold text-[#1A1A18] leading-snug">You have been offered the position of</p>
                            <p className="text-sm font-black text-[#1A1A18] mt-0.5">Lead Product Designer</p>
                            <p className="text-[9px] text-[#4A4A45] mt-1">at <strong>Meridian Labs Ltd.</strong> — we are thrilled to welcome you to our team.</p>
                        </div>
                        <div className="space-y-2 text-[9px] text-[#4A4A45] leading-relaxed">
                            <p><strong className="text-[#1A1A18]">Commencement.</strong> Your employment shall begin on <strong>1 April 2026</strong>, subject to successful completion of background verification.</p>
                            <p><strong className="text-[#1A1A18]">Compensation.</strong> You will receive an annual salary of <strong className="text-[#D4A017]">$72,000</strong>, paid monthly in arrears on the last working day of each month.</p>
                            <p><strong className="text-[#1A1A18]">Scope.</strong> You will report directly to the Chief Executive Officer and shall devote full professional efforts to duties assigned by the company.</p>
                        </div>
                        <div className="flex justify-between gap-4 pt-2 border-t border-[#F5F3EE]">
                            <div className="flex-1">
                                <svg viewBox="0 0 100 24" className="h-5 w-full opacity-70"><path d="M4 18 C18 4, 28 4, 38 14 S60 24, 72 10 T96 16" fill="none" stroke="#1A1A18" strokeWidth="1.4" strokeLinecap="round" /></svg>
                                <p className="text-[6px] uppercase tracking-widest text-[#8A8880] font-bold mt-1">Employer Signature</p>
                            </div>
                            <div className="flex-1">
                                <div className="h-5 border-b border-dashed border-[#E8E6E0]" />
                                <p className="text-[6px] uppercase tracking-widest text-[#8A8880] font-bold mt-1">Employee Signature</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── INVOICE ── */}
                {docIndex === 2 && (
                    <div className="flex flex-col">
                        <div className="bg-[#1A1A18] px-6 py-4 flex justify-between items-center">
                            <div>
                                <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-[#D4A017]">Invoice</p>
                                <p className="text-white font-black text-base leading-tight mt-0.5">Meridian<br />Labs</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-mono text-white/60">#INV-2026-042</p>
                                <p className="text-[8px] text-white/50 mt-0.5">Issued: 28 Feb 2026</p>
                                <p className="text-[8px] text-[#D4A017] font-bold mt-1">Due: 14 Mar 2026</p>
                            </div>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            <div className="flex justify-between text-[9px]">
                                <div>
                                    <p className="text-[7px] uppercase tracking-widest text-[#8A8880] font-bold mb-1">Billed To</p>
                                    <p className="font-semibold text-[#1A1A18]">Bloom &amp; Company</p>
                                    <p className="text-[#8A8880]">14 Victoria Island, Lagos</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[7px] uppercase tracking-widest text-[#8A8880] font-bold mb-1">From</p>
                                    <p className="font-semibold text-[#1A1A18]">Adaeze Okafor</p>
                                    <p className="text-[#8A8880]">Contractor</p>
                                </div>
                            </div>
                            <table className="w-full text-[9px]">
                                <thead>
                                    <tr className="border-b border-[#F5F3EE]">
                                        <th className="pb-1 text-left text-[7px] uppercase tracking-widest text-[#8A8880] font-bold">Service</th>
                                        <th className="pb-1 text-right text-[7px] uppercase tracking-widest text-[#8A8880] font-bold">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#FAF9F6]">
                                    <tr>
                                        <td className="py-2">
                                            <p className="font-semibold text-[#1A1A18]">Brand Strategy &amp; Visual Identity</p>
                                            <p className="text-[#8A8880] text-[8px]">Discovery, mood boards, brand guidelines</p>
                                        </td>
                                        <td className="py-2 text-right font-mono font-bold text-[#1A1A18]">$2,400.00</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2">
                                            <p className="font-semibold text-[#1A1A18]">UI/UX Design System</p>
                                            <p className="text-[#8A8880] text-[8px]">Component library, Figma hand-off</p>
                                        </td>
                                        <td className="py-2 text-right font-mono text-[#1A1A18]">$1,800.00</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="flex justify-end">
                                <div className="w-40 space-y-1.5 text-[9px]">
                                    <div className="flex justify-between text-[#8A8880]"><span>Subtotal</span><span className="font-mono">$4,200.00</span></div>
                                    <div className="flex justify-between text-[#8A8880]"><span>VAT (7.5%)</span><span className="font-mono">$315.00</span></div>
                                    <div className="flex justify-between font-black text-[#1A1A18] border-t-2 border-[#1A1A18] pt-1.5">
                                        <span className="uppercase tracking-widest text-[8px]">Total</span>
                                        <span className="font-mono text-[#D4A017]">$4,515.00</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-[#4A7C59]/5 border border-[#4A7C59]/15 p-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="relative w-2 h-2">
                                        <div className="absolute inset-0 bg-[#4A7C59] rounded-full animate-ping opacity-25" />
                                        <div className="w-2 h-2 bg-[#4A7C59] rounded-full" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] text-[#4A7C59] font-bold uppercase tracking-wider">Payment Received</p>
                                        <p className="text-[7px] text-[#4A7C59]/70 italic">Bank transfer confirmed</p>
                                    </div>
                                </div>
                                <span className="bg-[#4A7C59] text-white px-3 py-1 rounded-md text-[8px] font-black tracking-widest shadow">PAID</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Indicator dots */}
            <div className="flex items-center justify-center gap-2 mt-5">
                {DOC_LABELS.map((label, i) => (
                    <button
                        key={i}
                        onClick={() => { setVisible(false); setTimeout(() => { setDocIndex(i); setVisible(true); }, 300); }}
                        className="flex items-center gap-1.5 group"
                    >
                        <div className={`rounded-full transition-all duration-300 ${docIndex === i ? 'w-5 h-2 bg-[#1A1A18]' : 'w-2 h-2 bg-[#D8D5CE] group-hover:bg-[#8A8880]'}`} />
                    </button>
                ))}
                <span className="ml-2 text-[9px] text-[#8A8880] font-medium tracking-wide">{DOC_LABELS[docIndex]}</span>
            </div>
        </div>
    );
}
