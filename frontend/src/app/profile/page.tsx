"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { SignaturePad } from "@/components/signature-pad";
import { Star, Building, ChevronDown, Settings2, PenTool, ImageIcon, Droplets, Type, Upload, X, Save, Plus, Trash2, Check } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Profile {
    id: string;
    label: string;
    is_default: boolean;
    name: string;
    address: string | null;
    email: string | null;
    phone: string | null;
    logo_url: string | null;
    signature_data: string | null;
    primary_color: string;
    default_currency: string;
    default_currency_symbol: string;
    default_notes: string | null;
    watermark_enabled: boolean;
    watermark_type: string;
    watermark_text: string;
    watermark_image: string | null;
    watermark_color: string;
    watermark_opacity: number;
    watermark_rotation: number;
    watermark_font_size: number;
}

const watermarkPresets = ["CONFIDENTIAL", "DRAFT", "PAID", "COPY", "SAMPLE", "VOID"];

export default function ProfilePage() {
    const { user, token, loading: authLoading } = useAuth();
    const router = useRouter();

    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Form state
    const [label, setLabel] = useState("Default");
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [color, setColor] = useState("#D4A017");
    const [currency, setCurrency] = useState("USD");
    const [currencySymbol, setCurrencySymbol] = useState("$");
    const [notes, setNotes] = useState("");
    const [logo, setLogo] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [isDefault, setIsDefault] = useState(false);

    // Watermark
    const [wmEnabled, setWmEnabled] = useState(false);
    const [wmType, setWmType] = useState<"text" | "image">("text");
    const [wmText, setWmText] = useState("CONFIDENTIAL");
    const [wmImage, setWmImage] = useState<string | null>(null);
    const [wmColor, setWmColor] = useState("#4A4A45");
    const [wmOpacity, setWmOpacity] = useState(0.15);
    const [wmRotation, setWmRotation] = useState(-45);
    const [wmFontSize, setWmFontSize] = useState(60);

    // Refs
    const logoInputRef = useRef<HTMLInputElement>(null);
    const wmUploadRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // ── Load profiles ─────────────────────────────────────────
    const loadProfiles = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/profiles`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data: Profile[] = await res.json();
                setProfiles(data);
                // Select default or first
                if (!activeId || !data.find((p) => p.id === activeId)) {
                    const def = data.find((p) => p.is_default) || data[0];
                    if (def) selectProfile(def);
                }
            }
        } catch { }
    }, [token]);

    useEffect(() => {
        if (authLoading) return;
        if (!user || !token) { router.push("/login"); return; }
        loadProfiles();
    }, [user, token, authLoading, router, loadProfiles]);

    // ── Select profile → fill form ────────────────────────────
    const selectProfile = (p: Profile) => {
        setActiveId(p.id);
        setLabel(p.label || "Default");
        setName(p.name || "");
        setAddress(p.address || "");
        setEmail(p.email || "");
        setPhone(p.phone || "");
        setColor(p.primary_color || "#D4A017");
        setCurrency(p.default_currency || "USD");
        setCurrencySymbol(p.default_currency_symbol || "$");
        setNotes(p.default_notes || "");
        setLogo(p.logo_url || null);
        setSignature(p.signature_data || null);
        setIsDefault(p.is_default);
        setWmEnabled(p.watermark_enabled);
        setWmType((p.watermark_type as "text" | "image") || "text");
        setWmText(p.watermark_text || "CONFIDENTIAL");
        setWmImage(p.watermark_image || null);
        setWmColor(p.watermark_color || "#4A4A45");
        setWmOpacity(p.watermark_opacity ?? 0.15);
        setWmRotation(p.watermark_rotation ?? -45);
        setWmFontSize(p.watermark_font_size ?? 60);
        setShowSignaturePad(false);
    };

    // ── New profile ───────────────────────────────────────────
    const startNewProfile = () => {
        setActiveId(null);
        setLabel("New Profile");
        setName(""); setAddress(""); setEmail(""); setPhone("");
        setColor("#D4A017"); setCurrency("USD"); setCurrencySymbol("$");
        setNotes(""); setLogo(null); setSignature(null); setIsDefault(false);
        setWmEnabled(false); setWmType("text"); setWmText("CONFIDENTIAL");
        setWmImage(null); setWmColor("#4A4A45"); setWmOpacity(0.15);
        setWmRotation(-45); setWmFontSize(60);
        setShowSignaturePad(false);
    };

    // ── Save ──────────────────────────────────────────────────
    const handleSave = async () => {
        if (!name.trim()) { toast.error("Business name is required"); return; }
        setSaving(true);
        try {
            const body = {
                id: activeId || undefined,
                label, name, address, email, phone,
                logo_url: logo, signature_data: signature,
                primary_color: color,
                default_currency: currency, default_currency_symbol: currencySymbol,
                default_notes: notes, is_default: isDefault,
                watermark_enabled: wmEnabled, watermark_type: wmType,
                watermark_text: wmText, watermark_image: wmImage,
                watermark_color: wmColor, watermark_opacity: wmOpacity,
                watermark_rotation: wmRotation, watermark_font_size: wmFontSize,
            };
            const method = activeId ? "PUT" : "POST";
            const url = activeId ? `${API_URL}/api/profile/${activeId}` : `${API_URL}/api/profile`;
            const res = await fetch(url, {
                method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                const saved: Profile = await res.json();
                toast.success(activeId ? "Profile updated" : "Profile created");
                setActiveId(saved.id);
                await loadProfiles();
            } else {
                const err = await res.json().catch(() => null);
                toast.error(err?.detail || "Save failed");
            }
        } catch { toast.error("Network error"); }
        finally { setSaving(false); }
    };

    // ── Delete ────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!activeId) return;
        if (!confirm("Delete this profile?")) return;
        setDeleting(true);
        try {
            const res = await fetch(`${API_URL}/api/profile/${activeId}`, {
                method: "DELETE", headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                toast.success("Profile deleted");
                setActiveId(null);
                await loadProfiles();
            } else {
                const err = await res.json().catch(() => null);
                toast.error(err?.detail || "Cannot delete");
            }
        } catch { toast.error("Network error"); }
        finally { setDeleting(false); }
    };

    // ── Set Default ───────────────────────────────────────────
    const handleSetDefault = async () => {
        if (!activeId) return;
        try {
            const res = await fetch(`${API_URL}/api/profile/${activeId}/default`, {
                method: "POST", headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) { toast.success("Set as default"); await loadProfiles(); }
        } catch { }
    };

    // ── Logo ──────────────────────────────────────────────────
    const processLogoFile = useCallback((file: File) => {
        if (!file.type.startsWith("image/")) { toast.error("Upload an image"); return; }
        if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
        const reader = new FileReader();
        reader.onload = () => setLogo(reader.result as string);
        reader.readAsDataURL(file);
    }, []);

    const handleWmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f || !f.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => setWmImage(reader.result as string);
        reader.readAsDataURL(f);
        e.target.value = "";
    };

    if (authLoading) return null;

    return (
        <div className="min-h-screen flex flex-col">
            <AppHeader />

            <main className="max-w-3xl mx-auto px-5 py-8 space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-normal" style={{ fontFamily: "var(--font-heading)" }}>Business Profiles</h1>
                    <p className="text-sm text-[#4A4A45] mt-1">Manage your business identities. The default profile auto-fills when you create invoices.</p>
                </div>

                {/* ── Profile Switcher ──────────────────────────────── */}
                <div className="flex flex-wrap gap-2">
                    {profiles.map((p) => (
                        <button key={p.id} onClick={() => selectProfile(p)}
                            className={cn("px-4 py-2 rounded-lg text-sm border transition-all flex items-center gap-2",
                                activeId === p.id
                                    ? "bg-[#1A1A18] text-white border-[#1A1A18]"
                                    : "border-[#E8E6E0] text-[#4A4A45] hover:border-[#D4A017]"
                            )}>
                            {p.is_default && <Star className="h-3 w-3 fill-current" />}
                            {p.label || p.name}
                        </button>
                    ))}
                    <button onClick={startNewProfile}
                        className="px-4 py-2 rounded-lg text-sm border border-dashed border-[#E8E6E0] text-[#8A8880] hover:border-[#D4A017] hover:text-[#D4A017] transition-colors flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> New
                    </button>
                </div>

                {/* ── Profile Form ─────────────────────────────────── */}
                <Card>
                    <CardContent className="p-6 space-y-5">
                        {/* Label + Default */}
                        <div className="flex items-end gap-4">
                            <div className="flex-1 space-y-1.5">
                                <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Profile Label</Label>
                                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Freelance, Agency" className="h-10" />
                            </div>
                            {activeId && !isDefault && (
                                <Button variant="outline" size="sm" onClick={handleSetDefault} className="h-10 text-xs text-[#D4A017] border-[#D4A017]/30 hover:bg-[#D4A017]/5">
                                    <Star className="h-3.5 w-3.5 mr-1" /> Set Default
                                </Button>
                            )}
                            {isDefault && <span className="text-xs text-[#4A7C59] font-medium flex items-center gap-1 h-10 px-3"><Check className="h-3.5 w-3.5" />Default</span>}
                        </div>

                        {/* Business Name */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Business Name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" className="h-11" />
                        </div>

                        {/* Address */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Address</Label>
                            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, Country" className="resize-none" rows={2} />
                        </div>

                        {/* Email + Phone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Email</Label>
                                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="billing@acme.com" className="h-10" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Phone</Label>
                                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" className="h-10" />
                            </div>
                        </div>

                        {/* Currency + Color */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Default Currency</Label>
                                <div className="flex gap-2">
                                    <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={5} className="h-10 w-20 font-mono" />
                                    <Input value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} maxLength={5} className="h-10 flex-1 font-mono" placeholder="$" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Accent Color</Label>
                                <div className="flex items-center gap-3">
                                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded-lg border cursor-pointer" />
                                    <span className="text-xs text-[#8A8880] font-mono">{color}</span>
                                </div>
                            </div>
                        </div>

                        {/* Default Notes */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Default Notes</Label>
                            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, bank details…" className="resize-none" rows={2} />
                        </div>

                        {/* ── Logo ────────────────────────────────────── */}
                        <div className="space-y-2 pt-2 border-t">
                            <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Logo</Label>
                            <input ref={logoInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) processLogoFile(f); }} className="hidden" />
                            {logo ? (
                                <div className="relative inline-block">
                                    <img src={logo} alt="Logo" className="max-h-16 max-w-[150px] object-contain rounded border" />
                                    <button onClick={() => { setLogo(null); if (logoInputRef.current) logoInputRef.current.value = ""; }}
                                        className="absolute -top-2 -right-2 p-1 bg-[#C0392B] text-white rounded-full shadow"><X className="h-3 w-3" /></button>
                                </div>
                            ) : (
                                <div onClick={() => logoInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processLogoFile(f); }}
                                    className={cn("flex items-center justify-center gap-2 py-5 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                                        isDragging ? "border-[#D4A017] bg-[rgba(212,160,23,0.04)]" : "border-[#E8E6E0] hover:border-[#D4A017]")}>
                                    <Upload className="h-4 w-4 text-[#8A8880]" /><span className="text-sm text-[#8A8880]">Upload logo (max 2MB)</span>
                                </div>
                            )}
                        </div>

                        {/* ── Signature ───────────────────────────────── */}
                        <div className="space-y-2 pt-2 border-t">
                            <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium flex items-center gap-1.5"><PenTool className="h-3.5 w-3.5" /> Default Signature</Label>
                            {signature && !showSignaturePad ? (
                                <div className="relative inline-block">
                                    <img src={signature} alt="Signature" className="max-h-16 border rounded p-2 bg-white" />
                                    <div className="flex gap-2 mt-2">
                                        <Button variant="outline" size="sm" onClick={() => setShowSignaturePad(true)} className="text-xs h-7">Redraw</Button>
                                        <Button variant="ghost" size="sm" onClick={() => setSignature(null)} className="text-xs h-7 text-[#C0392B]">Remove</Button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {showSignaturePad || !signature ? (
                                        <div className="max-w-[320px]">
                                            <SignaturePad onSignatureChange={(sig) => { setSignature(sig); if (sig) setShowSignaturePad(false); }} initialSignature={signature} width={320} height={120} className="w-full" />
                                        </div>
                                    ) : (
                                        <Button variant="outline" size="sm" onClick={() => setShowSignaturePad(true)} className="text-xs h-8 text-[#4A4A45]">
                                            <PenTool className="h-3 w-3 mr-1.5" /> Draw signature
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Watermark ───────────────────────────────── */}
                        <div className="space-y-3 pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5" /> Default Watermark</Label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={wmEnabled} onChange={(e) => setWmEnabled(e.target.checked)} className="rounded h-3.5 w-3.5 accent-[#D4A017]" />
                                    <span className="text-xs text-[#4A4A45]">Enable</span>
                                </label>
                            </div>
                            {wmEnabled && (
                                <div className="space-y-3 pl-1">
                                    <div className="flex gap-2">
                                        <Button variant={wmType === "text" ? "default" : "outline"} size="sm" onClick={() => setWmType("text")}
                                            className={cn("flex-1 h-9", wmType === "text" && "bg-[#1A1A18] text-white")}><Type className="h-3.5 w-3.5 mr-1" /> Text</Button>
                                        <Button variant={wmType === "image" ? "default" : "outline"} size="sm" onClick={() => setWmType("image")}
                                            className={cn("flex-1 h-9", wmType === "image" && "bg-[#1A1A18] text-white")}><ImageIcon className="h-3.5 w-3.5 mr-1" /> Image</Button>
                                    </div>
                                    {wmType === "text" ? (
                                        <>
                                            <div className="flex flex-wrap gap-1.5">
                                                {watermarkPresets.map((p) => (
                                                    <button key={p} onClick={() => setWmText(p)}
                                                        className={cn("px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors",
                                                            wmText === p ? "bg-[#1A1A18] text-white border-[#1A1A18]" : "border-[#E8E6E0] text-[#4A4A45] hover:border-[#D4A017]")}>{p}</button>
                                                ))}
                                            </div>
                                            <Input value={wmText} onChange={(e) => setWmText(e.target.value)} className="h-9 text-sm" />
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between"><Label className="text-[10px] text-[#8A8880] uppercase">Opacity</Label><span className="text-[10px] text-[#8A8880] font-mono">{Math.round(wmOpacity * 100)}%</span></div>
                                                    <Slider value={[wmOpacity]} onValueChange={([v]) => setWmOpacity(v)} min={0.05} max={0.5} step={0.05} />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between"><Label className="text-[10px] text-[#8A8880] uppercase">Angle</Label><span className="text-[10px] text-[#8A8880] font-mono">{wmRotation}°</span></div>
                                                    <Slider value={[wmRotation]} onValueChange={([v]) => setWmRotation(v)} min={-90} max={90} step={15} />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <input ref={wmUploadRef} type="file" accept="image/*" onChange={handleWmUpload} className="hidden" />
                                            <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-[#D4A017] transition-colors" onClick={() => wmUploadRef.current?.click()}>
                                                {wmImage
                                                    ? <img src={wmImage} alt="Watermark" className="max-h-12 mx-auto" style={{ opacity: wmOpacity }} />
                                                    : <div className="flex items-center justify-center gap-2 text-[#8A8880]"><Upload className="h-4 w-4" /><span className="text-sm">Upload image</span></div>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Actions ─────────────────────────────────── */}
                        <div className="flex gap-3 pt-2 border-t">
                            <Button onClick={handleSave} disabled={saving || !name}
                                className="flex-1 h-11 bg-[#D4A017] hover:bg-[#B8860B] text-white font-medium">
                                <Save className="h-4 w-4 mr-2" /> {saving ? "Saving…" : activeId ? "Update Profile" : "Create Profile"}
                            </Button>
                            {activeId && profiles.length > 1 && (
                                <Button variant="outline" onClick={handleDelete} disabled={deleting}
                                    className="h-11 px-4 text-[#C0392B] border-[#C0392B]/20 hover:bg-[#C0392B]/5">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>
            <AppFooter maxWidth="max-w-3xl" />
        </div>
    );
}
