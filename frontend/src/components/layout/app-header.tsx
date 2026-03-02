"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft, History, Users, Settings, Shield, Plus, Home,
    ChevronDown, FileSignature, FileText, FileWarning, Building,
    Clock, Crown, Activity, LogOut, User as UserIcon
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
    backHref?: string;
    backLabel?: string;
    maxWidth?: string;
    showCreate?: boolean;
    children?: React.ReactNode;
}

export function AppHeader({
    backHref,
    backLabel = "Back",
    maxWidth = "max-w-3xl",
    showCreate = true,
    children
}: AppHeaderProps) {
    const { user, logout } = useAuth();

    return (
        <header className="border-b bg-white/60 backdrop-blur-sm sticky top-0 z-50">
            <div className="flex justify-between items-center h-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="flex items-center gap-10">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="relative h-7 w-28 transition-transform group-hover:scale-105">
                            <Image
                                src="/images/invoq-logo-transparent.png"
                                alt="INVOQ"
                                fill
                                className="object-contain object-left drop-shadow-sm"
                            />
                        </div>
                    </Link>

                    {user && (
                        <nav className="hidden lg:flex items-center gap-1 px-3 py-1 bg-[#F5F3EE] rounded-full">
                            <Link href="/dashboard" className="text-[10px] font-bold text-[#4A4A45] hover:text-[#1A1A18] uppercase tracking-widest px-3 py-1 rounded-full hover:bg-white transition-all">Dashboard</Link>
                            <Link href="/history" className="text-[10px] font-bold text-[#4A4A45] hover:text-[#1A1A18] uppercase tracking-widest px-3 py-1 rounded-full hover:bg-white transition-all border-l border-[#E8E6E0]">History</Link>
                            <Link href="/clients" className="text-[10px] font-bold text-[#4A4A45] hover:text-[#1A1A18] uppercase tracking-widest px-3 py-1 rounded-full hover:bg-white transition-all border-l border-[#E8E6E0]">Clients</Link>
                        </nav>
                    )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {user && showCreate && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" className="flex bg-[#1A1A18] hover:bg-[#333] text-white text-xs h-8">
                                    <Plus className="h-3.5 w-3.5 mr-1" /> <span className="hidden sm:inline">Create</span> <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                    <Link href="/create/quote" className="cursor-pointer flex items-center">
                                        <FileText className="h-4 w-4 mr-2 text-[#8A8880]" /> Quote
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/create/invoice" className="cursor-pointer flex items-center">
                                        <FileText className="h-4 w-4 mr-2 text-[#D4A017]" /> Invoice
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/create/contract" className="cursor-pointer flex items-center">
                                        <FileSignature className="h-4 w-4 mr-2 text-[#4A7C59]" /> Contract
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/create/nda" className="cursor-pointer flex items-center">
                                        <Shield className="h-4 w-4 mr-2 text-[#C0392B]" /> NDA
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/create/msa" className="cursor-pointer flex items-center">
                                        <Building className="h-4 w-4 mr-2 text-[#D4A017]" /> MSA
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-[#F5F3EE] my-1 mx-1" />
                                <DropdownMenuItem asChild>
                                    <Link href="/create/contract?type=document" className="cursor-pointer flex items-center">
                                        <FileText className="h-4 w-4 mr-2 text-[#8A8880]" /> Blank Document
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/create/contract?type=template" className="cursor-pointer flex items-center">
                                        <FileSignature className="h-4 w-4 mr-2 text-[#4A7C59]" /> Form Template
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {children}

                    {backHref && (
                        <Link href={backHref}>
                            <Button variant="outline" size="sm" className="text-xs h-8 text-[#4A4A45] border-[#E8E6E0]">
                                <ArrowLeft className="h-3 w-3 mr-1.5" /> {backLabel}
                            </Button>
                        </Link>
                    )}

                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F5F3EE] transition-colors text-sm text-[#4A4A45]">
                                    <div className="w-7 h-7 rounded-full bg-[#1A1A18] flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                        {(user.name || user.email)[0]?.toUpperCase()}
                                    </div>
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl border-[#E8E6E0]">
                                <div className="px-3 py-2 border-b border-[#F5F3EE] mb-1">
                                    <p className="text-xs font-bold text-[#1A1A18] truncate">{user.name || "Contractor"}</p>
                                    <p className="text-[10px] text-[#8A8880] truncate">{user.email}</p>
                                </div>
                                <DropdownMenuItem asChild>
                                    <Link href="/create?type=quote" className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4A4A45] cursor-pointer">
                                        <FileText className="h-4 w-4 text-[#8A8880]" /> Create Quote
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/create" className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4A4A45] cursor-pointer">
                                        <FileText className="h-4 w-4 text-[#8A8880]" /> Create Invoice
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/create/contract" className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4A4A45] cursor-pointer">
                                        <FileSignature className="h-4 w-4 text-[#8A8880]" /> Create Contract
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-[#F5F3EE] my-1.5 mx-1" />
                                <DropdownMenuItem asChild>
                                    <Link href="/create/contract?type=nda" className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4A4A45] cursor-pointer">
                                        <Shield className="h-4 w-4 text-[#8A8880]" /> Create NDA
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/create/contract?type=msa" className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4A4A45] cursor-pointer">
                                        <Building className="h-4 w-4 text-[#8A8880]" /> Create MSA
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-[#F5F3EE] my-1.5 mx-1" />
                                <DropdownMenuItem asChild>
                                    <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4A4A45] cursor-pointer">
                                        <Building className="h-4 w-4 text-[#8A8880]" /> Business Profile
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/history" className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4A4A45] cursor-pointer">
                                        <Clock className="h-4 w-4 text-[#8A8880]" /> History
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/tax" className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4A4A45] cursor-pointer">
                                        <Building className="h-4 w-4 text-[#8A8880]" /> Tax Ledger
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/pricing" className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4A4A45] cursor-pointer">
                                        <Crown className="h-4 w-4 text-[#D4A017]" /> {user.subscription_status === 'pro' ? 'Pro Plan' : 'Upgrade'}
                                    </Link>
                                </DropdownMenuItem>
                                {user.role === 'admin' && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4A4A45] cursor-pointer">
                                            <Activity className="h-4 w-4 text-[#8A8880]" /> Admin Dashboard
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-[#F5F3EE] my-1.5 mx-1" />
                                <DropdownMenuItem onClick={() => logout()} className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#C0392B] cursor-pointer hover:bg-red-50 focus:bg-red-50 focus:text-[#C0392B]">
                                    <LogOut className="h-4 w-4" /> Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        </header>
    );
}
