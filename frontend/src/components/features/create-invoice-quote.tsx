"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Plus, Trash2, Download, X, Eye, ImageIcon, PenTool, Droplets,
  Type, Upload, ChevronDown, Settings2, Sparkles, Languages, Mic,
  MicOff, User, LogOut, Clock, Building, Crown, Star, Activity,
} from "lucide-react";
import { SignaturePad } from "@/components/shared/signature-pad";
import { AppHeader } from "@/components/layout/app-header";
import { toWords } from "number-to-words";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

const emptyItem: InvoiceItem = { description: "", quantity: 1, unit_price: 0, tax_rate: 0 };

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "COP", symbol: "$", name: "Colombian Peso" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
  { code: "BTC", symbol: "₿", name: "Bitcoin" },
  { code: "ETH", symbol: "Ξ", name: "Ethereum" },
];

const watermarkPresets = ["CONFIDENTIAL", "DRAFT", "PAID", "COPY", "SAMPLE", "VOID"];

export function CreateInvoiceQuote({ defaultType = "INVOICE" }: { defaultType?: "INVOICE" | "QUOTE" }) {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  // ── AI Extraction ─────────────────────────────────────────
  const [promptText, setPromptText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  // ── Voice Recording ───────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // ── Invoice details ───────────────────────────────────────
  const [invoiceTitle, setInvoiceTitle] = useState(defaultType);
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [useCustomCurrency, setUseCustomCurrency] = useState(false);
  const [customCurrencyCode, setCustomCurrencyCode] = useState("");
  const [customCurrencySymbol, setCustomCurrencySymbol] = useState("");

  // Logo
  const [logo, setLogo] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Parties
  const [fromName, setFromName] = useState("");
  const [fromDetails, setFromDetails] = useState("");
  const [toName, setToName] = useState("");
  const [toDetails, setToDetails] = useState("");

  // Items
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }]);

  // Additional
  const [notes, setNotes] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#D4A017");
  const [showTax, setShowTax] = useState(true);

  // Amount in Words
  const [amountInWords, setAmountInWords] = useState("");
  const [showAmountInWords, setShowAmountInWords] = useState(false);
  const [isAmountInWordsManual, setIsAmountInWordsManual] = useState(false);

  // Signature
  const [signature, setSignature] = useState<string | null>(null);
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [showSignatureSection, setShowSignatureSection] = useState(false);
  const [showClientSignatureSection, setShowClientSignatureSection] = useState(false);
  const [includeSignatureLines, setIncludeSignatureLines] = useState(true);

  // Watermark
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkContentType, setWatermarkContentType] = useState<"text" | "image">("text");
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [watermarkColor, setWatermarkColor] = useState("#4A4A45");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.15);
  const [watermarkRotation, setWatermarkRotation] = useState(-45);
  const [watermarkFontSize, setWatermarkFontSize] = useState(60);
  const watermarkUploadRef = useRef<HTMLInputElement>(null);

  // UI
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [trackedLink, setTrackedLink] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Edit Mode
  const [editToken, setEditToken] = useState<string | null>(null);

  // Related Contract
  const [contractId, setContractId] = useState<string | null>(null);
  const [availableContracts, setAvailableContracts] = useState<any[]>([]);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);

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

  // Lookup relationship by email when toDetails changes
  useEffect(() => {
    if (!token) return;
    const emailMatch = toDetails.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
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
  }, [toDetails, token]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const editId = params.get("edit");
      const duplicateIdRaw = params.get("duplicate");

      if (editId) {
        setEditToken(editId);
        loadDocument(editId, false);
      } else if (duplicateIdRaw) {
        // e.g. "quote_abc123" or "invoice_xyz890"
        const isQuoteStr = duplicateIdRaw.startsWith("quote_");
        const realId = duplicateIdRaw.replace("quote_", "").replace("invoice_", "");
        loadDocument(realId, true, isQuoteStr);
      }
    }
  }, []);

  const loadDocument = async (t: string, isDuplicate: boolean, isExplicitlyQuote: boolean = false) => {
    try {
      let isQuote = false;
      let res;

      // If duplicating from unified history, we might know the type directly from the query param
      if (isExplicitlyQuote) {
        isQuote = true;
        res = await fetch(`${API_URL}/api/quotes/track/${t}`);
      } else if (isDuplicate) {
        // It's a duplicate of an invoice explicitly (or we didn't specify, fallback to invoice)
        res = await fetch(`${API_URL}/api/invoice/track/${t}`);
      } else {
        // Legacy edit logic (try quote, then invoice)
        res = await fetch(`${API_URL}/api/quotes/track/${t}`);
        if (res.ok) isQuote = true;
        else res = await fetch(`${API_URL}/api/invoice/track/${t}`);
      }

      if (res.ok) {
        const data = await res.json();
        const doc = isQuote ? data.quote : data.invoice;

        setInvoiceTitle(isQuote ? "QUOTE" : "INVOICE");

        if (isDuplicate) {
          // Generate fresh identifiers for a duplicate
          setInvoiceNumber(isQuote ? `QT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}` : `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`);
          setInvoiceDate(new Date().toISOString().split("T")[0]);
        } else {
          setInvoiceNumber(isQuote ? doc.quote_number : doc.invoice_number);
          setInvoiceDate(isQuote ? doc.quote_date : doc.invoice_date);
        }

        setDueDate(doc.due_date || "");
        setFromName(doc.from_name || "");
        setFromDetails(doc.from_details || "");
        setToName(doc.to_name || "");
        setToDetails(doc.to_details || "");

        setCurrency(doc.currency || "USD");
        setCurrencySymbol(doc.currency_symbol || "$");
        setNotes(doc.notes || "");
        if (doc.primary_color) setPrimaryColor(doc.primary_color);
        if (doc.contract_id) setContractId(doc.contract_id);
        if (doc.relationship_id) fetchContracts(doc.relationship_id);

        if (data.items && data.items.length > 0) {
          setItems(data.items.map((i: any) => ({
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
            tax_rate: i.tax_rate || 0
          })));
        }
        toast.success(isDuplicate ? "Document duplicated successfully" : "Document loaded for editing");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setPromptText("");
    setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setFromName("");
    setFromDetails("");
    setToName("");
    setToDetails("");
    setItems([{ ...emptyItem }]);
    setNotes("");
    setAmountInWords("");
    setSignature(null);
    setClientSignature(null);
    setEditToken(null);
    setTrackedLink(null);
    setContractId(null);
    setAvailableContracts([]);
  };

  // Multi-profile
  interface ProfileData {
    id: string; label: string; is_default: boolean; name: string;
    address: string | null; email: string | null; phone: string | null;
    logo_url: string | null; signature_data: string | null;
    primary_color: string; default_currency: string; default_currency_symbol: string;
    default_notes: string | null;
    watermark_enabled: boolean; watermark_type: string; watermark_text: string;
    watermark_image: string | null; watermark_color: string;
    watermark_opacity: number; watermark_rotation: number; watermark_font_size: number;
  }
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Address Book
  interface SavedClientData {
    id: string; name: string; email: string | null; address: string | null; phone: string | null;
  }
  const [savedClients, setSavedClients] = useState<SavedClientData[]>([]);
  const [clientMenuOpen, setClientMenuOpen] = useState(false);

  const applyProfile = (p: ProfileData) => {
    setActiveProfileId(p.id);
    setFromName(p.name || "");
    setFromDetails([p.address, p.email, p.phone].filter(Boolean).join("\n"));
    if (p.primary_color) setPrimaryColor(p.primary_color);
    if (p.default_currency) setCurrency(p.default_currency);
    if (p.default_currency_symbol) setCurrencySymbol(p.default_currency_symbol);
    if (p.default_notes) setNotes(p.default_notes);
    if (p.logo_url) setLogo(p.logo_url);
    if (p.signature_data) { setSignature(p.signature_data); setShowSignatureSection(true); setIncludeSignatureLines(true); }
    // Watermark defaults
    setWatermarkEnabled(p.watermark_enabled);
    setWatermarkContentType((p.watermark_type as "text" | "image") || "text");
    if (p.watermark_text) setWatermarkText(p.watermark_text);
    if (p.watermark_image) setWatermarkImage(p.watermark_image);
    if (p.watermark_color) setWatermarkColor(p.watermark_color);
    setWatermarkOpacity(p.watermark_opacity ?? 0.15);
    setWatermarkRotation(p.watermark_rotation ?? -45);
    setWatermarkFontSize(p.watermark_font_size ?? 60);
    setProfileMenuOpen(false);
  };

  const applyClient = (c: SavedClientData) => {
    setToName(c.name || "");
    setToDetails([c.address, c.email, c.phone].filter(Boolean).join("\n"));
    setClientMenuOpen(false);
    // Relationship lookup will be triggered by toDetails watcher
  };

  const saveClientToAddressBook = async () => {
    if (!token) return;
    if (!toName.trim()) {
      toast.error("Please enter a Client Name first.");
      return;
    }

    // Attempt basic parsing of toDetails
    const lines = toDetails.split('\n');
    let email = null;
    let phone = null;
    let addressLines = [];

    for (const line of lines) {
      if (line.includes('@')) email = line.trim();
      else if (/[\d\+\-\(\)\s]{8,}/.test(line)) phone = line.trim(); // rough phone heuristic
      else addressLines.push(line.trim());
    }

    try {
      const res = await fetch(`${API_URL}/api/clients/saved`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: toName.trim(),
          email: email,
          phone: phone,
          address: addressLines.length > 0 ? addressLines.join("\n") : null
        })
      });
      if (res.ok) {
        const newClient = await res.json();
        setSavedClients([newClient, ...savedClients]);
        toast.success("Client saved to your Address Book!");
      } else {
        const error = await res.json();
        toast.error(error.detail || "Could not save client.");
      }
    } catch {
      toast.error("Network error saving client.");
    }
  };

  // ── Load saved profiles ────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const loadProfiles = async () => {
      try {
        const res = await fetch(`${API_URL}/api/profiles`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data: ProfileData[] = await res.json();
          setProfiles(data);
          // Auto-apply default profile
          const def = data.find((p) => p.is_default) || data[0];
          if (def && !activeProfileId) applyProfile(def);
        } else {
          // Fallback to old single-profile endpoint
          const res2 = await fetch(`${API_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } });
          if (res2.ok) {
            const profile = await res2.json();
            if (profile && profile.name) {
              setFromName(profile.name);
              setFromDetails([profile.address, profile.email, profile.phone].filter(Boolean).join("\n"));
              if (profile.primary_color) setPrimaryColor(profile.primary_color);
              if (profile.default_currency) setCurrency(profile.default_currency);
              if (profile.default_currency_symbol) setCurrencySymbol(profile.default_currency_symbol);
              if (profile.default_notes) setNotes(profile.default_notes);
            }
          }
        }
      } catch { }

      try {
        const res3 = await fetch(`${API_URL}/api/clients/saved`, { headers: { Authorization: `Bearer ${token}` } });
        if (res3.ok) {
          setSavedClients(await res3.json());
        }
      } catch { }
    };
    loadProfiles();
  }, [token]);

  // ── Sample Data Loader ────────────────────────────────────
  const loadSampleData = (type: "QUOTE" | "INVOICE") => {
    setInvoiceTitle(type);
    setInvoiceNumber(type === "QUOTE" ? "QT-2026-001" : "INV-2026-001");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 14);
    setDueDate(nextWeek.toISOString().split("T")[0]);

    setFromName("Studio Alpha Design");
    setFromDetails("hello@studioalpha.com\n123 Creative Blvd, NY 10001\nVAT: 987654321");

    setToName("Acme Corp");
    setToDetails("billing@acmecorp.com\n456 Enterprise Way, SF 94105");

    setCurrency("USD");
    setCurrencySymbol("$");

    setItems([
      { description: "Brand Strategy & Identity Framework", quantity: 1, unit_price: 2500, tax_rate: 0 },
      { description: "Website UI/UX Design (Homepage + 5 internal pages)", quantity: 1, unit_price: 3200, tax_rate: 0 },
      { description: "Asset Export & Handoff formatting", quantity: 10, unit_price: 50, tax_rate: 0 }
    ]);

    if (type === "QUOTE") {
      setNotes("This quote is valid for 14 days. Upon approval, a 50% deposit invoice will be automatically generated.");
      setIncludeSignatureLines(true);
      setShowClientSignatureSection(true);
    } else {
      setNotes("Thank you for your business! Please deposit the total amount to Account #12345678 within 14 days.");
      setIncludeSignatureLines(false);
    }

    toast.success(`Loaded sample ${type.toLowerCase()} data!`);
  };

  // ── Voice Recording ───────────────────────────────────────
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
    if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); }
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      const res = await fetch(`${API_URL}/api/whisper/transcribe`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.transcript) {
        setPromptText((prev) => prev ? `${prev}\n${data.transcript}` : data.transcript);
        toast.success("Transcribed — review and click Invoq it");
      } else toast.error(data.error || "Transcription failed");
    } catch (err: any) { toast.error(err.message || "Network error"); }
    finally { setIsTranscribing(false); }
  };

  // ── AI Extraction ─────────────────────────────────────────
  const handleExtract = async () => {
    if (!promptText.trim()) { toast.error("Describe your invoice first"); return; }
    setIsExtracting(true);
    try {
      const res = await fetch(`${API_URL}/api/extract`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: promptText }) });
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        if (d.client_name) setToName(d.client_name);
        if (d.client_email || d.client_address) setToDetails([d.client_address, d.client_email].filter(Boolean).join("\n"));
        if (d.items?.length > 0) setItems(d.items.map((item: any) => ({ description: item.description || "", quantity: item.quantity || 1, unit_price: item.unit_price || 0, tax_rate: item.tax_rate || 0 })));
        if (d.due_date) setDueDate(d.due_date);
        if (d.currency) { const found = currencies.find((c) => c.code === d.currency); if (found) { setCurrency(found.code); setCurrencySymbol(found.symbol); } }
        if (d.notes) setNotes(d.notes);
        toast.success("Fields extracted — review below");
      } else toast.error(data.error || "Extraction failed");
    } catch (err: any) { toast.error(err.message || "Failed to connect"); }
    finally { setIsExtracting(false); }
  };

  // ── Invoice Data Builder ──────────────────────────────────
  const getInvoiceData = () => ({
    title: invoiceTitle,
    invoice_number: invoiceTitle === "INVOICE" ? invoiceNumber : undefined,
    quote_number: invoiceTitle === "QUOTE" ? invoiceNumber : undefined,
    invoice_date: invoiceDate,
    due_date: dueDate || undefined,
    from_address: { name: fromName, address_line1: fromDetails, address_line2: "", city: "", state: "", postal_code: "", country: "", email: "", phone: "" },
    to_address: { name: toName, address_line1: toDetails, address_line2: "", city: "", state: "", postal_code: "", country: "", email: "", phone: "" },
    items,
    currency: useCustomCurrency ? customCurrencyCode : currency,
    currency_symbol: useCustomCurrency ? customCurrencySymbol : currencySymbol,
    notes: notes || undefined,
    primary_color: primaryColor,
    template: "modern",
    logo_url: logo || undefined,
    show_tax: showTax,
    amount_in_words: showAmountInWords ? amountInWords : undefined,
    signature_data: signature || undefined,
    client_signature_data: clientSignature || undefined,
    show_signature_section: includeSignatureLines,
    contract_id: contractId || undefined,
    watermark: watermarkEnabled ? { enabled: true, content: watermarkContentType === "text" ? watermarkText : watermarkImage, content_type: watermarkContentType, color: watermarkColor, opacity: watermarkOpacity, rotation: watermarkRotation, font_size: watermarkFontSize } : undefined,
  });

  const handlePreview = async () => {
    const data = getInvoiceData();
    if (!data.from_address.name || !data.to_address.name) { toast.error("Please fill in sender and client names"); return; }
    if (data.items.some((i) => !i.description)) { toast.error("Please fill in all item descriptions"); return; }
    setIsGeneratingPreview(true);
    try {
      const res = await fetch(`${API_URL}/api/invoice/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await res.json();
      if (result.success) { setPreviewHtml(result.html); setPreviewOpen(true); } else toast.error(result.error || "Preview failed");
    } catch (err: any) { toast.error(err.message); } finally { setIsGeneratingPreview(false); }
  };

  const handleGenerate = async () => {
    const data = getInvoiceData();
    setIsGeneratingPdf(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_URL}/api/invoice/generate`, { method: "POST", headers, body: JSON.stringify(data) });
      const result = await res.json();
      if (result.success) {
        const link = document.createElement("a");
        link.href = `${API_URL}${result.download_url}`;
        link.download = `Invoice_${invoiceNumber}.pdf`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        toast.success("Invoice downloaded");
        setPreviewOpen(false);
      } else toast.error(result.error || "Generation failed");
    } catch (err: any) { toast.error(err.message); } finally { setIsGeneratingPdf(false); }
  };

  const handleSaveAndTrack = async () => {
    if (!user) {
      handleGenerate(); // Call download legacy workflow for guests
      return;
    }
    const data = getInvoiceData();
    setIsGeneratingPdf(true);
    try {
      if (invoiceTitle === "QUOTE") {
        const payload = {
          title: invoiceTitle,
          quote_number: invoiceNumber,
          quote_date: invoiceDate,
          due_date: dueDate || undefined,
          from_name: fromName,
          from_details: fromDetails,
          to_name: toName,
          to_details: toDetails,
          currency: useCustomCurrency ? customCurrencyCode : currency,
          currency_symbol: useCustomCurrency ? customCurrencySymbol : currencySymbol,
          subtotal: calculateSubtotal(),
          tax_total: calculateTax(),
          total: calculateTotal(),
          notes: notes || undefined,
          items: items,
          extracted_json: { items }
        };
        const res = await fetch(
          editToken ? `${API_URL}/api/quotes/${editToken}` : `${API_URL}/api/quotes`,
          {
            method: editToken ? "PUT" : "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload)
          }
        );
        const result = await res.json();
        if (result.success) {
          toast.success(editToken ? "Quote updated!" : "Quote saved & tracked link generated!");
          if (!editToken && result.tracked_link_token) {
            const t_token = result.tracked_link_token;
            resetForm();
            router.push(`/view/${t_token}`);
          }
          setPreviewOpen(false);
        } else {
          toast.error(result.error || "Failed to save Quote");
        }
      } else {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const payload = {
          ...data,
          contract_id: contractId || undefined
        };

        const endpoint = editToken ? `${API_URL}/api/invoice/${editToken}` : `${API_URL}/api/invoice/generate`;
        const method = editToken ? "PUT" : "POST";

        const res = await fetch(endpoint, { method, headers, body: JSON.stringify(payload) });
        const result = await res.json();
        if (result.success) {
          if (editToken) {
            toast.success("Invoice updated!");
          } else if (result.tracked_link_token) {
            const token = result.tracked_link_token;
            resetForm();
            router.push(`/view/invoice/${token}`);
            toast.success("Invoice saved & tracked link generated!");
          } else {
            toast.success("Invoice generated!");
            resetForm();
          }
          setPreviewOpen(false);
        } else {
          toast.error(result.error || "Generation failed");
        }
      }
    } catch (err: any) { toast.error(err.message); } finally { setIsGeneratingPdf(false); }
  };

  // ── Calculations ──────────────────────────────────────────
  const calculateSubtotal = () => items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const calculateTax = () => items.reduce((sum, i) => sum + i.quantity * i.unit_price * (i.tax_rate / 100), 0);
  const calculateTotal = () => calculateSubtotal() + (showTax ? calculateTax() : 0);

  useEffect(() => {
    if (showAmountInWords && !isAmountInWordsManual) {
      const total = calculateTotal();
      if (total > 0) {
        try {
          const whole = Math.floor(total);
          const dec = Math.round((total - whole) * 100);
          let words = toWords(whole);
          const major = currency === "NGN" ? "Naira" : "Dollars";
          const minor = currency === "NGN" ? "Kobo" : "Cents";
          setAmountInWords(dec > 0 ? `${words} ${major} and ${toWords(dec)} ${minor}` : `${words} ${major} Only`);
        } catch { }
      }
    }
  }, [items, showAmountInWords, isAmountInWordsManual, currency, showTax]);

  // ── Logo ──────────────────────────────────────────────────
  const processLogoFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }, []);
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processLogoFile(f); };
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processLogoFile(f); }, [processLogoFile]);
  const removeLogo = () => { setLogo(null); if (logoInputRef.current) logoInputRef.current.value = ""; };

  // ── Items ─────────────────────────────────────────────────
  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (i: number) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };
  const updateItem = (i: number, field: keyof InvoiceItem, value: string | number) => { const n = [...items]; n[i] = { ...n[i], [field]: value }; setItems(n); };

  // ── Watermark ─────────────────────────────────────────────
  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    const reader = new FileReader();
    reader.onload = () => setWatermarkImage(reader.result as string);
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const canGenerate = fromName && toName && items.every((i) => i.description);
  const displaySymbol = useCustomCurrency ? customCurrencySymbol : currencySymbol;

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-6 stagger animate-fade-in">

        {/* ── Profile selector (compact) ─────────────────── */}
        {user && profiles.length > 0 && (
          <div className="relative inline-flex z-[60]" style={{ overflow: "visible" }}>
            <button onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border text-xs hover:border-[#D4A017] transition-colors">
              <Building className="h-3.5 w-3.5 text-[#8A8880]" />
              <span className="font-medium text-[#1A1A18]">
                {profiles.find((p) => p.id === activeProfileId)?.label || profiles.find((p) => p.id === activeProfileId)?.name || "Select profile"}
              </span>
              <ChevronDown className={cn("h-3 w-3 text-[#8A8880] transition-transform", profileMenuOpen && "rotate-180")} />
            </button>
            {profileMenuOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setProfileMenuOpen(false)} />
                <div className="absolute left-0 top-full mt-1 min-w-[200px] bg-white border rounded-xl shadow-lg z-[60] py-1 animate-fade-in-scale">
                  {profiles.map((p) => (
                    <button key={p.id} onClick={() => applyProfile(p)}
                      className={cn("w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[#FAF9F6] transition-colors",
                        activeProfileId === p.id && "bg-[#FAF9F6]")}>
                      {p.is_default && <Star className="h-3 w-3 text-[#D4A017] fill-[#D4A017]" />}
                      <span className="font-medium text-[#1A1A18]">{p.label || p.name}</span>
                      {p.label && p.name && p.label !== p.name && (
                        <span className="text-[#8A8880] text-xs ml-auto">{p.name}</span>
                      )}
                    </button>
                  ))}
                  <div className="border-t my-1" />
                  <Link href="/profile" onClick={() => setProfileMenuOpen(false)}
                    className="w-full text-left px-4 py-2 text-xs text-[#D4A017] flex items-center gap-2 hover:bg-[#FAF9F6]">
                    <Settings2 className="h-3.5 w-3.5" /> Manage profiles
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Usage badge ────────────────────────────────── */}
        {user && user.subscription_status !== "pro" && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white border text-sm">
            <span className="text-[#4A4A45]">
              <span className="font-semibold text-[#1A1A18]">Free Plan.</span> Unlimited Invoices.
            </span>
            <Link href="/pricing" className="text-[#D4A017] hover:text-[#B8860B] font-medium text-sm">
              Unlock Pro Features →
            </Link>
          </div>
        )}

        {/* ── Document Type Info & Quick Start ────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-[#D4A017]/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4A017]/5 to-transparent rounded-full -mr-10 -mt-10 pointer-events-none" />
          <div className="w-full">
            <h2 className="text-lg font-normal mb-1 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
              {invoiceTitle === "QUOTE" ? "Creating a Quote" : "Creating an Invoice"}
              {invoiceTitle === "QUOTE" ? (
                <span className="px-2 py-0.5 rounded-full bg-[#D4A017]/10 text-[#D4A017] text-[10px] font-bold tracking-widest uppercase">Quote</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-[#1A1A18]/5 text-[#1A1A18] text-[10px] font-bold tracking-widest uppercase">Invoice</span>
              )}
            </h2>
            <Accordion type="single" collapsible className="w-full mt-2">
              <AccordionItem value="info" className="border-b-0">
                <AccordionTrigger className="py-2 text-xs text-[#8A8880] hover:text-[#1A1A18] hover:no-underline">
                  What is a {invoiceTitle === "QUOTE" ? "Quote" : "Invoice"}?
                </AccordionTrigger>
                <AccordionContent className="text-xs text-[#8A8880] leading-relaxed pb-3">
                  {invoiceTitle === "QUOTE" ? (
                    <>A <strong>Quote</strong> is an estimated pricing proposal for services or goods to be provided. It is sent <em>before</em> work begins to establish agreement on scope and cost. It is not legally binding until accepted.</>
                  ) : (
                    <>An <strong>Invoice</strong> is a formal request for payment for goods or services that have been provided. It is sent <em>after</em> work is completed (or at agreed milestones) and establishes a legal obligation for the client to pay.</>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <div className="flex flex-col w-full sm:w-auto gap-2 shrink-0">
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              {invoiceTitle === "QUOTE" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => !editToken && loadSampleData("QUOTE")}
                  disabled={!!editToken}
                  className="w-full text-xs h-8 border-[#D4A017]/30 text-[#D4A017] hover:bg-[#D4A017]/5"
                >
                  Load Sample Quote
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => !editToken && loadSampleData("INVOICE")}
                  disabled={!!editToken}
                  className="w-full text-xs h-8"
                >
                  Load Sample Invoice
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── AI Extraction ──────────────────────────────── */}
        <Card className="gold-top-border overflow-hidden">
          <CardHeader className="py-5 px-6">
            <CardTitle className="text-lg font-normal flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
              Describe your invoice
              <span className="ml-auto text-xs text-[#D4A017] font-sans font-medium tracking-wide uppercase">AI-powered</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 space-y-4">
            <Textarea value={promptText} onChange={(e) => setPromptText(e.target.value)}
              placeholder={isTranscribing ? "Transcribing..." : "e.g. \"Invoice Sarah at Bloom Co, $800 for logo design, due in 15 days\""}
              rows={3} className="resize-none text-[15px] placeholder:text-[#8A8880]" disabled={isTranscribing} />
            <div className="flex gap-2.5">
              <Button onClick={handleExtract} disabled={isExtracting || !promptText.trim() || isTranscribing}
                className="flex-1 h-11 bg-[#D4A017] hover:bg-[#B8860B] text-white font-medium text-sm shadow-sm">
                <Sparkles className="h-4 w-4 mr-2" />
                {isExtracting ? "Working its magic..." : "Invoq it ✦"}
              </Button>
              <Button variant="outline" size="icon"
                onClick={isRecording ? stopRecording : startRecording} disabled={isTranscribing}
                className={cn("shrink-0 h-11 w-11", isRecording && "border-[#C0392B] text-[#C0392B] animate-recording")}
                title={isRecording ? "Stop recording" : "Record voice"}>
                {isRecording ? <MicOff className="h-4 w-4" /> : isTranscribing ? <div className="h-4 w-4 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-[#8A8880]">
              {isRecording ? "Recording — click mic to stop" : isTranscribing ? "Transcribing audio..." : "Type or dictate. AI fills in the form. Review and adjust."}
            </p>
          </CardContent>
        </Card>

        {/* ── Invoice Details ────────────────────────────── */}
        <Card>
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-lg font-normal" style={{ fontFamily: "var(--font-heading)" }}>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Invoice Number</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="h-10 font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Date</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-10 font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10 font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Currency</Label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={useCustomCurrency} onChange={(e) => setUseCustomCurrency(e.target.checked)} className="rounded h-3.5 w-3.5 accent-[#D4A017]" /><span className="text-[11px] text-[#8A8880]">Custom</span></label>
                </div>
                {useCustomCurrency ? (
                  <div className="flex gap-2"><Input value={customCurrencyCode} onChange={(e) => setCustomCurrencyCode(e.target.value.toUpperCase())} placeholder="USD" maxLength={5} className="h-10 w-20 font-mono" /><Input value={customCurrencySymbol} onChange={(e) => setCustomCurrencySymbol(e.target.value)} placeholder="$" maxLength={5} className="h-10 flex-1 font-mono" /></div>
                ) : (
                  <Select value={currency} onValueChange={(v) => { setCurrency(v); setCurrencySymbol(currencies.find((c) => c.code === v)?.symbol || "$"); }}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[250px]">{currencies.map((c) => (<SelectItem key={c.code} value={c.code}><span className="font-mono">{c.code}</span> <span className="text-[#4A4A45]">({c.symbol})</span></SelectItem>))}</SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <Label className="text-xs text-[#4A4A45] flex items-center gap-1.5"><Languages className="h-3.5 w-3.5" /> Amount in Words</Label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showAmountInWords} onChange={(e) => setShowAmountInWords(e.target.checked)} className="rounded h-3.5 w-3.5 accent-[#D4A017]" /><span className="text-xs text-[#4A4A45]">Show</span></label>
            </div>
          </CardContent>
        </Card>

        {/* ── From / To ──────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="py-4 px-6">
              <CardTitle className="text-base font-normal" style={{ fontFamily: "var(--font-heading)" }}>From</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0 space-y-3">
              <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your business name" className="h-10 text-sm" />
              <Textarea value={fromDetails} onChange={(e) => setFromDetails(e.target.value)} placeholder="Address, email, phone..." rows={3} className="resize-none text-sm placeholder:text-[#8A8880]" />
            </CardContent>
          </Card>
          <Card className="relative overflow-visible">
            <CardHeader className="py-4 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-normal flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                Bill To
              </CardTitle>
              {user && savedClients.length > 0 && (
                <div className="relative">
                  <button onClick={() => setClientMenuOpen(!clientMenuOpen)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[#8A8880] hover:text-[#1A1A18] hover:bg-[#F5F3EE] transition-colors">
                    <Building className="h-3 w-3" />
                    <span>Saved Clients</span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", clientMenuOpen && "rotate-180")} />
                  </button>
                  {clientMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-[50]" onClick={() => setClientMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#E8E6E0] rounded-xl shadow-lg z-[60] py-1.5 max-h-64 overflow-y-auto animate-fade-in-scale">
                        <div className="px-3 py-1.5 text-xs font-semibold text-[#8A8880] uppercase tracking-wider">Select Client</div>
                        {savedClients.map((c) => (
                          <button key={c.id} onClick={() => applyClient(c)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5F3EE] transition-colors flex flex-col">
                            <span className="font-medium text-[#1A1A18] truncate w-full">{c.name}</span>
                            <span className="text-xs text-[#8A8880] truncate w-full">{c.email || "No email stored"}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Client Name</Label>
                {user && toName.trim() && !savedClients.some(c => c.name.toLowerCase() === toName.toLowerCase()) && (
                  <button onClick={saveClientToAddressBook} className="text-[10px] text-[#D4A017] hover:underline font-medium uppercase tracking-wide">
                    + Save Client
                  </button>
                )}
              </div>
              <Input value={toName} onChange={(e) => setToName(e.target.value)} placeholder="Client name" className="h-10 text-sm" />
              <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium pt-1 block">Client Details</Label>
              <Textarea value={toDetails} onChange={(e) => setToDetails(e.target.value)} placeholder="Address, email, phone..." rows={3} className="resize-none text-sm placeholder:text-[#8A8880]" />

              {availableContracts.length > 0 && (
                <div className="space-y-1.5 pt-2 animate-fade-in">
                  <Label className="text-[10px] text-[#D4A017] uppercase tracking-wider font-bold">Governing Contract</Label>
                  <Select value={contractId || "none"} onValueChange={(v) => setContractId(v === "none" ? null : v)}>
                    <SelectTrigger className="h-9 border-[#D4A017]/30 bg-[#D4A017]/5 text-xs">
                      <SelectValue placeholder="Select governed contract" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs text-[#8A8880]">No specific contract (default)</SelectItem>
                      {availableContracts.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.title || c.document_number || "Untitled Contract"} ({c.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-[#8A8880]">Linking this {invoiceTitle.toLowerCase()} to a legal contract ensures an audit trail.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Line Items ─────────────────────────────────── */}
        <Card>
          <CardHeader className="py-4 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-normal" style={{ fontFamily: "var(--font-heading)" }}>Items</CardTitle>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showTax} onChange={(e) => setShowTax(e.target.checked)} className="rounded h-3.5 w-3.5 accent-[#D4A017]" /><span className="text-xs text-[#4A4A45]">Include tax</span></label>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="p-4 rounded-lg bg-[#FAF9F6] border border-[#E8E6E0] space-y-3">
                  <div className="flex gap-2">
                    <Input value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} placeholder="Description" className="h-10 flex-1 text-sm bg-white" />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length === 1} className="h-10 w-10 shrink-0 text-[#8A8880] hover:text-[#C0392B]"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className={cn("grid gap-3", showTax ? "grid-cols-3" : "grid-cols-2")}>
                    <div><Label className="text-[10px] text-[#8A8880] uppercase tracking-wider">Qty</Label><Input type="number" min="0" step="0.01" value={item.quantity || ""} onChange={(e) => updateItem(index, "quantity", e.target.value === "" ? 0 : parseFloat(e.target.value))} className="h-9 text-center font-mono text-sm bg-white" /></div>
                    <div><Label className="text-[10px] text-[#8A8880] uppercase tracking-wider">Unit Price</Label><Input type="number" min="0" step="0.01" value={item.unit_price || ""} onChange={(e) => updateItem(index, "unit_price", e.target.value === "" ? 0 : parseFloat(e.target.value))} className="h-9 font-mono text-sm bg-white" /></div>
                    {showTax && <div><Label className="text-[10px] text-[#8A8880] uppercase tracking-wider">Tax %</Label><Input type="number" min="0" max="100" step="0.1" value={item.tax_rate || ""} onChange={(e) => updateItem(index, "tax_rate", e.target.value === "" ? 0 : parseFloat(e.target.value))} className="h-9 font-mono text-sm bg-white" /></div>}
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addItem} size="sm" className="w-full h-10 border-dashed text-[#4A4A45] hover:text-[#1A1A18] hover:border-[#D4A017]">
                <Plus className="h-4 w-4 mr-1.5" /> Add Line Item
              </Button>

              {/* Totals */}
              <div className="border-t pt-4 mt-3">
                <div className="flex justify-end">
                  <div className="w-52 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-[#4A4A45]">Subtotal</span><span className="font-mono">{displaySymbol}{calculateSubtotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    {showTax && <div className="flex justify-between text-sm"><span className="text-[#4A4A45]">Tax</span><span className="font-mono">{displaySymbol}{calculateTax().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total</span>
                      <span className="font-mono text-[#D4A017]">{displaySymbol}{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Amount in Words ────────────────────────────── */}
        {showAmountInWords && (
          <Card className="animate-fade-in">
            <CardHeader className="py-3 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-[#4A4A45]"><Languages className="h-4 w-4" /> Amount in Words</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAmountInWords(false)} className="h-6 w-6 p-0 text-[#8A8880]"><X className="h-3 w-3" /></Button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-5 pt-0 space-y-2">
              <Input value={amountInWords} onChange={(e) => { setAmountInWords(e.target.value); setIsAmountInWordsManual(true); }} placeholder="e.g. One thousand dollars" className="h-10 text-sm italic" />
              {isAmountInWordsManual && <Button variant="ghost" size="sm" onClick={() => { setIsAmountInWordsManual(false); setAmountInWords(""); }} className="h-6 text-[10px] px-2 text-[#8A8880]">Reset to auto</Button>}
            </CardContent>
          </Card>
        )}

        {/* ── Notes ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-base font-normal" style={{ fontFamily: "var(--font-heading)" }}>Notes</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, bank details, thank you message..." rows={3} className="resize-none text-sm placeholder:text-[#8A8880]" />
          </CardContent>
        </Card>

        {/* ── More Options ───────────────────────────────── */}
        <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-6 cursor-pointer hover:bg-[#FDFCFA] transition-colors select-none">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-normal flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}><Settings2 className="h-4 w-4 text-[#4A4A45]" /> Options</CardTitle>
                  <ChevronDown className={cn("h-4 w-4 text-[#8A8880] transition-transform duration-200", optionsOpen && "rotate-180")} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-6 pb-6 pt-0 space-y-6">
                {/* Logo */}
                <div className="space-y-2">
                  <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Company Logo</Label>
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  {logo ? (
                    <div className="relative inline-block"><img src={logo} alt="Logo" className="max-h-16 max-w-[150px] object-contain rounded border" /><button onClick={removeLogo} className="absolute -top-2 -right-2 p-1 bg-[#C0392B] text-white rounded-full shadow"><X className="h-3 w-3" /></button></div>
                  ) : (
                    <div onClick={() => logoInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                      className={cn("flex items-center justify-center gap-2 py-5 border-2 border-dashed rounded-lg cursor-pointer transition-colors", isDragging ? "border-[#D4A017] bg-[rgba(212,160,23,0.04)]" : "border-[#E8E6E0] hover:border-[#D4A017]")}>
                      <Upload className="h-4 w-4 text-[#8A8880]" /><span className="text-sm text-[#8A8880]">Upload logo</span>
                    </div>
                  )}
                </div>
                {/* Accent Color */}
                <div className="space-y-2">
                  <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Accent Color</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg border cursor-pointer shadow-sm" style={{ backgroundColor: primaryColor }} onClick={() => document.getElementById("color-picker")?.click()} />
                    <Input id="color-picker" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-0 h-0 opacity-0 absolute" />
                    <div className="flex gap-2">
                      {["#D4A017", "#1A1A18", "#2563eb", "#4A7C59", "#9333ea", "#C0392B"].map((c) => (
                        <button key={c} onClick={() => setPrimaryColor(c)} className={cn("w-7 h-7 rounded-md transition-all border", primaryColor === c ? "ring-2 ring-offset-2 ring-[#D4A017] scale-110" : "border-transparent")} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Signature */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium flex items-center gap-1.5"><PenTool className="h-3.5 w-3.5" /> Signature</Label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={includeSignatureLines} onChange={(e) => { setIncludeSignatureLines(e.target.checked); if (!e.target.checked) { setShowSignatureSection(false); setShowClientSignatureSection(false); setSignature(null); setClientSignature(null); } }} className="rounded h-3.5 w-3.5 accent-[#D4A017]" /><span className="text-xs text-[#4A4A45]">Include</span></label>
                  </div>
                  {includeSignatureLines && (
                    <div className="space-y-4 pl-1">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showSignatureSection} onChange={(e) => { setShowSignatureSection(e.target.checked); if (!e.target.checked) setSignature(null); }} className="rounded h-3 w-3 accent-[#D4A017]" /><span className="text-xs text-[#4A4A45]">Authorized signature</span></label>
                        {showSignatureSection && <div className="w-full max-w-[280px]"><SignaturePad onSignatureChange={setSignature} initialSignature={signature} width={280} height={100} className="w-full" /></div>}
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showClientSignatureSection} onChange={(e) => { setShowClientSignatureSection(e.target.checked); if (!e.target.checked) setClientSignature(null); }} className="rounded h-3 w-3 accent-[#D4A017]" /><span className="text-xs text-[#4A4A45]">Client signature</span></label>
                        {showClientSignatureSection && <div className="w-full max-w-[280px]"><SignaturePad onSignatureChange={setClientSignature} initialSignature={clientSignature} width={280} height={100} className="w-full" /></div>}
                      </div>
                    </div>
                  )}
                </div>
                {/* Watermark */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5" /> Watermark</Label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={watermarkEnabled} onChange={(e) => setWatermarkEnabled(e.target.checked)} className="rounded h-3.5 w-3.5 accent-[#D4A017]" /><span className="text-xs text-[#4A4A45]">Enable</span></label>
                  </div>
                  {watermarkEnabled && (
                    <div className="space-y-3 pl-1">
                      <div className="flex gap-2">
                        <Button variant={watermarkContentType === "text" ? "default" : "outline"} size="sm" onClick={() => setWatermarkContentType("text")} className={cn("flex-1 h-9", watermarkContentType === "text" && "bg-[#1A1A18] text-white")}><Type className="h-3.5 w-3.5 mr-1" /> Text</Button>
                        <Button variant={watermarkContentType === "image" ? "default" : "outline"} size="sm" onClick={() => setWatermarkContentType("image")} className={cn("flex-1 h-9", watermarkContentType === "image" && "bg-[#1A1A18] text-white")}><ImageIcon className="h-3.5 w-3.5 mr-1" /> Image</Button>
                      </div>
                      {watermarkContentType === "text" ? (
                        <>
                          <div className="flex flex-wrap gap-1.5">{watermarkPresets.map((p) => (<button key={p} onClick={() => setWatermarkText(p)} className={cn("px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors", watermarkText === p ? "bg-[#1A1A18] text-white border-[#1A1A18]" : "border-[#E8E6E0] text-[#4A4A45] hover:border-[#D4A017]")}>{p}</button>))}</div>
                          <Input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} className="h-9 text-sm" />
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><div className="flex justify-between"><Label className="text-[10px] text-[#8A8880] uppercase">Opacity</Label><span className="text-[10px] text-[#8A8880] font-mono">{Math.round(watermarkOpacity * 100)}%</span></div><Slider value={[watermarkOpacity]} onValueChange={([v]) => setWatermarkOpacity(v)} min={0.05} max={0.5} step={0.05} /></div>
                            <div className="space-y-1"><div className="flex justify-between"><Label className="text-[10px] text-[#8A8880] uppercase">Angle</Label><span className="text-[10px] text-[#8A8880] font-mono">{watermarkRotation}°</span></div><Slider value={[watermarkRotation]} onValueChange={([v]) => setWatermarkRotation(v)} min={-90} max={90} step={15} /></div>
                          </div>
                        </>
                      ) : (
                        <>
                          <input ref={watermarkUploadRef} type="file" accept="image/*" onChange={handleWatermarkUpload} className="hidden" />
                          <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-[#D4A017] transition-colors" onClick={() => watermarkUploadRef.current?.click()}>
                            {watermarkImage ? <img src={watermarkImage} alt="Watermark" className="max-h-12 mx-auto" style={{ opacity: watermarkOpacity }} /> : <div className="flex items-center justify-center gap-2 text-[#8A8880]"><Upload className="h-4 w-4" /><span className="text-sm">Upload image</span></div>}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ── Actions ────────────────────────────────────── */}
        {trackedLink && (
          <div className="p-4 mb-4 rounded-xl bg-[#FAF9F6] border border-[#D4A017] flex sm:flex-row flex-col gap-4 justify-between items-center animate-fade-in sm:items-center">
            <div className="w-full">
              <p className="text-xs font-semibold text-[#D4A017] uppercase tracking-wider mb-1">Tracked Link Generated</p>
              <div className="truncate w-full max-w-[200px] sm:max-w-none text-sm font-mono text-[#4A4A45]">{trackedLink}</div>
            </div>
            <Button size="sm" onClick={() => { navigator.clipboard.writeText(trackedLink); toast.success("Copied to clipboard"); }} className="bg-[#D4A017] hover:bg-[#B8860B] text-white w-full sm:w-auto flex-shrink-0">
              Copy Link
            </Button>
          </div>
        )}
        <div className="flex gap-4 pb-10">
          <Button variant="outline" size="lg" className="flex-1 h-12 text-sm font-medium border-[#E8E6E0] text-[#4A4A45] hover:text-[#1A1A18] hover:border-[#D5D3CC]" onClick={handlePreview} disabled={!canGenerate || isGeneratingPreview}>
            <Eye className="mr-2 h-4 w-4" /> {isGeneratingPreview ? "Loading..." : "Preview Document"}
          </Button>
          <Button size="lg" className={cn("flex-1 h-12 text-sm font-medium text-white shadow-sm", user ? "bg-[#D4A017] hover:bg-[#B8860B]" : "bg-[#1A1A18] hover:bg-[#333]")} onClick={handleSaveAndTrack} disabled={!canGenerate || isGeneratingPdf}>
            <Download className="mr-2 h-4 w-4" /> {isGeneratingPdf ? "Saving..." : user ? (editToken ? "Update & Track" : "Save & Track") : "Download PDF"}
          </Button>
        </div>
      </main>

      {/* ── Preview Dialog ───────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b flex-shrink-0">
            <DialogTitle className="flex items-center justify-between gap-4 pr-8">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-[#D4A017]" />
                <div>
                  <span className="text-lg" style={{ fontFamily: "var(--font-heading)" }}>Invoice Preview</span>
                  <p className="text-xs text-[#8A8880] mt-0.5">Review before downloading</p>
                </div>
              </div>
              <Button size="sm" onClick={handleSaveAndTrack} disabled={isGeneratingPdf} className={cn("text-white h-10 px-5", user ? "bg-[#D4A017] hover:bg-[#B8860B]" : "bg-[#1A1A18] hover:bg-[#333]")}>
                <Download className="mr-2 h-4 w-4" /> {isGeneratingPdf ? "Saving..." : user ? (editToken ? "Update & Track" : "Save & Track") : "Download PDF"}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-[#F5F3EE] min-h-0">
            <div className="p-6 md:p-10">
              {previewHtml ? (
                <div className="bg-white shadow-xl mx-auto rounded-lg invoice-preview-content ring-1 ring-black/5 overflow-hidden" style={{ maxWidth: "650px" }}>
                  <div className="p-6 md:p-8" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-48"><span className="text-[#8A8880] text-sm">Loading preview…</span></div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t py-8 text-center">
        <p className="text-xs text-[#8A8880]" style={{ fontFamily: "var(--font-heading)" }}>
          Invoq — The fastest invoice tool alive
        </p>
      </footer>
    </div>
  );
}
