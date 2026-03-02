"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Shield, Mail, Lock, User, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

interface RegistrationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    claimToken: string;
    onSuccess: () => void;
    title?: string;
    description?: string;
}

export function RegistrationModal({
    open,
    onOpenChange,
    claimToken,
    onSuccess,
    title = "Review & Sign Securely",
    description = "Create a free Invoq account in under 60 seconds to access this document and join the professional relationship."
}: RegistrationModalProps) {
    const { register } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) {
            toast.error("Please fill in all fields.");
            return;
        }

        setLoading(true);
        try {
            await register(email, password, name, claimToken);
            toast.success("Account created! Relationship claimed.");
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message || "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white border-[#E8E6E0] p-0 overflow-hidden">
                <DialogHeader className="p-8 bg-[#FAF9F6] border-b border-[#E8E6E0] text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-[#D4A017]/10 rounded-full">
                            <Shield className="h-8 w-8 text-[#D4A017]" />
                        </div>
                    </div>
                    <DialogTitle className="text-2xl font-serif text-[#1A1A18] tracking-tight">{title}</DialogTitle>
                    <DialogDescription className="text-[#8A8880] mt-2 text-sm leading-relaxed">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleRegister} className="p-8 space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="reg-name" className="text-[10px] font-bold uppercase tracking-widest text-[#8A8880]">Full Name</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-[#D5D3CC]" />
                            <Input
                                id="reg-name"
                                placeholder="Jane Doe"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="pl-10 h-11 border-[#E8E6E0] focus:ring-[#D4A017]/20 focus:border-[#D4A017]"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reg-email" className="text-[10px] font-bold uppercase tracking-widest text-[#8A8880]">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#D5D3CC]" />
                            <Input
                                id="reg-email"
                                type="email"
                                placeholder="jane@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="pl-10 h-11 border-[#E8E6E0] focus:ring-[#D4A017]/20 focus:border-[#D4A017]"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reg-password" className="text-[10px] font-bold uppercase tracking-widest text-[#8A8880]">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#D5D3CC]" />
                            <Input
                                id="reg-password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="pl-10 h-11 border-[#E8E6E0] focus:ring-[#D4A017]/20 focus:border-[#D4A017]"
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-[#D4A017] hover:bg-[#B8860B] text-white font-medium shadow-lg shadow-[#D4A017]/20 transition-all active:scale-[0.98]"
                    >
                        {loading ? "Creating Account..." : "Create Free Account & View"}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-[#8A8880] uppercase tracking-widest">
                        <CheckCircle2 className="h-3 w-3 text-[#4A7C59]" />
                        Verified Professional Network
                    </div>
                </form>

                <div className="px-8 pb-8 text-center border-t border-[#E8E6E0] pt-6 bg-[#FAF9F6]/50">
                    <p className="text-[10px] text-[#A09E96] leading-normal">
                        By continuing, you establish a professional relationship with the document issuer via Invoq.
                        Your data is protected and only shared with explicitly authorized parties.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
