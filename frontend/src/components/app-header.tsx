"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History, Users, Settings, Shield, Plus, Home } from "lucide-react";

interface AppHeaderProps {
    backHref?: string;
    backLabel?: string;
    maxWidth?: string;
    children?: React.ReactNode;
}

export function AppHeader({ backHref = "/create", backLabel = "Back", maxWidth = "max-w-3xl", children }: AppHeaderProps) {
    const { user } = useAuth();
    return (
        <header className="border-b bg-white/60 backdrop-blur-sm sticky top-0 z-50">
            <div className={`${maxWidth} mx-auto px-5 py-4 flex items-center justify-between`}>
                <Link href="/" className="text-2xl font-light tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                    Inv<span className="text-[#D4A017] font-medium">oq</span>
                </Link>
                <div className="flex items-center gap-2 sm:gap-4">
                    {user && (
                        <div className="hidden md:flex items-center gap-1 mr-2 px-3 py-1 bg-[#F5F3EE] rounded-full">
                            <Link href="/history" className="text-[10px] font-bold text-[#8A8880] hover:text-[#1A1A18] uppercase tracking-widest px-2">History</Link>
                            <Link href="/clients" className="text-[10px] font-bold text-[#8A8880] hover:text-[#1A1A18] uppercase tracking-widest px-2 border-l border-[#E8E6E0]">Clients</Link>
                            {user?.role === "admin" && (
                                <Link href="/admin" className="text-[10px] font-bold text-[#D4A017] hover:text-[#B8860B] uppercase tracking-widest px-2 border-l border-[#E8E6E0]">Admin</Link>
                            )}
                        </div>
                    )}
                    {children}
                    <Link href={backHref}>
                        <Button variant="outline" size="sm" className="text-xs h-8 text-[#4A4A45] border-[#E8E6E0]">
                            <ArrowLeft className="h-3 w-3 mr-1.5" /> {backLabel}
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}
