"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
    ChevronDown, Building, Crown, LogOut, Clock, Activity, Settings2, FileText, Sparkles, Upload, X, Check, AlertCircle, Loader2,
    Mic, MicOff, Eye, Trash2, PenTool, Droplets, Type, ImageIcon, Palette, Layout, Shield, Languages, ChevronRight, Plus, FileSignature
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SignaturePad } from "@/components/shared/signature-pad";
import { AppHeader } from "@/components/layout/app-header";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const watermarkPresets = ["CONFIDENTIAL", "DRAFT", "PAID", "COPY", "SAMPLE", "VOID"];

export function CreateContract({ defaultType = "contract" }: { defaultType?: "contract" | "nda" | "msa" | "sow" }) {
    const { user, token, logout } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [contractType, setContractType] = useState<string>(defaultType);
    const [customTypeLabel, setCustomTypeLabel] = useState("");
    const [isCustomType, setIsCustomType] = useState(false);
    const [contractTitle, setContractTitle] = useState("Service Agreement");
    const [contractNumber, setContractNumber] = useState(`AGR-${Date.now().toString().slice(-6)}`);

    const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
    const [expiryDate, setExpiryDate] = useState("");

    const [fromName, setFromName] = useState("");
    const [toName, setToName] = useState("");

    const [bodyText, setBodyText] = useState("");
    const [notes, setNotes] = useState("");

    const [isSaving, setIsSaving] = useState(false);
    const [trackedLink, setTrackedLink] = useState<string | null>(null);

    // Edit Mode
    const [editToken, setEditToken] = useState<string | null>(null);

    // AI Wizard State
    const [magicPrompt, setMagicPrompt] = useState("");
    const [isAILoading, setIsAILoading] = useState(false);
    const [showAIConfirmation, setShowAIConfirmation] = useState(false);
    const [aiExtractedData, setAIExtractedData] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);

    // ── Voice Recording State ──────────────────────────────
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // ── Preview State ──────────────────────────────────────
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewHtml, setPreviewHtml] = useState("");
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

    // ── Formatting State ─────────────────────────────────────
    const [logo, setLogo] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [primaryColor, setPrimaryColor] = useState("#D4A017");

    const [signature, setSignature] = useState<string | null>(null);
    const [clientSignature, setClientSignature] = useState<string | null>(null);
    const [showSignatureSection, setShowSignatureSection] = useState(false);
    const [showClientSignatureSection, setShowClientSignatureSection] = useState(false);
    const [includeSignatureLines, setIncludeSignatureLines] = useState(true);

    const [watermarkEnabled, setWatermarkEnabled] = useState(false);
    const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
    const [watermarkContentType, setWatermarkContentType] = useState<"text" | "image">("text");
    const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
    const [watermarkOpacity, setWatermarkOpacity] = useState(0.1);
    const [watermarkRotation, setWatermarkRotation] = useState(-45);
    const watermarkUploadRef = useRef<HTMLInputElement>(null);

    const [optionsOpen, setOptionsOpen] = useState(false);

    // ── Related Contract State ──────────────────────────────
    const [contractId, setContractId] = useState<string | null>(null);
    const [availableContracts, setAvailableContracts] = useState<any[]>([]);
    const [relationshipId, setRelationshipId] = useState<string | null>(null);
    const [isTemplate, setIsTemplate] = useState(false);

    const fetchContracts = async (relId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/contracts/relationship/${relId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.ok) {
                const data = await res.json();
                setAvailableContracts(data.contracts || []);
            }
        } catch (e) {
            console.error("Failed to fetch contracts", e);
        }
    };

    // Lookup relationship by email when toName or toDetails changes
    useEffect(() => {
        if (!token) return;

        // Try to find email in toName or toDetails
        const fullText = `${toName} ${notes}`; // Some users put email in notes or just name
        const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

        if (emailMatch) {
            const email = emailMatch[0].toLowerCase();
            const lookup = async () => {
                try {
                    const res = await fetch(`${API_URL}/api/contracts/lookup-relationship?email=${email}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.success && data.relationship_id) {
                        setRelationshipId(data.relationship_id);
                        fetchContracts(data.relationship_id);
                    } else {
                        setRelationshipId(null);
                        setAvailableContracts([]);
                    }
                } catch (e) {
                    console.error("Relationship lookup failed", e);
                }
            };
            const timer = setTimeout(lookup, 1000); // debounce
            return () => clearTimeout(timer);
        } else {
            setRelationshipId(null);
            setAvailableContracts([]);
        }
    }, [toName, notes, token]);

    useEffect(() => {
        const editId = searchParams.get("edit");
        const duplicateIdRaw = searchParams.get("duplicate");

        if (editId) {
            setEditToken(editId);
            loadDocument(editId, false);
        } else if (duplicateIdRaw) {
            // Strip the type prefix (e.g., "contract_xyz" -> "xyz")
            const typeParts = duplicateIdRaw.split("_");
            const realId = typeParts.length > 1 ? typeParts.slice(1).join("_") : duplicateIdRaw;
            loadDocument(realId, true);
        } else {
            // Check if URL type explicitly asks for template
            const typeStr = searchParams.get("type");
            if (typeStr === "template") {
                setIsTemplate(true);
                setContractType("template");
            } else if (typeStr) {
                setContractType(typeStr);
            }
        }
    }, [searchParams]);

    const loadDocument = async (tokenStr: string, isDuplicate: boolean) => {
        try {
            const res = await fetch(`${API_URL}/api/contracts/track/${tokenStr}`);
            if (res.ok) {
                const data = await res.json();
                const doc = data.document;

                if (doc.type) setContractType(doc.type);
                setContractTitle(doc.title || "");

                if (isDuplicate) {
                    setContractNumber(`AGR-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`);
                    setEffectiveDate(new Date().toISOString().split("T")[0]);
                } else {
                    setContractNumber(doc.document_number || doc.contract_number || "");
                    if (doc.effective_date) setEffectiveDate(doc.effective_date);
                    if (doc.expiry_date) setExpiryDate(doc.expiry_date);
                }

                setFromName(doc.from_name || "");
                setToName(doc.to_name || "");
                setBodyText(doc.body_text || "");
                setNotes(doc.notes || "");

                // Formatting
                if (doc.primary_color) setPrimaryColor(doc.primary_color);
                if (doc.logo_base64) setLogo(doc.logo_base64);
                if (doc.contract_id) setContractId(doc.contract_id);

                // Signatures
                setShowSignatureSection(doc.include_issuer_signature ?? true);
                setShowClientSignatureSection(doc.include_recipient_signature ?? true);
                if (doc.issuer_signature_base64 && !isDuplicate) {
                    setSignature(doc.issuer_signature_base64);
                }

                // Watermark
                setWatermarkEnabled(doc.watermark_enabled || false);
                if (doc.watermark_text) setWatermarkText(doc.watermark_text);
                if (doc.watermark_opacity) setWatermarkOpacity(doc.watermark_opacity);

                toast.success(isDuplicate ? "Contract duplicated successfully" : "Contract loaded for editing");
            } else {
                toast.error("Failed to load document data.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error loading document.");
        }
    };

    // Load sample template based on type
    useEffect(() => {
        // Don't auto-load if we're explicitly editing or duplicating an existing document
        const isEditing = searchParams.get("edit") || searchParams.get("duplicate");
        if (isEditing) return;

        // Only auto-load if body is empty - don't overwrite user edits!
        if (bodyText && bodyText !== "" && !bodyText.startsWith("# ")) {
            // If they have meaningful content, don't touch it
            return;
        }

        // If body is empty or just has a header (likely a previous template), update it
        if (contractType === "nda") {
            setContractTitle("Non-Disclosure Agreement");
            setBodyText(`# Non-Disclosure Agreement\n\nThis **Non-Disclosure Agreement** (the "Agreement") is entered into on ${effectiveDate}, between **${fromName || "[Disclosing Party]"}** (the "Discloser") and **${toName || "[Receiving Party]"}** (the "Recipient").\n\n### 1. Definition of Confidential Information\n"Confidential Information" shall include all proprietary information or material that has or could have commercial value or other utility in the business in which Discloser is engaged.\n\n### 2. Obligations of Recipient\nRecipient shall:\n- Hold and maintain the Confidential Information in strictest confidence.\n- Use it only for the sole and exclusive benefit of Discloser.\n- Not disclose it to any third party without Discloser's prior written consent.\n\n### 3. Term\nThis Agreement remains in effect until the Confidential Information no longer qualifies as a trade secret or until Discloser releases Recipient in writing.`);
        } else if (contractType === "contract") {
            setContractTitle("Service Agreement");
            setBodyText(`# Service Agreement\n\nThis Agreement is effective as of **${effectiveDate}**.\n\n### 1. Services Provided\nThe Provider (**${fromName || "[Provider]"}**) agrees to supply the Client (**${toName || "[Client]"}**) with professional services as outlined below:\n1. **Design & Strategy**: High-fidelity UI/UX design.\n2. **Development**: Full-stack implementation.\n3. **Handoff**: Asset exports and documentation.\n\n### 2. Payment Terms\n| Phase | Deliverable | Amount |\n| :--- | :--- | :--- |\n| Deposit | Kickoff | $1,000 |\n| Midpoint | Design Handoff | $2,000 |\n| Final | Project Launch | $1,000 |\n\n### 3. Intellectual Property\nUpon complete payment, the Client will own the rights to the final deliverables.`);
        } else if (contractType === "msa") {
            setContractTitle("Master Service Agreement");
            setBodyText(`# Master Service Agreement\n\nThis **MSA** governs the ongoing relationship between **${fromName || "[Provider]"}** and **${toName || "[Client]"}**.\n\n### 1. Statements of Work\nEach specific engagement will be covered by a separate SOW referencing this MSA.\n\n### 2. Service Standards\n- **Quality**: Provider will perform services with professional care.\n- **Timeliness**: All delivery dates in SOWs are binding.\n\n### 3. Limitation of Liability\nNeither party's liability under this MSA shall exceed the total fees paid.`);
        } else if (contractType === "sow") {
            setContractTitle("Statement of Work");
            setBodyText(`# Statement of Work\n\nReference MSA Date: ${effectiveDate}\n\n### 1. Project Overview\nThis SOW covers the specific implementation of **[Project Name]**.\n\n### 2. Deliverables\n- **Phase 1**: Research & Discovery\n- **Phase 2**: Implementation\n- **Phase 3**: QA & Launch\n\n### 3. Schedule\nWork will commence on ${effectiveDate} and is expected to finish within 4 weeks.`);
        }
    }, [contractType]);
    // Only trigger on type change

    const handleSaveAndTrack = async () => {
        if (!token) {
            toast.error("Please login to save contracts.");
            return;
        }
        if (!fromName || !toName || !bodyText) {
            toast.error("Please fill out the parties and contract body.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                title: contractTitle,
                type: contractType,
                document_number: contractNumber,
                effective_date: effectiveDate || undefined,
                expiry_date: expiryDate || undefined,
                from_name: fromName,
                to_name: toName,
                body_text: bodyText,
                notes: notes || undefined,
                logo_base64: logo,
                primary_color: primaryColor,
                include_issuer_signature: showSignatureSection,
                include_recipient_signature: showClientSignatureSection,
                issuer_signature_base64: signature,
                watermark_enabled: watermarkEnabled,
                watermark_text: watermarkText,
                watermark_opacity: watermarkOpacity,
                contract_id: contractId || undefined,
                is_template: isTemplate,
                template_name: isTemplate ? contractTitle : undefined
            };

            const method = editToken ? "PUT" : "POST";
            const endpoint = editToken ? `${API_URL}/api/contracts/${editToken}` : `${API_URL}/api/contracts`;

            const res = await fetch(endpoint, {
                method: method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (result.success) {
                if (editToken) {
                    toast.success("Contract updated successfully!");
                    setTrackedLink(`${window.location.origin}/view/contract/${editToken}`);
                } else if (isTemplate) {
                    toast.success("Template saved successfully & is now ready to use!");
                    setTrackedLink(`${window.location.origin}/view/contract/${result.tracked_link_token}`);
                } else {
                    toast.success("Contract saved & tracked link generated!");
                    setTrackedLink(`${window.location.origin}/view/contract/${result.tracked_link_token}`);
                }
            } else {
                toast.error(result.error || "Failed to save Contract");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMagicDraft = async () => {
        if (!magicPrompt.trim()) return;
        setIsAILoading(true);
        try {
            const res = await fetch(`${API_URL}/api/extract/legal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: magicPrompt })
            });
            const data = await res.json();
            if (data.success) {
                setAIExtractedData(data.data);
                setShowAIConfirmation(true);
            } else {
                toast.error(data.error || "AI Drafting failed");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setIsAILoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API_URL}/api/extract/upload`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setAIExtractedData(data.data);
                setShowAIConfirmation(true);
            } else {
                toast.error(data.error || "File processing failed");
            }
        } catch (err) {
            toast.error("Network error during upload");
        } finally {
            setIsUploading(false);
            e.target.value = "";
        }
    };

    const applyAIResult = () => {
        if (!aiExtractedData) return;
        const d = aiExtractedData;
        if (d.title) setContractTitle(d.title);
        if (d.type) setContractType(d.type as any);
        if (d.from_name) setFromName(d.from_name);
        if (d.to_name) setToName(d.to_name);
        if (d.effective_date) setEffectiveDate(d.effective_date);
        if (d.expiry_date) setExpiryDate(d.expiry_date);
        if (d.body_text) setBodyText(d.body_text);
        if (d.summary) setNotes(d.summary);

        setShowAIConfirmation(false);
        toast.success("AI draft applied! Review below.");
    };

    // ── Voice Recording Logic ──────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
                await transcribeAudio(audioBlob);
            };
            mediaRecorder.start();
            setIsRecording(true);
            toast("Recording started — click mic again to stop", { icon: "🎙️", duration: 2000 });
        } catch {
            toast.error("Microphone access denied");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const transcribeAudio = async (blob: Blob) => {
        setIsTranscribing(true);
        try {
            const formData = new FormData();
            formData.append("file", blob, "recording.webm");
            const res = await fetch(`${API_URL}/api/whisper/transcribe`, { method: "POST", body: formData });
            const data = await res.json();
            if (data.success && data.transcript) {
                setMagicPrompt((prev) => prev ? `${prev}\n${data.transcript}` : data.transcript);
                toast.success("Transcribed — review and click Draft with AI");
            } else {
                toast.error(data.error || "Transcription failed");
            }
        } catch (err: any) {
            toast.error(err.message || "Network error");
        } finally {
            setIsTranscribing(false);
        }
    };

    // ── Preview Logic ──────────────────────────────────────
    const handlePreview = async () => {
        if (!fromName || !toName || !bodyText) {
            toast.error("Please fill in both parties and contract text");
            return;
        }

        setIsGeneratingPreview(true);
        try {
            const res = await fetch(`${API_URL}/api/contracts/preview`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: contractTitle,
                    type: contractType,
                    document_number: contractNumber,
                    effective_date: effectiveDate,
                    expiry_date: expiryDate,
                    from_name: fromName,
                    to_name: toName,
                    body_text: bodyText,
                    logo_base64: logo,
                    primary_color: primaryColor,
                    include_issuer_signature: showSignatureSection,
                    include_recipient_signature: showClientSignatureSection,
                    issuer_signature_base64: signature,
                    watermark_enabled: watermarkEnabled,
                    watermark_text: watermarkText,
                    watermark_opacity: watermarkOpacity,
                    contract_id: contractId || undefined
                })
            });
            const data = await res.json();
            if (data.success) {
                setPreviewHtml(data.html);
                setPreviewOpen(true);
            } else {
                toast.error(data.error || "Preview failed");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsGeneratingPreview(false);
        }
    };

    // ── Formatting Handlers ──────────────────────────────────
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setLogo(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };
    const removeLogo = () => setLogo(null);
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => setLogo(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setWatermarkImage(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF9F6] pb-24">
            <AppHeader />

            <main className="max-w-3xl mx-auto px-3 sm:px-5 py-4 sm:py-8 space-y-4 sm:space-y-6">

                {/* ── Document Type Info & Quick Start ────────────────── */}
                <div className="flex flex-col justify-between items-start gap-4 bg-white p-5 rounded-xl border border-[#D4A017]/20 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4A017]/5 to-transparent rounded-full -mr-10 -mt-10 pointer-events-none" />
                    <div className="w-full">
                        <h2 className="text-lg font-normal mb-1 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                            {contractType === "contract" && "Creating a Contract"}
                            {contractType === "nda" && "Creating an NDA"}
                            {contractType === "msa" && "Creating an MSA"}
                            {contractType === "sow" && "Creating an SOW"}
                            {!["contract", "nda", "msa", "sow"].includes(contractType) && `Creating a ${contractType}`}

                            {contractType === "contract" && <span className="px-2 py-0.5 rounded-full bg-[#4A7C59]/10 text-[#4A7C59] text-[10px] font-bold tracking-widest uppercase">Contract</span>}
                            {contractType === "nda" && <span className="px-2 py-0.5 rounded-full bg-[#C0392B]/10 text-[#C0392B] text-[10px] font-bold tracking-widest uppercase">NDA</span>}
                            {contractType === "msa" && <span className="px-2 py-0.5 rounded-full bg-[#D4A017]/10 text-[#D4A017] text-[10px] font-bold tracking-widest uppercase">MSA</span>}
                            {contractType === "sow" && <span className="px-2 py-0.5 rounded-full bg-[#1A1A18]/10 text-[#1A1A18] text-[10px] font-bold tracking-widest uppercase">SOW</span>}
                            {!["contract", "nda", "msa", "sow"].includes(contractType) && <span className="px-2 py-0.5 rounded-full bg-[#8A8880]/10 text-[#8A8880] text-[10px] font-bold tracking-widest uppercase">{contractType}</span>}
                        </h2>
                        <Accordion type="single" collapsible className="w-full mt-2">
                            <AccordionItem value="info" className="border-b-0">
                                <AccordionTrigger className="py-2 text-xs text-[#8A8880] hover:text-[#1A1A18] hover:no-underline">
                                    What is a {contractType === "nda" ? "Non-Disclosure Agreement (NDA)" : contractType === "msa" ? "Master Service Agreement (MSA)" : "Contract"}?
                                </AccordionTrigger>
                                <AccordionContent className="text-xs text-[#8A8880] leading-relaxed pb-3">
                                    {contractType === "contract" && (
                                        <>A <strong>Contract</strong> or Service Agreement legally defines the relationship between you and your client. It outlines the scope of work, deliverables, timelines, payment terms, and ownership rights to protect both parties.</>
                                    )}
                                    {contractType === "nda" && (
                                        <>A <strong>Non-Disclosure Agreement (NDA)</strong> is a legally binding contract that establishes a confidential relationship. It protects sensitive information or trade secrets shared between parties from being disclosed to others.</>
                                    )}
                                    {contractType === "msa" && (
                                        <>A <strong>Master Service Agreement (MSA)</strong> is a contract that dictates the general terms and conditions of a long-term relationship. It allows for future projects to be negotiated quickly by simply executing a new Statement of Work (SOW) that references the MSA.</>
                                    )}
                                    {contractType === "sow" && (
                                        <>A <strong>Statement of Work (SOW)</strong> is a document that details the specific tasks, timelines, deliverables, and pricing for a particular project, usually falling under the broader terms of an existing MSA.</>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>

                {/* Quick Templates Section - Moved to top and enhanced */}
                <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#D4A017]">
                            <Sparkles className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Quick Start Templates</span>
                        </div>
                        <p className="text-[10px] text-[#8A8880]">Pre-fills parties, dates, and boilerplate</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        {contractType === "contract" && (
                            <Button
                                variant="outline"
                                type="button"
                                size="sm"
                                className="text-[10px] font-bold uppercase tracking-widest h-12 border-[#E8E6E0] hover:border-[#D4A017] hover:bg-orange-50 transition-all flex flex-col items-center justify-center pt-1 w-full sm:w-1/3"
                                onClick={() => {
                                    setContractTitle("Software Development Agreement");
                                    setFromName(user?.name || "Dev Studio LLC");
                                    setToName("Acme Corp");
                                    setEffectiveDate(new Date().toISOString().split("T")[0]);
                                    setBodyText(`# Software Development Agreement\n\nThis Agreement is made between **[Provider]** and **[Client]**.\n\n### 1. Scope of Work\nProvider shall develop software according to specifications including:\n- **Frontend**: React-based dashboard.\n- **Backend**: Python/FastAPI infrastructure.\n- **Deployment**: AWS Cloud setup.\n\n### 2. Payment\n| Milestone | % | Amount |\n| :--- | :--- | :--- |\n| Deposit | 25% | $1,250 |\n| Beta | 50% | $2,500 |\n| Launch | 25% | $1,250 |\n\n### 3. Warranty\nProvider warrants that the software will be free of defects for 90 days.`);
                                    toast.success("Software Agreement sample loaded");
                                }}
                            >
                                <span className="text-[8px] opacity-70 mb-0.5 font-normal tracking-tight">Standard Service</span>
                                Software Agreement
                            </Button>
                        )}
                        {contractType === "nda" && (
                            <Button
                                variant="outline"
                                type="button"
                                size="sm"
                                className="text-[10px] font-bold uppercase tracking-widest h-12 border-[#E8E6E0] hover:border-[#C0392B]/30 hover:bg-red-50 transition-all flex flex-col items-center justify-center pt-1 w-full sm:w-1/3"
                                onClick={() => {
                                    setContractTitle("Mutual Non-Disclosure Agreement");
                                    setFromName(user?.name || "Consultant Name");
                                    setToName("Tech Partner Inc");
                                    setEffectiveDate(new Date().toISOString().split("T")[0]);
                                    setBodyText(`# Mutual Non-Disclosure Agreement\n\nThis Agreement protects confidential information shared between **[Party A]** and **[Party B]**.\n\n### 1. Confidential Information\nIncludes all proprietary, technical, and business information including:\n- Trade secrets and source code.\n- Financial projections and client lists.\n\n### 2. Non-Disclosure\nNeither party shall disclose the other's info without written consent.\n\n### 3. Term\nThis agreement remains in effect for **2 years** from the signed date.`);
                                    toast.success("NDA sample loaded");
                                }}
                            >
                                <span className="text-[8px] opacity-70 mb-0.5 font-normal tracking-tight">Legal Confidentiality</span>
                                Mutual NDA
                            </Button>
                        )}
                        {contractType === "msa" && (
                            <Button
                                variant="outline"
                                type="button"
                                size="sm"
                                className="text-[10px] font-bold uppercase tracking-widest h-12 border-[#E8E6E0] hover:border-[#D4A017] hover:bg-orange-50 transition-all flex flex-col items-center justify-center pt-1 w-full sm:w-1/3"
                                onClick={() => {
                                    setContractTitle("Master Service Agreement");
                                    setFromName(user?.name || "Agency Group");
                                    setToName("Enterprise Client");
                                    setEffectiveDate(new Date().toISOString().split("T")[0]);
                                    setBodyText(`# Master Service Agreement\n\nThis **MSA** governs the ongoing relationship between **[Provider]** and **[Client]**.\n\n### 1. Statements of Work\nEach specific engagement will be covered by a separate SOW referencing this MSA.\n\n### 2. Service Standards\n- **Quality**: Provider will perform services with professional care.\n- **Timeliness**: All delivery dates in SOWs are binding.\n\n### 3. Limitation of Liability\nNeither party's liability under this MSA shall exceed the total fees paid.`);
                                    toast.success("MSA sample loaded");
                                }}
                            >
                                <span className="text-[8px] opacity-70 mb-0.5 font-normal tracking-tight">Project Umbrella</span>
                                Master Service (MSA)
                            </Button>
                        )}
                        {contractType === "sow" && (
                            <Button
                                variant="outline"
                                type="button"
                                size="sm"
                                className="text-[10px] font-bold uppercase tracking-widest h-12 border-[#E8E6E0] hover:border-[#1A1A18]/30 hover:bg-gray-50 transition-all flex flex-col items-center justify-center pt-1 w-full sm:w-1/3"
                                onClick={() => {
                                    setContractTitle("Statement of Work");
                                    setFromName(user?.name || "Agency Group");
                                    setToName("Enterprise Client");
                                    setEffectiveDate(new Date().toISOString().split("T")[0]);
                                    setBodyText(`# Statement of Work\n\nThis **SOW** is issued under the Master Service Agreement between **[Provider]** and **[Client]**.\n\n### 1. Project Overview\nSpecific implementation of **[Project Name]**.\n\n### 2. Deliverables\n- **Phase 1**: Research & Discovery\n- **Phase 2**: Implementation\n- **Phase 3**: QA & Launch\n\n### 3. Schedule\nWork will commence on ${new Date().toISOString().split("T")[0]} and is expected to finish within 4 weeks.`);
                                    toast.success("SOW sample loaded");
                                }}
                            >
                                <span className="text-[8px] opacity-70 mb-0.5 font-normal tracking-tight">Project Spec</span>
                                SOW
                            </Button>
                        )}

                        <div className="pt-2 border-t border-gray-50">
                            <Label className="text-[10px] font-bold text-[#8A8880] uppercase tracking-widest mb-2 block">Or Use Custom Document Label</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g. Addendum, Policy Update, Work Order"
                                    value={customTypeLabel}
                                    onChange={(e) => setCustomTypeLabel(e.target.value)}
                                    className="h-10 text-sm border-[#E8E6E0] focus:border-[#D4A017]"
                                />
                                <Button
                                    type="button"
                                    disabled={!customTypeLabel}
                                    className="h-10 bg-[#D4A017] hover:bg-[#B8860B] text-white px-4 text-xs font-bold uppercase tracking-widest"
                                    onClick={() => {
                                        setContractType(customTypeLabel);
                                        toast.success(`Switched to ${customTypeLabel}`);
                                    }}
                                >
                                    Apply Label
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Templates & Other Docs Toggle */}
                {!editToken && (
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-[#1A1A18]">Save as Template</h3>
                            <p className="text-xs text-[#8A8880]">Make this document available for reuse in Onboarding workflows.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={isTemplate} onChange={(e) => setIsTemplate(e.target.checked)} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4A017]"></div>
                        </label>
                    </div>
                )}

                {/* AI Relationship Wizard */}
                <div className="bg-white p-6 rounded-xl border border-[#D4A017]/30 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4A017]/10 to-transparent rounded-full -mr-10 -mt-10 pointer-events-none" />
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-[#D4A017]" />
                        <h3 className="text-md font-medium">Relationship AI Magic</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <Textarea
                                placeholder="Magic Draft: 'Create a simple NDA for a graphic design project' or 'Write a service agreement for $500/month consulting'..."
                                value={magicPrompt}
                                onChange={(e) => setMagicPrompt(e.target.value)}
                                className="min-h-[80px] pr-20 bg-[#FAF9F6] border-none focus-visible:ring-1 focus-visible:ring-[#D4A017]"
                            />
                            <Button
                                onClick={handleMagicDraft}
                                disabled={isAILoading || !magicPrompt.trim()}
                                className="absolute bottom-2 right-2 bg-[#D4A017] hover:bg-[#B8860B] text-white h-8 px-3 text-xs gap-1.5 shadow-sm"
                            >
                                {isAILoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Draft with AI
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={isRecording ? stopRecording : startRecording}
                                className={cn(
                                    "absolute bottom-2 right-32 h-8 w-8 rounded-full transition-all",
                                    isRecording ? "bg-red-50 text-red-600 animate-pulse" : "text-[#8A8880] hover:text-[#D4A017] hover:bg-[#FAF9F6]"
                                )}
                            >
                                {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            </Button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="h-px flex-1 bg-gray-100" />
                            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">OR</span>
                            <div className="h-px flex-1 bg-gray-100" />
                        </div>

                        <div className="flex justify-center">
                            <label className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl border border-dashed border-gray-200 hover:border-[#D4A017] hover:bg-[#FAF9F6] cursor-pointer transition-all w-full justify-center">
                                <Upload className="w-4 h-4 text-[#D4A017]" />
                                <span className="text-sm text-gray-600">
                                    {isUploading ? "Processing Document..." : "Smart Upload: Drop existing PDF or DOCX to structure"}
                                </span>
                                <input type="file" hidden accept=".pdf,.txt,.docx" onChange={handleFileUpload} disabled={isUploading} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* AI Confirmation Dialog */}
                {
                    showAIConfirmation && aiExtractedData && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-lg overflow-hidden stagger">
                                <div className="bg-[#FAF9F6] px-6 py-4 border-b flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-[#D4A017]" />
                                        <h3 className="font-medium">AI Structuring Check</h3>
                                    </div>
                                    <button onClick={() => setShowAIConfirmation(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                                        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
                                        <p className="text-xs text-blue-800 leading-relaxed">
                                            The AI has extracted the following details. Please confirm if they are correct before we generate the full document.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                                            <span className="text-gray-500">Document Type</span>
                                            <span className="font-medium uppercase text-[#D4A017]">{aiExtractedData.type || contractType}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                                            <span className="text-gray-500">Main Party</span>
                                            <span className="font-medium">{aiExtractedData.from_name || "—"}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                                            <span className="text-gray-500">Counter Party</span>
                                            <span className="font-medium">{aiExtractedData.to_name || "—"}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                                            <span className="text-gray-500">Body Length</span>
                                            <span className="font-medium">{aiExtractedData.body_text?.length || 0} characters</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <Button variant="outline" onClick={() => setShowAIConfirmation(false)} className="flex-1 h-11">
                                            Discard
                                        </Button>
                                        <Button onClick={applyAIResult} className="flex-1 bg-[#1A1A18] hover:bg-[#333] text-white h-11 gap-2">
                                            <Check className="w-4 h-4" />
                                            Apply AI Draft
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Form Container */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-4 sm:p-6 space-y-6 sm:space-y-8">

                    {/* Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Document Title</Label>
                            <Input value={contractTitle} onChange={e => setContractTitle(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Agreement Reference #</Label>
                            <Input value={contractNumber} onChange={e => setContractNumber(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Effective Date</Label>
                            <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Expiry Date (Optional)</Label>
                            <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                        </div>
                    </div>

                    {/* Governing Contract Selector */}
                    {availableContracts.length > 0 && (
                        <div className="space-y-2 p-4 bg-orange-50/50 rounded-lg border border-[#D4A017]/20 animate-fade-in text-left">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="h-4 w-4 text-[#D4A017]" />
                                <Label className="text-[10px] text-[#D4A017] uppercase tracking-wider font-bold">Governing Contract / Legal Anchor</Label>
                            </div>
                            <Select value={contractId || "none"} onValueChange={(v) => setContractId(v === "none" ? null : v)}>
                                <SelectTrigger className="h-10 border-[#D4A017]/30 bg-white text-sm">
                                    <SelectValue placeholder="Select primary governing contract (e.g. MSA)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" className="text-sm text-[#8A8880]">Independent document (No parent)</SelectItem>
                                    {availableContracts.map((c) => (
                                        <SelectItem key={c.id} value={c.id} className="text-sm">
                                            {c.title || c.document_number || "Untitled Contract"} ({c.type.toUpperCase()} - {c.status})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-[#8A8880]">Linking this {contractType.toUpperCase()} to an existing contract ensures a proper legal hierarchy and audit trail.</p>
                        </div>
                    )}

                    <div className="border-t border-gray-100 pt-4 sm:pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                        <div className="space-y-1.5">
                            <Label className="text-gray-500">Party 1 (You / Disclosing Party)</Label>
                            <Input placeholder="Your Full Legal Name or Company" value={fromName} onChange={e => setFromName(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-gray-500">Party 2 (Client / Receiving Party)</Label>
                            <Input placeholder="Client Legal Name or Company" value={toName} onChange={e => setToName(e.target.value)} />
                        </div>
                    </div>

                    {/* Contract Body */}
                    <div className="border-t border-gray-100 pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-base font-bold text-[#1A1A18]">
                                <FileText className="w-5 h-5 text-[#D4A017]" />
                                Agreement Terms & Clauses
                            </Label>
                        </div>
                        <RichTextEditor
                            content={bodyText}
                            onChange={setBodyText}
                            className="min-h-[400px]"
                        />
                    </div>

                    {/* Notes */}
                    <div className="border-t border-gray-100 pt-6 space-y-2">
                        <Label>Private Notes</Label>
                        <Textarea
                            placeholder="Internal reference notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Options Section */}
                <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 sm:p-8 space-y-4 sm:space-y-8">
                    <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => setOptionsOpen(!optionsOpen)}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-50 rounded-lg text-[#D4A017] group-hover:scale-110 transition-transform">
                                    <Settings2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1A1A18] uppercase tracking-wider">Formatting & Options</h3>
                                    <p className="text-xs text-[#8A8880]">Customize look, signatures, and watermarks</p>
                                </div>
                            </div>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0 hover:bg-orange-50">
                                    <ChevronDown className={cn("h-4 w-4 text-[#8A8880] transition-transform duration-300", optionsOpen && "rotate-180")} />
                                </Button>
                            </CollapsibleTrigger>
                        </div>

                        <CollapsibleContent className="pt-4 sm:pt-8 space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-top-4 duration-300">
                            {/* Logo & Color */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-bold text-[#4A4A45] uppercase tracking-widest flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5" /> Company Logo</Label>
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={cn(
                                            "relative h-32 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 overflow-hidden bg-[#FAF9F6]",
                                            isDragging ? "border-[#D4A017] bg-orange-50" : "border-[#E8E6E0] hover:border-[#D4A017]/50"
                                        )}
                                    >
                                        {logo ? (
                                            <>
                                                <img src={logo} alt="Logo" className="max-h-24 max-w-[80%] object-contain px-4" />
                                                <button onClick={removeLogo} className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-red-500 hover:bg-red-50 shadow-sm"><X className="h-3 w-3" /></button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-2 bg-white rounded-lg shadow-sm"><Upload className="h-4 w-4 text-[#8A8880]" /></div>
                                                <p className="text-[10px] text-[#8A8880] font-medium">Drag logo or <button onClick={() => logoInputRef.current?.click()} className="text-[#D4A017] hover:underline">browse</button></p>
                                            </>
                                        )}
                                        <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-[10px] font-bold text-[#4A4A45] uppercase tracking-widest flex items-center gap-2"><Palette className="h-3.5 w-3.5" /> Brand Identity</Label>
                                    <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E8E6E0] flex items-center gap-4">
                                        <div className="flex-1 space-y-1.5">
                                            <p className="text-[10px] font-bold text-[#4A4A45] uppercase tracking-widest">Primary Color</p>
                                            <div className="flex gap-2">
                                                {["#D4A017", "#1A1A18", "#4A7C59", "#2980B9", "#8E44AD", "#C0392B"].map(color => (
                                                    <button key={color} onClick={() => setPrimaryColor(color)} className={cn("h-6 w-6 rounded-full border-2 transition-transform hover:scale-110", primaryColor === color ? "border-white shadow-sm ring-1 ring-black" : "border-transparent")} style={{ backgroundColor: color }} />
                                                ))}
                                                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-6 w-6 rounded-full border-none cursor-pointer bg-transparent" />
                                            </div>
                                        </div>
                                        <div className="h-10 w-10 rounded-lg shadow-sm flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}><Settings2 className="h-5 w-5" /></div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-[#F5F3EE]" />

                            {/* Signatures */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-bold text-[#4A4A45] uppercase tracking-widest flex items-center gap-2"><PenTool className="h-3.5 w-3.5" /> Signature Provision</Label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={includeSignatureLines} onChange={(e) => setIncludeSignatureLines(e.target.checked)} className="rounded h-3.5 w-3.5 accent-[#D4A017]" />
                                        <span className="text-xs font-medium text-[#4A4A45]">Enable signing blocks</span>
                                    </label>
                                </div>

                                {includeSignatureLines && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2 cursor-pointer pb-1">
                                                <input type="checkbox" checked={showSignatureSection} onChange={(e) => setShowSignatureSection(e.target.checked)} className="rounded h-3.5 w-3.5 accent-[#D4A017]" />
                                                <span className="text-xs font-semibold text-[#1A1A18]">Authorized Provider Sign</span>
                                            </label>
                                            {showSignatureSection && (
                                                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E6E0] space-y-4 shadow-inner">
                                                    <SignaturePad onSignatureChange={setSignature} initialSignature={signature || undefined} width={300} height={100} className="w-full bg-white rounded-lg shadow-sm border border-[#E8E6E0]" />
                                                    <p className="text-[10px] text-[#8A8880] text-center italic">Sign once to pre-fill all generated documents</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2 cursor-pointer pb-1">
                                                <input type="checkbox" checked={showClientSignatureSection} onChange={(e) => setShowClientSignatureSection(e.target.checked)} className="rounded h-3.5 w-3.5 accent-[#D4A017]" />
                                                <span className="text-xs font-semibold text-[#1A1A18]">Recipient Client Sign</span>
                                            </label>
                                            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E6E0] flex items-center justify-center h-[140px]">
                                                <div className="text-center space-y-2 opacity-60">
                                                    <div className="mx-auto w-8 h-8 rounded-full bg-white flex items-center justify-center border border-[#E8E6E0]"><Check className="h-4 w-4 text-[#8A8880]" /></div>
                                                    <p className="text-[10px] text-[#8A8880] uppercase tracking-widest font-bold">Block will be generated</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-[#F5F3EE]" />

                            {/* Watermark Section */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-[10px] font-bold text-[#4A4A45] uppercase tracking-widest flex items-center gap-2"><Shield className="h-3.5 w-3.5" /> Security & Watermark</Label>
                                        <span className="px-1.5 py-0.5 rounded bg-[#D4A017] text-white text-[8px] font-bold uppercase tracking-wider shadow-sm">Pro</span>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={watermarkEnabled} onChange={(e) => setWatermarkEnabled(e.target.checked)} className="rounded h-3.5 w-3.5 accent-[#D4A017]" />
                                        <span className="text-xs font-medium text-[#4A4A45]">Enable watermark</span>
                                    </label>
                                </div>

                                {watermarkEnabled && (
                                    <div className="p-6 rounded-xl bg-[#FAF9F6] border border-[#E8E6E0] space-y-6">
                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-bold text-[#8A8880] uppercase tracking-widest">Watermark Text</Label>
                                            <div className="flex gap-2 flex-wrap">
                                                {watermarkPresets.map(preset => (
                                                    <Button key={preset} type="button" variant={watermarkText === preset ? "default" : "outline"} onClick={() => setWatermarkText(preset)} size="sm" className="h-7 text-[10px] font-bold px-3 uppercase tracking-wider">{preset}</Button>
                                                ))}
                                            </div>
                                            <Input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="Custom text..." className="bg-white border-[#E8E6E0] text-xs h-9 uppercase tracking-widest" />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-[10px] font-bold text-[#8A8880] uppercase tracking-widest">Opacity: {Math.round(watermarkOpacity * 100)}%</Label>
                                            </div>
                                            <Slider value={[watermarkOpacity * 100]} onValueChange={(val) => setWatermarkOpacity(val[0] / 100)} min={0} max={50} step={1} className="py-2" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </div>

                {/* Action Bar */}
                {/* Action Bar */}
                <div className="sticky bottom-4 z-40 bg-white p-3 sm:p-4 rounded-xl shadow-xl border border-gray-200">
                    {trackedLink ? (
                        <div className="flex flex-col gap-3">
                            <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800">
                                Contract saved! Send this link to your client:
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input readOnly value={trackedLink} className="bg-gray-50 flex-1 text-sm" />
                                <div className="flex gap-2">
                                    <Button onClick={() => { navigator.clipboard.writeText(trackedLink); toast.success("Copied!"); }} variant="outline" size="sm" className="flex-1 sm:flex-initial">
                                        Copy
                                    </Button>
                                    <Link href={trackedLink} target="_blank" className="flex-1 sm:flex-initial">
                                        <Button size="sm" className="bg-[#1A1A18] hover:bg-[#333] text-white w-full">View</Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                variant="outline"
                                onClick={handlePreview}
                                disabled={isGeneratingPreview}
                                className="flex-1 py-4 sm:py-6 text-base sm:text-lg border-[#E8E6E0] text-[#4A4A45] hover:text-[#1A1A18]"
                            >
                                <Eye className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                {isGeneratingPreview ? "Loading..." : "Preview"}
                            </Button>
                            <Button
                                onClick={handleSaveAndTrack}
                                disabled={isSaving}
                                className="flex-1 bg-[#1A1A18] hover:bg-[#333] text-white py-4 sm:py-6 text-base sm:text-lg"
                            >
                                {isSaving ? "Saving..." : "Generate Tracked Agreement"}
                            </Button>
                        </div>
                    )}
                </div>

                {/* ── Preview Dialog ───────────────────────────────── */}
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
                        <header className="px-6 py-5 border-b flex-shrink-0 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-3">
                                <Eye className="h-5 w-5 text-[#D4A017]" />
                                <div>
                                    <h3 className="text-lg font-medium">Contract Preview</h3>
                                    <p className="text-xs text-[#8A8880] mt-0.5">Review the formal legal layout</p>
                                </div>
                            </div>
                            <Button onClick={handleSaveAndTrack} disabled={isSaving} className="bg-[#1A1A18] hover:bg-[#333] text-white h-10 px-6">
                                {isSaving ? "Saving..." : "Save & Generate Link"}
                            </Button>
                        </header>
                        <div className="flex-1 overflow-auto bg-[#F5F3EE] p-6 md:p-10">
                            {previewHtml ? (
                                <div className="bg-white shadow-xl mx-auto rounded-lg overflow-hidden p-8 sm:p-12 ring-1 ring-black/5" style={{ maxWidth: "800px" }}>
                                    <div className="contract-preview-content prose prose-stone max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-48">
                                    <Loader2 className="h-8 w-8 animate-spin text-[#D4A017]" />
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

            </main>
        </div>
    );
}
