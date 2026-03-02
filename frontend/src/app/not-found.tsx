import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, FileX2 } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center px-5" style={{ background: "#FAF9F6" }}>
            <div className="text-center max-w-md animate-fade-in">
                {/* Big 404 */}
                <h1 className="text-[120px] sm:text-[160px] font-light leading-none tracking-tighter" style={{ fontFamily: "var(--font-heading)", color: "#E8E6E0" }}>
                    4<span className="text-[#D4A017]">0</span>4
                </h1>

                {/* Message */}
                <h2 className="text-xl sm:text-2xl font-normal mt-2" style={{ fontFamily: "var(--font-heading)", color: "#1A1A18" }}>
                    This invoice doesn&apos;t exist
                </h2>
                <p className="text-sm text-[#4A4A45] mt-3 leading-relaxed">
                    The page you&apos;re looking for may have been moved, deleted, or perhaps never existed in the first place.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                    <Link href="/"
                        className="px-6 py-2.5 rounded-lg bg-[#D4A017] hover:bg-[#B8860B] text-white text-sm font-medium transition-colors">
                        Back to Home
                    </Link>
                    <Link href="/create"
                        className="px-6 py-2.5 rounded-lg border text-sm font-medium text-[#4A4A45] hover:border-[#D4A017] hover:text-[#D4A017] transition-colors">
                        Create an Invoice
                    </Link>
                </div>

                {/* Logo */}
                <div className="mt-16">
                    <Link href="/">
                        <div className="relative h-7 w-28 mx-auto hover:opacity-80 transition-opacity">
                            <Image
                                src="/images/invoq-logo-transparent.png"
                                alt="INVOQ"
                                fill
                                className="object-contain"
                            />
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
