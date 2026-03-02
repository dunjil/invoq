"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { Mic, MicOff, Wand2, ArrowRight, FileText } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function InteractiveDemo() {
    const [docType, setDocType] = useState<"invoice" | "quote">("invoice");
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

                {/* Toggle between Quote and Invoice */}
                <div className="flex gap-2 mb-4 p-1 rounded-lg w-fit" style={{ background: "#F5F3EE" }}>
                    <button
                        onClick={() => setDocType("invoice")}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${docType === "invoice" ? "bg-white shadow-sm text-[#1A1A18]" : "text-[#6B6B63] hover:text-[#1A1A18]"}`}
                    >
                        Invoice
                    </button>
                    <button
                        onClick={() => setDocType("quote")}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${docType === "quote" ? "bg-white shadow-sm text-[#1A1A18]" : "text-[#6B6B63] hover:text-[#1A1A18]"}`}
                    >
                        Quote
                    </button>
                </div>

                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={docType === "invoice" ? "Website redesign for Maple Coffee Co. — 5 pages, brand alignment, mobile responsive, 3 revision rounds, delivery in 4 weeks, £2,400" : "Proposal: Website redesign for Maple Coffee Co. — 5 pages, brand alignment, mobile responsive, 3 revision rounds, delivery in 4 weeks, £2,400"}
                    rows={5}
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
                                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: "#D4A017" }}>
                                    {docType === "invoice" ? "Invoice" : "Quote"}
                                </p>
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
                                    Get your {docType} <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[280px] p-8 text-center">
                        <FileText className="h-8 w-8 mb-3" style={{ color: "#E8E6E0" }} />
                        <p className="text-sm" style={{ color: "#8A8880" }}>Your {docType} will appear here</p>
                        <p className="text-xs mt-1" style={{ color: "#D5D3CC" }}>Type a description and click Invoq it</p>
                    </div>
                )}
            </div>
        </div>
    );
}
