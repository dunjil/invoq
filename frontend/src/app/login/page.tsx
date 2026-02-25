"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            router.push("/create");
        } catch (err: any) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <Card className="w-full max-w-sm animate-fade-in-scale">
                <CardHeader className="text-center pb-2 pt-8">
                    <Link href="/">
                        <h1 className="text-3xl font-light tracking-tight mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                            Inv<span className="text-[#D4A017] font-medium">oq</span>
                        </h1>
                    </Link>
                    <p className="text-sm text-[#4A4A45] mt-2">Sign in to your account</p>
                </CardHeader>
                <CardContent className="space-y-5 px-8 pb-8 pt-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#C0392B]/5 border border-[#C0392B]/15 text-sm text-[#C0392B]">
                                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8880]" />
                                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10 h-11" required autoFocus />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-[#4A4A45] uppercase tracking-wider font-medium">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8880]" />
                                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10 h-11" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8880] hover:text-[#4A4A45] transition-colors">
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full h-11 bg-[#D4A017] hover:bg-[#B8860B] text-white font-medium">
                            {loading ? "Signing in…" : "Sign In"}
                        </Button>
                    </form>
                    <div className="text-center space-y-3">
                        <p className="text-sm text-[#4A4A45]">
                            Don&apos;t have an account?{" "}
                            <Link href="/register" className="text-[#D4A017] hover:text-[#B8860B] font-medium">Create one</Link>
                        </p>
                        <Link href="/" className="block text-xs text-[#8A8880] hover:text-[#4A4A45]">← Back to home</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
