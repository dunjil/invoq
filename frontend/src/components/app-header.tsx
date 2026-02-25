"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface AppHeaderProps {
    backHref?: string;
    backLabel?: string;
    maxWidth?: string;
    children?: React.ReactNode;
}

export function AppHeader({ backHref = "/create", backLabel = "Back", maxWidth = "max-w-3xl", children }: AppHeaderProps) {
    return (
        <header className="border-b bg-white/60 backdrop-blur-sm sticky top-0 z-50">
            <div className={`${maxWidth} mx-auto px-5 py-4 flex items-center justify-between`}>
                <Link href="/" className="text-2xl font-light tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                    Inv<span className="text-[#D4A017] font-medium">oq</span>
                </Link>
                <div className="flex items-center gap-3">
                    {children}
                    <Link href={backHref}>
                        <Button variant="outline" size="sm" className="text-sm text-[#4A4A45]">
                            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> {backLabel}
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}
